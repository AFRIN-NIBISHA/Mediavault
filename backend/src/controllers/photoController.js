import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from '../database/db.js';
import { processImage, getImageMetadata } from '../services/imageService.js';
import { calculateSha256, calculatePerceptualHash } from '../services/hashService.js';
import { recalculateUserStorage, logActivity, saveFileVersion } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

export async function getPhotos(req, res) {
  try {
    const userId = req.user.id;
    const { albumId, sortBy = 'created_at', order = 'desc', search } = req.query;

    let conditions = ["f.user_id = $1", "f.file_category = 'photos'", "f.is_trashed = false"];
    let params = [userId];
    let pIdx = 2;

    let joinAlbum = '';
    if (albumId && albumId !== 'all') {
      joinAlbum = 'JOIN album_files af ON af.file_id = f.id AND af.album_id = $' + pIdx;
      params.push(parseInt(albumId, 10));
      pIdx++;
    }

    if (search) {
      conditions.push(`f.original_name ILIKE $${pIdx}`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const sortCol = sortBy === 'size' ? 'f.file_size' : sortBy === 'name' ? 'f.original_name' : 'f.created_at';
    const sortDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const q = `
      SELECT f.id, f.original_name, f.filename, f.file_size, f.mime_type, f.extension, f.is_favorite, f.current_version,
             f.created_at, f.updated_at,
             m.width, m.height, m.format, m.exif_data
      FROM files f
      ${joinAlbum}
      LEFT JOIN file_metadata m ON m.file_id = f.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const result = await query(q, params);
    return res.json({ success: true, photos: result.rows });
  } catch (err) {
    console.error('getPhotos error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve photos.' });
  }
}

export async function processPhoto(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const {
      operations = {},
      saveAsNew = true,
      newTitle
    } = req.body;

    const fileRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Photo file not found.' });
    }

    const originalFile = fileRes.rows[0];
    if (!fs.existsSync(originalFile.file_path)) {
      return res.status(404).json({ success: false, message: 'Source image missing on disk.' });
    }

    const targetExt = (operations.format || originalFile.extension || 'jpeg').toLowerCase();
    const outputFilename = `edited_${Date.now()}_${Math.round(Math.random() * 1e4)}.${targetExt}`;
    const outputPath = path.join(uploadDir, outputFilename);

    // Run Sharp image processing pipeline
    const processResult = await processImage(originalFile.file_path, outputPath, operations);

    // Calculate new hashes
    const sha256 = await calculateSha256(outputPath);
    const pHash = await calculatePerceptualHash(outputPath);

    let savedFileRecord;

    if (saveAsNew) {
      const displayTitle = newTitle || `Edited_${originalFile.original_name}`;
      const insRes = await query(
        `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'photos', $8, $9, $10) RETURNING *`,
        [req.user.id, originalFile.folder_id, outputFilename, displayTitle, outputPath, processResult.fileSize, `image/${targetExt}`, targetExt, sha256, pHash]
      );
      savedFileRecord = insRes.rows[0];

      await query(
        `INSERT INTO file_metadata (file_id, width, height, format)
         VALUES ($1, $2, $3, $4)`,
        [savedFileRecord.id, processResult.width, processResult.height, targetExt]
      );

      await query(
        `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
         VALUES ($1, 1, $2, $3, 'Created from image edit', $4)`,
        [savedFileRecord.id, outputPath, processResult.fileSize, req.user.id]
      );

      await logActivity(req.user.id, 'edit', 'photo', savedFileRecord.id, {
        operations: Object.keys(operations),
        createdNewFile: true
      });
    } else {
      // Save as new version of existing file
      const newVersion = await saveFileVersion(
        fileId,
        outputPath,
        processResult.fileSize,
        `Image transformations: ${Object.keys(operations).join(', ')}`,
        req.user.id
      );

      await query(
        `UPDATE file_metadata SET width = $1, height = $2, format = $3 WHERE file_id = $4`,
        [processResult.width, processResult.height, targetExt, fileId]
      );

      await query(
        `UPDATE files SET file_hash = $1, perceptual_hash = $2, mime_type = $3, extension = $4 WHERE id = $5`,
        [sha256, pHash, `image/${targetExt}`, targetExt, fileId]
      );

      const updated = await query('SELECT * FROM files WHERE id = $1', [fileId]);
      savedFileRecord = updated.rows[0];

      await logActivity(req.user.id, 'edit', 'photo', fileId, {
        operations: Object.keys(operations),
        version: newVersion
      });
    }

    await recalculateUserStorage(req.user.id);

    return res.json({
      success: true,
      message: 'Image processed successfully.',
      file: savedFileRecord,
      metadata: processResult
    });
  } catch (err) {
    console.error('processPhoto error:', err);
    return res.status(500).json({ success: false, message: `Image processing failed: ${err.message}` });
  }
}

export async function getAlbums(req, res) {
  try {
    const albumsRes = await query(
      `SELECT a.*,
              COUNT(af.file_id) as photo_count,
              cov.filename as cover_filename
       FROM albums a
       LEFT JOIN album_files af ON af.album_id = a.id
       LEFT JOIN files cov ON cov.id = a.cover_file_id
       WHERE a.user_id = $1
       GROUP BY a.id, cov.filename
       ORDER BY a.name ASC`,
      [req.user.id]
    );

    return res.json({ success: true, albums: albumsRes.rows });
  } catch (err) {
    console.error('getAlbums error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve albums.' });
  }
}

export async function createAlbum(req, res) {
  try {
    const { name, description = '', coverFileId = null } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Album name is required.' });
    }

    const ins = await query(
      `INSERT INTO albums (user_id, name, description, cover_file_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name.trim(), description, coverFileId ? parseInt(coverFileId, 10) : null]
    );

    await logActivity(req.user.id, 'upload', 'album', ins.rows[0].id, { name: name.trim() });

    return res.status(201).json({ success: true, album: ins.rows[0] });
  } catch (err) {
    console.error('createAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create album.' });
  }
}

export async function addPhotosToAlbum(req, res) {
  try {
    const albumId = parseInt(req.params.id, 10);
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    for (const fid of fileIds) {
      await query(
        `INSERT INTO album_files (album_id, file_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [albumId, parseInt(fid, 10)]
      );
    }

    // Set first photo as cover if not set
    const aRes = await query('SELECT cover_file_id FROM albums WHERE id = $1', [albumId]);
    if (!aRes.rows[0]?.cover_file_id) {
      await query('UPDATE albums SET cover_file_id = $1 WHERE id = $2', [parseInt(fileIds[0], 10), albumId]);
    }

    return res.json({ success: true, message: `Added ${fileIds.length} photo(s) to album.` });
  } catch (err) {
    console.error('addPhotosToAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add photos to album.' });
  }
}

export async function removePhotoFromAlbum(req, res) {
  try {
    const albumId = parseInt(req.params.id, 10);
    const fileId = parseInt(req.params.fileId, 10);

    await query('DELETE FROM album_files WHERE album_id = $1 AND file_id = $2', [albumId, fileId]);
    return res.json({ success: true, message: 'Photo removed from album.' });
  } catch (err) {
    console.error('removePhotoFromAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove photo from album.' });
  }
}

export async function deleteAlbum(req, res) {
  try {
    const albumId = parseInt(req.params.id, 10);
    await query('DELETE FROM albums WHERE id = $1 AND user_id = $2', [albumId, req.user.id]);
    return res.json({ success: true, message: 'Album deleted successfully.' });
  } catch (err) {
    console.error('deleteAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete album.' });
  }
}

