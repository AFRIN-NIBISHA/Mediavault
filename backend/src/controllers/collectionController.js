import { query } from '../database/db.js';
import { logActivity } from '../services/storageService.js';

export async function getCollections(req, res) {
  try {
    const colRes = await query(
      `SELECT c.*,
              COUNT(cf.file_id) as file_count,
              COALESCE(SUM(f.file_size), 0) as total_size
       FROM collections c
       LEFT JOIN collection_files cf ON cf.collection_id = c.id
       LEFT JOIN files f ON f.id = cf.file_id AND f.is_trashed = false
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [req.user.id]
    );

    return res.json({ success: true, collections: colRes.rows });
  } catch (err) {
    console.error('getCollections error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve collections.' });
  }
}

export async function getCollectionById(req, res) {
  try {
    const collectionId = parseInt(req.params.id, 10);
    const colRes = await query('SELECT * FROM collections WHERE id = $1 AND user_id = $2', [collectionId, req.user.id]);
    if (colRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const filesRes = await query(
      `SELECT f.*, cf.added_at as collection_added_at
       FROM files f
       JOIN collection_files cf ON cf.file_id = f.id
       WHERE cf.collection_id = $1 AND f.is_trashed = false
       ORDER BY cf.added_at DESC`,
      [collectionId]
    );

    return res.json({
      success: true,
      collection: colRes.rows[0],
      files: filesRes.rows
    });
  } catch (err) {
    console.error('getCollectionById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve collection details.' });
  }
}

export async function createCollection(req, res) {
  try {
    const { name, description = '', color = '#7cc5fd' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Collection name is required.' });
    }

    const ins = await query(
      `INSERT INTO collections (user_id, name, description, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name.trim(), description, color]
    );

    await logActivity(req.user.id, 'upload', 'collection', ins.rows[0].id, { name: name.trim() });
    return res.status(201).json({ success: true, collection: ins.rows[0] });
  } catch (err) {
    console.error('createCollection error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create collection.' });
  }
}

export async function addFilesToCollection(req, res) {
  try {
    const collectionId = parseInt(req.params.id, 10);
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'fileIds array is required.' });
    }

    // Verify collection ownership
    const cCheck = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [collectionId, req.user.id]);
    if (cCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    for (const fid of fileIds) {
      await query(
        `INSERT INTO collection_files (collection_id, file_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [collectionId, parseInt(fid, 10)]
      );
    }

    return res.json({ success: true, message: `Added ${fileIds.length} file(s) to collection.` });
  } catch (err) {
    console.error('addFilesToCollection error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add files to collection.' });
  }
}

export async function removeFileFromCollection(req, res) {
  try {
    const collectionId = parseInt(req.params.id, 10);
    const fileId = parseInt(req.params.fileId, 10);

    await query('DELETE FROM collection_files WHERE collection_id = $1 AND file_id = $2', [collectionId, fileId]);
    return res.json({ success: true, message: 'File removed from collection.' });
  } catch (err) {
    console.error('removeFileFromCollection error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove file from collection.' });
  }
}

export async function deleteCollection(req, res) {
  try {
    const collectionId = parseInt(req.params.id, 10);
    await query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [collectionId, req.user.id]);
    return res.json({ success: true, message: 'Collection deleted.' });
  } catch (err) {
    console.error('deleteCollection error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete collection.' });
  }
}

