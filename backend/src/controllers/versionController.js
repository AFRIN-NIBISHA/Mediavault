import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/db.js';
import { recalculateUserStorage, logActivity, saveFileVersion } from '../services/storageService.js';
import { calculateSha256 } from '../services/hashService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

export async function getFileVersions(req, res) {
  try {
    const fileId = parseInt(req.params.fileId, 10);
    // Verify file ownership
    const fileRes = await query('SELECT id, original_name, current_version FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const versionsRes = await query(
      `SELECT v.id, v.version_number, v.file_size, v.change_summary, v.created_at,
              u.username as created_by_username
       FROM file_versions v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.file_id = $1
       ORDER BY v.version_number DESC`,
      [fileId]
    );

    return res.json({
      success: true,
      file: fileRes.rows[0],
      versions: versionsRes.rows
    });
  } catch (err) {
    console.error('getFileVersions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve file versions.' });
  }
}

export async function restoreVersion(req, res) {
  try {
    const fileId = parseInt(req.params.fileId, 10);
    const versionNumber = parseInt(req.params.versionNumber, 10);

    const fRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = fRes.rows[0];
    const vRes = await query(
      'SELECT * FROM file_versions WHERE file_id = $1 AND version_number = $2',
      [fileId, versionNumber]
    );

    if (vRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Version ${versionNumber} does not exist.` });
    }

    const targetVersion = vRes.rows[0];
    if (!fs.existsSync(targetVersion.file_path)) {
      return res.status(404).json({ success: false, message: 'Version physical asset missing on disk.' });
    }

    // Create a new copy of the version file to prevent corrupting version history
    const ext = path.extname(targetVersion.file_path);
    const restoredFilename = `restored_v${versionNumber}_${Date.now()}${ext}`;
    const restoredPath = path.join(uploadDir, restoredFilename);
    fs.copyFileSync(targetVersion.file_path, restoredPath);

    const newSha = await calculateSha256(restoredPath);

    // Record as new current version
    const newVersionNum = await saveFileVersion(
      fileId,
      restoredPath,
      targetVersion.file_size,
      `Restored from Version ${versionNumber}`,
      req.user.id
    );

    await query('UPDATE files SET file_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newSha, fileId]);
    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'restore', 'file_version', fileId, { restoredFromVersion: versionNumber, newVersionNum });

    return res.json({
      success: true,
      message: `Successfully restored Version ${versionNumber} as new Version ${newVersionNum}.`,
      currentVersion: newVersionNum
    });
  } catch (err) {
    console.error('restoreVersion error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore file version.' });
  }
}

