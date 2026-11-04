import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/db.js';
import { getFileCategory } from '../utils/constants.js';
import { calculateSha256, calculatePerceptualHash } from '../services/hashService.js';
import { getImageMetadata } from '../services/imageService.js';
import { getPdfInfo } from '../services/pdfService.js';
import { recalculateUserStorage, logActivity, removeFileFromDisk } from '../services/storageService.js';
import { createZipArchive } from '../services/zipService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

export async function uploadFiles(req, res) {
  try {
    const userId = req.user.id;
    const folderId = req.body.folderId ? parseInt(req.body.folderId, 10) : null;
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const savedFiles = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const category = getFileCategory(file.mimetype, ext);
      const filePath = file.path;
      const fileSize = file.size;

      // Calculate SHA256
      const sha256 = await calculateSha256(filePath);

      // Perceptual hash for images
      let pHash = null;
      if (category === 'photos') {
        pHash = await calculatePerceptualHash(filePath);
      }

      // Insert file record
      const fileRes = await query(
        `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [userId, folderId, file.filename, file.originalname, filePath, fileSize, file.mimetype, category, ext, sha256, pHash]
      );
      const insertedFile = fileRes.rows[0];

      // Extract and save metadata
      let meta = { width: null, height: null, format: null, exif: {}, pageCount: null };
      if (category === 'photos') {
        const imgMeta = await getImageMetadata(filePath);
        meta.width = imgMeta.width;
        meta.height = imgMeta.height;
        meta.format = imgMeta.format;
        meta.exif = imgMeta.exif;
      } else if (category === 'pdfs') {
        const pdfMeta = await getPdfInfo(filePath);
        meta.pageCount = pdfMeta.pageCount;
      }

      await query(
        `INSERT INTO file_metadata (file_id, width, height, format, exif_data, page_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [insertedFile.id, meta.width, meta.height, meta.format, JSON.stringify(meta.exif), meta.pageCount]
      );

      // Initial version record
      await query(
        `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
         VALUES ($1, 1, $2, $3, 'Initial upload', $4)`,
        [insertedFile.id, filePath, fileSize, userId]
      );

      // Log activity
      await logActivity(userId, 'upload', 'file', insertedFile.id, {
        filename: insertedFile.original_name,
        size: fileSize,
        category
      });

      savedFiles.push({
        ...insertedFile,
        metadata: meta
      });
    }

    // Recalculate user storage
    await recalculateUserStorage(userId);

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${savedFiles.length} file(s).`,
      file: savedFiles[0] || null,
      files: savedFiles
    });
  } catch (err) {
    console.error('uploadFiles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload files.' });
  }
}

export async function getFiles(req, res) {
  try {
    const userId = req.user.id;
    const {
      folderId,
      category,
      favorite,
      search,
      extension,
      sortBy = 'created_at',
      order = 'desc',
      limit = 100,
      offset = 0
    } = req.query;

    let conditions = ['f.user_id = $1', 'f.is_trashed = false'];
    let params = [userId];
    let paramIndex = 2;

    if (folderId !== undefined && folderId !== 'all') {
      if (folderId === 'root' || folderId === 'null' || folderId === '') {
        conditions.push('f.folder_id IS NULL');
      } else {
        conditions.push(`f.folder_id = $${paramIndex}`);
        params.push(parseInt(folderId, 10));
        paramIndex++;
      }
    }

    if (category && category !== 'all') {
      conditions.push(`f.file_category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (favorite === 'true') {
      conditions.push('f.is_favorite = true');
    }

    if (extension) {
      conditions.push(`LOWER(f.extension) = LOWER($${paramIndex})`);
      params.push(extension.replace('.', ''));
      paramIndex++;
    }

    if (search) {
      conditions.push(`(f.original_name ILIKE $${paramIndex} OR f.extension ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const allowedSortFields = {
      name: 'f.original_name',
      size: 'f.file_size',
      created_at: 'f.created_at',
      updated_at: 'f.updated_at',
      type: 'f.file_category'
    };
    const sortCol = allowedSortFields[sortBy] || 'f.created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const countRes = await query(`SELECT COUNT(*) FROM files f WHERE ${whereClause}`, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const queryStr = `
      SELECT f.id, f.user_id, f.folder_id, f.filename, f.original_name, f.file_size,
             f.mime_type, f.file_category, f.extension, f.is_favorite, f.current_version,
             f.created_at, f.updated_at,
             m.width, m.height, m.page_count, m.format,
             fd.name as folder_name, fd.color as folder_color
      FROM files f
      LEFT JOIN file_metadata m ON m.file_id = f.id
      LEFT JOIN folders fd ON fd.id = f.folder_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(queryStr, params);

    return res.json({
      success: true,
      files: result.rows,
      totalCount,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    console.error('getFiles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve files.' });
  }
}

export async function getFileById(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const fileRes = await query(
      `SELECT f.*, m.width, m.height, m.page_count, m.format, m.exif_data,
              fd.name as folder_name
       FROM files f
       LEFT JOIN file_metadata m ON m.file_id = f.id
       LEFT JOIN folders fd ON fd.id = f.folder_id
       WHERE f.id = $1 AND f.user_id = $2`,
      [fileId, req.user.id]
    );

    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const versionsRes = await query(
      `SELECT id, version_number, file_size, change_summary, created_at
       FROM file_versions
       WHERE file_id = $1
       ORDER BY version_number DESC`,
      [fileId]
    );

    const file = fileRes.rows[0];
    return res.json({
      success: true,
      file: {
        ...file,
        versions: versionsRes.rows
      }
    });
  } catch (err) {
    console.error('getFileById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch file details.' });
  }
}

export async function downloadFile(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    if (isNaN(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    let fileRes;
    if (req.user && req.user.role === 'admin') {
      fileRes = await query(
        'SELECT id, filename, original_name, file_path, mime_type, file_size, user_id FROM files WHERE id = $1',
        [fileId]
      );
    } else if (req.user) {
      fileRes = await query(
        'SELECT id, filename, original_name, file_path, mime_type, file_size, user_id FROM files WHERE id = $1 AND (user_id = $2 OR is_trashed = false)',
        [fileId, req.user.id]
      );
    } else {
      fileRes = await query(
        'SELECT id, filename, original_name, file_path, mime_type, file_size, user_id FROM files WHERE id = $1 AND is_trashed = false',
        [fileId]
      );
    }

    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = fileRes.rows[0];
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on disk.' });
    }

    if (req.user) {
      await logActivity(req.user.id, 'download', 'file', file.id, { filename: file.original_name });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    const readStream = fs.createReadStream(file.file_path);
    readStream.pipe(res);
  } catch (err) {
    console.error('downloadFile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to download file.' });
  }
}

export async function previewFile(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    if (isNaN(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    let fileRes;
    if (req.user && req.user.role === 'admin') {
      fileRes = await query(
        'SELECT id, filename, original_name, file_path, mime_type, extension FROM files WHERE id = $1',
        [fileId]
      );
    } else if (req.user) {
      fileRes = await query(
        'SELECT id, filename, original_name, file_path, mime_type, extension FROM files WHERE id = $1 AND (user_id = $2 OR is_trashed = false)',
        [fileId, req.user.id]
      );
    } else {
      fileRes = await query(
        'SELECT id, filename, original_name, file_path, mime_type, extension FROM files WHERE id = $1 AND is_trashed = false',
        [fileId]
      );
    }

    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = fileRes.rows[0];
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on disk.' });
    }

    // If text preview requested
    if (req.query.content === 'true') {
      const textCategories = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'js', 'css', 'py', 'ts'];
      if (textCategories.includes(file.extension.toLowerCase())) {
        const textContent = fs.readFileSync(file.file_path, 'utf8');
        return res.json({ success: true, content: textContent });
      }
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
    fs.createReadStream(file.file_path).pipe(res);
  } catch (err) {
    console.error('previewFile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to preview file.' });
  }
}

