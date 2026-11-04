import { query } from '../database/db.js';
import { recalculateUserStorage } from '../services/storageService.js';

export async function getStorageAnalytics(req, res) {
  try {
    const userId = req.user.id;
    const storageUsage = await recalculateUserStorage(userId);

    const profileRes = await query('SELECT storage_limit_bytes FROM user_profiles WHERE user_id = $1', [userId]);
    const storageLimit = profileRes.rows[0]?.storage_limit_bytes || 10737418240;

    // Largest files
    const largestFiles = await query(
      `SELECT id, original_name, file_size, file_category, extension, created_at
       FROM files
       WHERE user_id = $1 AND is_trashed = false
       ORDER BY file_size DESC
       LIMIT 10`,
      [userId]
    );

    // Duplicate storage
    const dupRes = await query(
      `SELECT file_hash, COUNT(*) as cnt, SUM(file_size) as total_size, MIN(file_size) as single_size
       FROM files
       WHERE user_id = $1 AND is_trashed = false AND file_hash IS NOT NULL AND file_hash != ''
       GROUP BY file_hash
       HAVING COUNT(*) > 1`,
      [userId]
    );

    let duplicateWastedBytes = 0;
    for (const d of dupRes.rows) {
      duplicateWastedBytes += parseInt(d.total_size, 10) - parseInt(d.single_size, 10);
    }

    // Category distribution counts and sizes
    const categoryStats = await query(
      `SELECT file_category, COUNT(*) as count, SUM(file_size) as total_size
       FROM files
       WHERE user_id = $1 AND is_trashed = false
       GROUP BY file_category
       ORDER BY total_size DESC`,
      [userId]
    );

    // Storage history / upload timeline by day (last 14 days)
    const timelineRes = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(file_size) as total_bytes
       FROM files
       WHERE user_id = $1 AND is_trashed = false
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC
       LIMIT 30`,
      [userId]
    );

    return res.json({
      success: true,
      analytics: {
        totalUsed: storageUsage.total,
        storageLimit,
        available: Math.max(0, storageLimit - storageUsage.total),
        usagePercentage: storageLimit > 0 ? ((storageUsage.total / storageLimit) * 100).toFixed(2) : 0,
        duplicateWastedBytes,
        categories: categoryStats.rows,
        largestFiles: largestFiles.rows,
        uploadTimeline: timelineRes.rows
      }
    });
  } catch (err) {
    console.error('getStorageAnalytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve storage analytics.' });
  }
}

