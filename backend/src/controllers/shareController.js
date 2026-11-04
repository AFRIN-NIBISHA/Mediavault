import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { query } from '../database/db.js';
import { logActivity } from '../services/storageService.js';

export async function createShare(req, res) {
  try {
    const { fileId, accessType = 'view', password, expiresAt } = req.body;
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'fileId is required.' });
    }

    // Verify ownership
    const fRes = await query('SELECT id, original_name FROM files WHERE id = $1 AND user_id = $2', [parseInt(fileId, 10), req.user.id]);
    if (fRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    let passwordHash = null;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const shareToken = crypto.randomBytes(24).toString('hex');

    const shareRes = await query(
      `INSERT INTO file_shares (file_id, user_id, share_token, access_type, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [parseInt(fileId, 10), req.user.id, shareToken, accessType, passwordHash, expiresAt || null]
    );

    await logActivity(req.user.id, 'share', 'file', parseInt(fileId, 10), { shareToken, accessType });

    return res.status(201).json({
      success: true,
      message: 'Share link generated successfully.',
      share: {
        ...shareRes.rows[0],
        hasPassword: !!passwordHash,
        password_hash: undefined // Do not return hash
      }
    });
  } catch (err) {
    console.error('createShare error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create share link.' });
  }
}

export async function getUserShares(req, res) {
  try {
    const sharesRes = await query(
      `SELECT s.id, s.file_id, s.share_token, s.access_type, s.expires_at, s.is_active,
              s.download_count, s.view_count, s.created_at,
              CASE WHEN s.password_hash IS NOT NULL THEN true ELSE false END as has_password,
              f.original_name, f.file_size, f.file_category, f.extension
       FROM file_shares s
       JOIN files f ON f.id = s.file_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, shares: sharesRes.rows });
  } catch (err) {
    console.error('getUserShares error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve shares.' });
  }
}

export async function revokeShare(req, res) {
  try {
    const shareId = parseInt(req.params.id, 10);
    const updateRes = await query(
      'UPDATE file_shares SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [shareId, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Share link not found.' });
    }

    return res.json({ success: true, message: 'Share link revoked successfully.' });
  } catch (err) {
    console.error('revokeShare error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revoke share link.' });
  }
}

// Public endpoint: Get shared file info
export async function getPublicSharedFile(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const sRes = await query(
      `SELECT s.*, f.original_name, f.filename, f.file_size, f.mime_type, f.file_category, f.extension, f.file_path,
              u.username as shared_by
       FROM file_shares s
       JOIN files f ON f.id = s.file_id
       JOIN users u ON u.id = s.user_id
       WHERE s.share_token = $1`,
      [token]
    );

    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shared link does not exist.' });
    }

    const share = sRes.rows[0];

    if (!share.is_active) {
      return res.status(410).json({ success: false, message: 'This shared link has been deactivated.' });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This shared link has expired.' });
    }

    // Password verification if required
    const requiresPassword = !!share.password_hash;
    if (requiresPassword) {
      if (!password) {
        return res.json({
          success: true,
          requiresPassword: true,
          fileName: share.original_name,
          sharedBy: share.shared_by
        });
      }

      const match = await bcrypt.compare(password, share.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, requiresPassword: true, message: 'Incorrect password.' });
      }
    }

    // Increment view count
    await query('UPDATE file_shares SET view_count = view_count + 1 WHERE id = $1', [share.id]);

    return res.json({
      success: true,
      requiresPassword: false,
      file: {
        id: share.file_id,
        originalName: share.original_name,
        fileSize: share.file_size,
        mimeType: share.mime_type,
        fileCategory: share.file_category,
        extension: share.extension,
        accessType: share.access_type,
        sharedBy: share.shared_by,
        createdAt: share.created_at
      }
    });
  } catch (err) {
    console.error('getPublicSharedFile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to access shared file.' });
  }
}

// Public endpoint: Download shared file
export async function downloadPublicSharedFile(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const sRes = await query(
      `SELECT s.*, f.original_name, f.file_path, f.mime_type, f.file_size
       FROM file_shares s
       JOIN files f ON f.id = s.file_id
       WHERE s.share_token = $1`,
      [token]
    );

    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shared link does not exist.' });
    }

    const share = sRes.rows[0];

    if (!share.is_active || (share.expires_at && new Date(share.expires_at) < new Date())) {
      return res.status(410).json({ success: false, message: 'This shared link is inactive or expired.' });
    }

    if (share.password_hash) {
      if (!password) {
        return res.status(401).json({ success: false, message: 'Password required to download this file.' });
      }
      const match = await bcrypt.compare(password, share.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      }
    }

    if (!fs.existsSync(share.file_path)) {
      return res.status(404).json({ success: false, message: 'Physical file is unavailable.' });
    }

    // Increment download count
    await query('UPDATE file_shares SET download_count = download_count + 1 WHERE id = $1', [share.id]);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.original_name)}"`);
    res.setHeader('Content-Type', share.mime_type || 'application/octet-stream');
    fs.createReadStream(share.file_path).pipe(res);
  } catch (err) {
    console.error('downloadPublicSharedFile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to download shared file.' });
  }
}