export async function renameFile(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const { newName } = req.body;
    if (!newName || !newName.trim()) {
      return res.status(400).json({ success: false, message: 'New filename is required.' });
    }

    const cleanName = newName.trim();
    const ext = path.extname(cleanName).replace('.', '').toLowerCase();

    const updateRes = await query(
      `UPDATE files
       SET original_name = $1, extension = CASE WHEN $2 != '' THEN $2 ELSE extension END, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [cleanName, ext, fileId, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    await logActivity(req.user.id, 'rename', 'file', fileId, { newName: cleanName });

    return res.json({
      success: true,
      message: 'File renamed successfully.',
      file: updateRes.rows[0]
    });
  } catch (err) {
    console.error('renameFile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to rename file.' });
  }
}

export async function moveFiles(req, res) {
  try {
    const { fileIds, targetFolderId } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    const folderId = targetFolderId ? parseInt(targetFolderId, 10) : null;

    // Verify folder belongs to user if not null
    if (folderId !== null) {
      const fCheck = await query('SELECT id FROM folders WHERE id = $1 AND user_id = $2', [folderId, req.user.id]);
      if (fCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Target folder does not exist.' });
      }
    }

    for (const id of fileIds) {
      await query(
        `UPDATE files SET folder_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
        [folderId, parseInt(id, 10), req.user.id]
      );
      await logActivity(req.user.id, 'move', 'file', parseInt(id, 10), { targetFolderId: folderId });
    }

    return res.json({ success: true, message: `Moved ${fileIds.length} file(s) successfully.` });
  } catch (err) {
    console.error('moveFiles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to move files.' });
  }
}

