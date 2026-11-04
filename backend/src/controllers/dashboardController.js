import { query } from '../database/db.js';
import { recalculateUserStorage } from '../services/storageService.js';

export async function getDashboardStats(req, res) {
  try {
    const userId = req.user.id;

    // Recalculate up to date storage usage
    const storageUsage = await recalculateUserStorage(userId);

    // Get user profile storage limit
    const profileRes = await query('SELECT storage_limit_bytes FROM user_profiles WHERE user_id = $1', [userId]);
    const storageLimit = profileRes.rows[0]?.storage_limit_bytes || 10737418240;
    const storageUsed = storageUsage.total || 0;
    const availableStorage = Math.max(0, storageLimit - storageUsed);

    // File Counts by Category
    const countsRes = await query(
      `SELECT
         COUNT(CASE WHEN file_category = 'photos' AND is_trashed = false THEN 1 END) as photos_count,
         COUNT(CASE WHEN file_category = 'documents' AND is_trashed = false THEN 1 END) as documents_count,
         COUNT(CASE WHEN file_category = 'videos' AND is_trashed = false THEN 1 END) as videos_count,
         COUNT(CASE WHEN file_category = 'pdfs' AND is_trashed = false THEN 1 END) as pdfs_count,
         COUNT(CASE WHEN file_category = 'archives' AND is_trashed = false THEN 1 END) as archives_count,
         COUNT(CASE WHEN file_category = 'audio' AND is_trashed = false THEN 1 END) as audio_count,
         COUNT(CASE WHEN is_trashed = false THEN 1 END) as total_files,
         COUNT(CASE WHEN is_favorite = true AND is_trashed = false THEN 1 END) as favorites_count,
         COUNT(CASE WHEN is_trashed = true THEN 1 END) as trash_count
       FROM files
       WHERE user_id = $1`,
      [userId]
    );
    const counts = countsRes.rows[0] || {};

    // Duplicate files count (files sharing same SHA256 hash)
    const dupRes = await query(
      `SELECT COUNT(*) as dup_files_count
       FROM files f
       WHERE f.user_id = $1 AND f.is_trashed = false
         AND f.file_hash IN (
           SELECT file_hash FROM files WHERE user_id = $1 AND is_trashed = false GROUP BY file_hash HAVING COUNT(*) > 1
         )`,
      [userId]
    );
    const duplicateFilesCount = parseInt(dupRes.rows[0]?.dup_files_count || 0, 10);

    // Recently uploaded files
    const recentUploaded = await query(
      `SELECT f.id, f.original_name, f.filename, f.file_size, f.file_category, f.extension, f.is_favorite, f.created_at, f.updated_at,
              m.width, m.height
       FROM files f
       LEFT JOIN file_metadata m ON m.file_id = f.id
       WHERE f.user_id = $1 AND f.is_trashed = false
       ORDER BY f.created_at DESC
       LIMIT 6`,
      [userId]
    );

    // Recently modified files
    const recentModified = await query(
      `SELECT f.id, f.original_name, f.filename, f.file_size, f.file_category, f.extension, f.is_favorite, f.current_version, f.updated_at,
              m.width, m.height
       FROM files f
       LEFT JOIN file_metadata m ON m.file_id = f.id
       WHERE f.user_id = $1 AND f.is_trashed = false
       ORDER BY f.updated_at DESC
       LIMIT 6`,
      [userId]
    );

    // Favorite files
    const favoriteFiles = await query(
      `SELECT f.id, f.original_name, f.filename, f.file_size, f.file_category, f.extension, f.is_favorite, f.created_at,
              m.width, m.height
       FROM files f
       LEFT JOIN file_metadata m ON m.file_id = f.id
       WHERE f.user_id = $1 AND f.is_trashed = false AND f.is_favorite = true
       ORDER BY f.updated_at DESC
       LIMIT 6`,
      [userId]
    );

    // Recent activity timeline
    const activityLogs = await query(
      `SELECT id, action, target_type, target_id, details, created_at
       FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    return res.json({
      success: true,
      stats: {
        storageUsed,
        storageLimit,
        availableStorage,
        usagePercentage: storageLimit > 0 ? ((storageUsed / storageLimit) * 100).toFixed(1) : 0,
        totalFiles: parseInt(counts.total_files || 0, 10),
        totalPhotos: parseInt(counts.photos_count || 0, 10),
        totalDocuments: parseInt(counts.documents_count || 0, 10),
        totalVideos: parseInt(counts.videos_count || 0, 10),
        totalPdfs: parseInt(counts.pdfs_count || 0, 10),
        totalArchives: parseInt(counts.archives_count || 0, 10),
        totalAudio: parseInt(counts.audio_count || 0, 10),
        duplicateFiles: duplicateFilesCount,
        favoriteFilesCount: parseInt(counts.favorites_count || 0, 10),
        trashFilesCount: parseInt(counts.trash_count || 0, 10),
        storageBreakdown: {
          photos: storageUsage.photos,
          documents: storageUsage.documents,
          videos: storageUsage.videos,
          pdfs: storageUsage.pdfs,
          archives: storageUsage.archives,
          audio: storageUsage.audio,
          other: storageUsage.other
        }
      },
      recentUploaded: recentUploaded.rows,
      recentModified: recentModified.rows,
      favoriteFiles: favoriteFiles.rows,
      recentActivities: activityLogs.rows
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
  }
}

