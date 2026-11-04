import { query } from '../database/db.js';
import { logActivity, recalculateUserStorage } from '../services/storageService.js';

export async function createFolder(req, res) {
  try {
    const { name, parentId = null, color = '#0c87eb' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required.' });
    }

    const folderRes = await query(
      `INSERT INTO folders (user_id, parent_id, name, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, parentId ? parseInt(parentId, 10) : null, name.trim(), color]
    );

    await logActivity(req.user.id, 'upload', 'folder', folderRes.rows[0].id, { name: name.trim() });

    return res.status(201).json({
      success: true,
      message: 'Folder created successfully.',
      folder: folderRes.rows[0]
    });
  } catch (err) {
    console.error('createFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create folder.' });
  }
}

export async function getFolders(req, res) {
  try {
    const foldersRes = await query(
      `SELECT fd.*,
              COUNT(f.id) FILTER (WHERE f.is_trashed = false) as file_count,
              COALESCE(SUM(f.file_size) FILTER (WHERE f.is_trashed = false), 0) as total_size
       FROM folders fd
       LEFT JOIN files f ON f.folder_id = fd.id
       WHERE fd.user_id = $1
       GROUP BY fd.id
       ORDER BY fd.name ASC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      folders: foldersRes.rows
    });
  } catch (err) {
    console.error('getFolders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve folders.' });
  }
}

export async function renameFolder(req, res) {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required.' });
    }

    const updateRes = await query(
      `UPDATE folders
       SET name = $1, color = COALESCE($2, color), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [name.trim(), color, folderId, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    await logActivity(req.user.id, 'rename', 'folder', folderId, { newName: name.trim() });

    return res.json({
      success: true,
      message: 'Folder renamed successfully.',
      folder: updateRes.rows[0]
    });
  } catch (err) {
    console.error('renameFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to rename folder.' });
  }
}

export async function deleteFolder(req, res) {
  try {
    const folderId = parseInt(req.params.id, 10);
    // Delete folder - database cascading will clean up or set null
    // We can also move files in folder to Recycle Bin
    await query(
      `UPDATE files SET is_trashed = true, trashed_at = CURRENT_TIMESTAMP WHERE folder_id = $1 AND user_id = $2`,
      [folderId, req.user.id]
    );

    const delRes = await query('DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING id, name', [folderId, req.user.id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'delete', 'folder', folderId, { name: delRes.rows[0].name });

    return res.json({ success: true, message: 'Folder and contents moved to Recycle Bin.' });
  } catch (err) {
    console.error('deleteFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete folder.' });
  }
}

