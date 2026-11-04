import fs from 'fs';
import { query } from '../database/db.js';

/**
 * Recalculate user storage breakdown and update storage_usage table
 */
export async function recalculateUserStorage(userId) {
  const res = await query(
    `SELECT file_category, SUM(file_size) as category_sum
     FROM files
     WHERE user_id = $1 AND is_trashed = false
     GROUP BY file_category`,
    [userId]
  );

  let total = 0;
  let photos = 0;
  let videos = 0;
  let documents = 0;
  let pdfs = 0;
  let archives = 0;
  let audio = 0;
  let other = 0;

  for (const row of res.rows) {
    const bytes = parseInt(row.category_sum, 10) || 0;
    total += bytes;
    switch (row.file_category) {
      case 'photos':
        photos = bytes;
        break;
      case 'videos':
        videos = bytes;
        break;
      case 'documents':
        documents = bytes;
        break;
      case 'pdfs':
        pdfs = bytes;
        break;
      case 'archives':
        archives = bytes;
        break;
      case 'audio':
        audio = bytes;
        break;
      default:
        other += bytes;
        break;
    }
  }

  // Update or insert storage_usage
  await query(
    `INSERT INTO storage_usage (user_id, total_bytes, photos_bytes, videos_bytes, documents_bytes, pdfs_bytes, archives_bytes, audio_bytes, other_bytes, last_calculated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       total_bytes = EXCLUDED.total_bytes,
       photos_bytes = EXCLUDED.photos_bytes,
       videos_bytes = EXCLUDED.videos_bytes,
       documents_bytes = EXCLUDED.documents_bytes,
       pdfs_bytes = EXCLUDED.pdfs_bytes,
       archives_bytes = EXCLUDED.archives_bytes,
       audio_bytes = EXCLUDED.audio_bytes,
       other_bytes = EXCLUDED.other_bytes,
       last_calculated_at = CURRENT_TIMESTAMP`,
    [userId, total, photos, videos, documents, pdfs, archives, audio, other]
  );

  return { total, photos, videos, documents, pdfs, archives, audio, other };
}

/**
 * Log activity for audit and dashboard activity feed
 */
export async function logActivity(userId, action, targetType, targetId, details = {}, ipAddress = null) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, targetType, targetId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Create a new version of a file
 */
export async function saveFileVersion(fileId, filePath, fileSize, summary, userId) {
  // Get max version number
  const vRes = await query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as next_ver
     FROM file_versions WHERE file_id = $1`,
    [fileId]
  );
  const nextVer = vRes.rows[0].next_ver;

  await query(
    `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [fileId, nextVer, filePath, fileSize, summary, userId]
  );

  await query(
    `UPDATE files SET current_version = $1, file_path = $2, file_size = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [nextVer, filePath, fileSize, fileId]
  );

  return nextVer;
}

/**
 * Safe delete file from filesystem
 */
export function removeFileFromDisk(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`Could not delete file at ${filePath}:`, err.message);
  }
}

