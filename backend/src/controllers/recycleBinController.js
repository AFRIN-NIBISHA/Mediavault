import { query } from '../database/db.js';
import { recalculateUserStorage, logActivity, removeFileFromDisk } from '../services/storageService.js';

export async function getTrashFiles(req, res) {
  try {
    const trashRes = await query(
      `SELECT f.id, f.original_name, f.filename, f.file_size, f.file_category, f.extension,
              f.trashed_at, rb.deleted_at, rb.auto_delete_at,
              fd.name as original_folder_name
       FROM files f
       LEFT JOIN recycle_bin rb ON rb.file_id = f.id
       LEFT JOIN folders fd ON fd.id = rb.original_folder_id
       WHERE f.user_id = $1 AND f.is_trashed = true
       ORDER BY f.trashed_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, files: trashRes.rows });
  } catch (err) {
    console.error('getTrashFiles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve trash files.' });
  }
}

export async function restoreFile(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const rbRes = await query('SELECT original_folder_id FROM recycle_bin WHERE file_id = $1 AND user_id = $2', [fileId, req.user.id]);

    let targetFolderId = rbRes.rows[0]?.original_folder_id || null;
    if (targetFolderId) {
      // Check if original folder still exists
      const folderCheck = await query('SELECT id FROM folders WHERE id = $1 AND user_id = $2', [targetFolderId, req.user.id]);
      if (folderCheck.rows.length === 0) {
        targetFolderId = null; // restore to root
      }
    }

    const updateRes = await query(
      `UPDATE files
       SET is_trashed = false, trashed_at = NULL, folder_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 RETURNING id, original_name`,
      [targetFolderId, fileId, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found in trash.' });
    }

    await query('DELETE FROM recycle_bin WHERE file_id = $1 AND user_id = $2', [fileId, req.user.id]);
    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'restore', 'file', fileId, { originalName: updateRes.rows[0].original_name });

    return res.json({ success: true, message: 'File restored successfully.' });
  } catch (err) {
    console.error('restoreFile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore file.' });
  }
}

export async function restoreAll(req, res) {
  try {
    const trashed = await query('SELECT id FROM files WHERE user_id = $1 AND is_trashed = true', [req.user.id]);
    for (const row of trashed.rows) {
      await query(
        `UPDATE files SET is_trashed = false, trashed_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.id]
      );
    }

    await query('DELETE FROM recycle_bin WHERE user_id = $1', [req.user.id]);
    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'restore', 'bulk_trash', null, { count: trashed.rows.length });

    return res.json({ success: true, message: `Restored ${trashed.rows.length} file(s).` });
  } catch (err) {
    console.error('restoreAll error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore all files.' });
  }
}

export async function permanentDelete(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    // Fetch all versions and main file
    const fileRes = await query('SELECT file_path FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const versions = await query('SELECT file_path FROM file_versions WHERE file_id = $1', [fileId]);
    for (const v of versions.rows) {
      removeFileFromDisk(v.file_path);
    }
    removeFileFromDisk(fileRes.rows[0].file_path);

    await query('DELETE FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    await query('DELETE FROM recycle_bin WHERE file_id = $1 AND user_id = $2', [fileId, req.user.id]);

    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'delete_permanent', 'file', fileId);

    return res.json({ success: true, message: 'File permanently deleted.' });
  } catch (err) {
    console.error('permanentDelete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to permanently delete file.' });
  }
}

export async function emptyTrash(req, res) {
  try {
    const trashed = await query('SELECT id, file_path FROM files WHERE user_id = $1 AND is_trashed = true', [req.user.id]);

    for (const file of trashed.rows) {
      const versions = await query('SELECT file_path FROM file_versions WHERE file_id = $1', [file.id]);
      for (const v of versions.rows) {
        removeFileFromDisk(v.file_path);
      }
      removeFileFromDisk(file.file_path);
    }

    await query('DELETE FROM files WHERE user_id = $1 AND is_trashed = true', [req.user.id]);
    await query('DELETE FROM recycle_bin WHERE user_id = $1', [req.user.id]);

    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'delete_permanent', 'recycle_bin', null, { count: trashed.rows.length });

    return res.json({ success: true, message: `Recycle bin emptied (${trashed.rows.length} files removed).` });
  } catch (err) {
    console.error('emptyTrash error:', err);
    return res.status(500).json({ success: false, message: 'Failed to empty recycle bin.' });
  }
}