export async function copyFiles(req, res) {
  try {
    const { fileIds, targetFolderId } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    const folderId = targetFolderId ? parseInt(targetFolderId, 10) : null;
    const copiedFiles = [];

    for (const id of fileIds) {
      const fRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [parseInt(id, 10), req.user.id]);
      if (fRes.rows.length > 0) {
        const file = fRes.rows[0];
        if (fs.existsSync(file.file_path)) {
          const newFilename = `${Date.now()}_copy_${file.filename}`;
          const newPath = path.join(uploadDir, newFilename);
          fs.copyFileSync(file.file_path, newPath);

          const copyName = `Copy of ${file.original_name}`;
          const newFileRes = await query(
            `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [req.user.id, folderId !== undefined ? folderId : file.folder_id, newFilename, copyName, newPath, file.file_size, file.mime_type, file.file_category, file.extension, file.file_hash, file.perceptual_hash]
          );

          await query(
            `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
             VALUES ($1, 1, $2, $3, 'File duplicate copy', $4)`,
            [newFileRes.rows[0].id, newPath, file.file_size, req.user.id]
          );

          await logActivity(req.user.id, 'copy', 'file', newFileRes.rows[0].id, { sourceFileId: file.id });
          copiedFiles.push(newFileRes.rows[0]);
        }
      }
    }

    await recalculateUserStorage(req.user.id);
    return res.status(201).json({ success: true, message: `Copied ${copiedFiles.length} file(s).`, files: copiedFiles });
  } catch (err) {
    console.error('copyFiles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to copy files.' });
  }
}

export async function deleteFiles(req, res) {
  try {
    const { fileIds, permanent = false } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    for (const id of fileIds) {
      const parsedId = parseInt(id, 10);
      if (permanent) {
        // Fetch paths of all versions to remove from disk
        const versions = await query('SELECT file_path FROM file_versions WHERE file_id = $1', [parsedId]);
        for (const v of versions.rows) {
          removeFileFromDisk(v.file_path);
        }
        const fileRes = await query('SELECT file_path FROM files WHERE id = $1 AND user_id = $2', [parsedId, req.user.id]);
        if (fileRes.rows.length > 0) {
          removeFileFromDisk(fileRes.rows[0].file_path);
        }

        await query('DELETE FROM files WHERE id = $1 AND user_id = $2', [parsedId, req.user.id]);
        await logActivity(req.user.id, 'delete_permanent', 'file', parsedId);
      } else {
        // Move to Recycle Bin (soft delete)
        const f = await query('SELECT folder_id FROM files WHERE id = $1 AND user_id = $2', [parsedId, req.user.id]);
        const origFolderId = f.rows[0]?.folder_id || null;

        await query(
          `UPDATE files SET is_trashed = true, trashed_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
          [parsedId, req.user.id]
        );

        await query(
          `INSERT INTO recycle_bin (user_id, file_id, original_folder_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (file_id) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
          [req.user.id, parsedId, origFolderId]
        );

        await logActivity(req.user.id, 'delete', 'file', parsedId, { movedToTrash: true });
      }
    }

    await recalculateUserStorage(req.user.id);
    return res.json({
      success: true,
      message: permanent
        ? `Permanently deleted ${fileIds.length} file(s).`
        : `Moved ${fileIds.length} file(s) to Recycle Bin.`
    });
  } catch (err) {
    console.error('deleteFiles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete files.' });
  }
}

export async function toggleFavorite(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const fRes = await query('SELECT is_favorite FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const newFav = !fRes.rows[0].is_favorite;
    await query('UPDATE files SET is_favorite = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newFav, fileId]);

    if (newFav) {
      await query(
        'INSERT INTO file_favorites (user_id, file_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, fileId]
      );
    } else {
      await query('DELETE FROM file_favorites WHERE user_id = $1 AND file_id = $2', [req.user.id, fileId]);
    }

    return res.json({ success: true, isFavorite: newFav });
  } catch (err) {
    console.error('toggleFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle favorite.' });
  }
}

export async function bulkDownload(req, res) {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    const filesQuery = await query(
      `SELECT id, original_name, file_path FROM files WHERE id = ANY($1::int[]) AND user_id = $2`,
      [fileIds.map(Number), req.user.id]
    );

    if (filesQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid files found to download.' });
    }

    const filesToArchive = filesQuery.rows.map(f => ({
      filePath: f.file_path,
      archiveName: f.original_name
    }));

    const zipFilename = `MediaVault_Download_${Date.now()}.zip`;
    const zipPath = path.join(uploadDir, zipFilename);

    await createZipArchive(filesToArchive, zipPath);

    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Type', 'application/zip');
    const stream = fs.createReadStream(zipPath);
    stream.pipe(res);

    stream.on('finish', () => {
      // Clean up temporary zip file after streaming
      removeFileFromDisk(zipPath);
    });
  } catch (err) {
    console.error('bulkDownload error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create bulk download archive.' });
  }
}

export async function bulkRename(req, res) {
  try {
    const { fileIds, prefix = '', suffix = '', pattern = 'number' } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    let index = 1;
    for (const id of fileIds) {
      const fRes = await query('SELECT original_name, extension FROM files WHERE id = $1 AND user_id = $2', [parseInt(id, 10), req.user.id]);
      if (fRes.rows.length > 0) {
        const file = fRes.rows[0];
        const base = path.basename(file.original_name, path.extname(file.original_name));
        let newBase = base;

        if (pattern === 'number') {
          newBase = `${prefix}${base}_${index}${suffix}`;
        } else if (pattern === 'replace') {
          newBase = `${prefix}${index}${suffix}`;
        } else {
          newBase = `${prefix}${base}${suffix}`;
        }

        const newName = file.extension ? `${newBase}.${file.extension}` : newBase;
        await query('UPDATE files SET original_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newName, parseInt(id, 10)]);
        index++;
      }
    }

    await logActivity(req.user.id, 'rename', 'bulk_files', null, { count: fileIds.length });
    return res.json({ success: true, message: `Renamed ${fileIds.length} file(s).` });
  } catch (err) {
    console.error('bulkRename error:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk rename files.' });
  }
}

