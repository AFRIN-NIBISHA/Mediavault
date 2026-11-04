import { query } from '../database/db.js';
import { logActivity } from '../services/storageService.js';

export async function getAdminStats(req, res) {
  try {
    // Total users, active users
    const usersCount = await query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
      FROM users
    `);

    // Total files and total storage used across entire platform
    const filesStats = await query(`
      SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_storage_bytes
      FROM files
      WHERE is_trashed = false
    `);

    // Total shared links
    const sharesCount = await query(`
      SELECT
        COUNT(*) as total_shares,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_shares,
        COALESCE(SUM(download_count), 0) as total_downloads
      FROM file_shares
    `);

    // Category distribution across system
    const systemCategoryStats = await query(`
      SELECT file_category, COUNT(*) as count, SUM(file_size) as size
      FROM files
      WHERE is_trashed = false
      GROUP BY file_category
    `);

    return res.json({
      success: true,
      stats: {
        totalUsers: parseInt(usersCount.rows[0]?.total_users || 0, 10),
        activeUsers: parseInt(usersCount.rows[0]?.active_users || 0, 10),
        totalFiles: parseInt(filesStats.rows[0]?.total_files || 0, 10),
        totalStorageBytes: parseInt(filesStats.rows[0]?.total_storage_bytes || 0, 10),
        totalShares: parseInt(sharesCount.rows[0]?.total_shares || 0, 10),
        activeShares: parseInt(sharesCount.rows[0]?.active_shares || 0, 10),
        totalDownloads: parseInt(sharesCount.rows[0]?.total_downloads || 0, 10),
        categoryDistribution: systemCategoryStats.rows
      }
    });
  } catch (err) {
    console.error('getAdminStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin stats.' });
  }
}

export async function getAllUsers(req, res) {
  try {
    const usersRes = await query(`
      SELECT u.id, u.email, u.username, u.role, u.is_active, u.created_at,
             p.full_name, p.storage_limit_bytes,
             COALESCE(s.total_bytes, 0) as storage_used_bytes,
             COUNT(f.id) FILTER (WHERE f.is_trashed = false) as file_count
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN storage_usage s ON s.user_id = u.id
      LEFT JOIN files f ON f.user_id = u.id
      GROUP BY u.id, p.full_name, p.storage_limit_bytes, s.total_bytes
      ORDER BY u.created_at DESC
    `);

    return res.json({ success: true, users: usersRes.rows });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users list.' });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own account.' });
    }

    const u = await query('SELECT is_active, username FROM users WHERE id = $1', [targetUserId]);
    if (u.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = !u.rows[0].is_active;
    await query('UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newStatus, targetUserId]);

    await logActivity(req.user.id, 'edit', 'user_status', targetUserId, {
      username: u.rows[0].username,
      newStatus: newStatus ? 'activated' : 'suspended'
    });

    return res.json({
      success: true,
      message: `User '${u.rows[0].username}' has been ${newStatus ? 'activated' : 'suspended'}.`,
      isActive: newStatus
    });
  } catch (err) {
    console.error('toggleUserStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle user status.' });
  }
}

export async function updateUserQuota(req, res) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { storageLimitBytes } = req.body;

    if (!storageLimitBytes || isNaN(storageLimitBytes)) {
      return res.status(400).json({ success: false, message: 'Valid storageLimitBytes number is required.' });
    }

    await query(
      `UPDATE user_profiles SET storage_limit_bytes = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [parseInt(storageLimitBytes, 10), targetUserId]
    );

    await logActivity(req.user.id, 'edit', 'user_quota', targetUserId, { newLimit: storageLimitBytes });

    return res.json({ success: true, message: 'Storage quota updated successfully.' });
  } catch (err) {
    console.error('updateUserQuota error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update storage quota.' });
  }
}

export async function getAllSharedLinks(req, res) {
  try {
    const shares = await query(`
      SELECT s.id, s.share_token, s.access_type, s.expires_at, s.is_active, s.download_count, s.view_count, s.created_at,
             u.username as owner_username, u.email as owner_email,
             f.original_name, f.file_size, f.file_category
      FROM file_shares s
      JOIN users u ON u.id = s.user_id
      JOIN files f ON f.id = s.file_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    return res.json({ success: true, shares: shares.rows });
  } catch (err) {
    console.error('getAllSharedLinks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve shared links.' });
  }
}

export async function getSystemLogs(req, res) {
  try {
    const logs = await query(`
      SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.ip_address, a.created_at,
             u.username, u.email
      FROM activity_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    return res.json({ success: true, logs: logs.rows });
  } catch (err) {
    console.error('getSystemLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve system logs.' });
  }
}

