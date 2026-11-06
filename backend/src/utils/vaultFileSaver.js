import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { query } from '../database/db.js';
import { calculateSha256, calculatePerceptualHash } from '../services/hashService.js';
import { getImageMetadata } from '../services/imageService.js';
import { recalculateUserStorage } from '../services/storageService.js';
import { getFileCategory } from './constants.js';

/**
 * Persists an in-memory or generated buffer as a first-class MediaVault file
 */
export async function saveBufferAsMediaVaultFile(userId, buffer, originalName, options = {}) {
  const {
    folderId = null,
    summary = 'Created in AI Studio',
    categoryOverride = null
  } = options;

  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(originalName).replace('.', '').toLowerCase() || 'png';
  const filename = `${Date.now()}-${uuidv4()}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  // Write buffer to disk
  fs.writeFileSync(filePath, buffer);
  const fileSize = buffer.length;
  const mimeType = mime.lookup(ext) || 'image/png';
  const category = categoryOverride || getFileCategory(mimeType, ext);

  // Compute hashes
  const sha256 = await calculateSha256(filePath);
  let pHash = null;
  if (category === 'photos') {
    pHash = await calculatePerceptualHash(filePath);
  }

  // Defensive bounds for SQL columns
  const safeOriginalName = (originalName || 'file').substring(0, 240);
  const safeSummary = (summary || 'Created in AI Studio').substring(0, 500);

  // Insert into files table
  const fileRes = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [userId, folderId, filename, safeOriginalName, filePath, fileSize, mimeType, category, ext, sha256, pHash]
  );
  const file = fileRes.rows[0];

  // Metadata
  let meta = { width: null, height: null, format: null, exif: {} };
  if (category === 'photos') {
    const imgMeta = await getImageMetadata(filePath);
    meta.width = imgMeta.width;
    meta.height = imgMeta.height;
    meta.format = imgMeta.format;
    meta.exif = imgMeta.exif || {};
  }

  await query(
    `INSERT INTO file_metadata (file_id, width, height, format, exif_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [file.id, meta.width, meta.height, meta.format, JSON.stringify(meta.exif)]
  );

  // Initial version
  await query(
    `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
     VALUES ($1, 1, $2, $3, $4, $5)`,
    [file.id, filePath, fileSize, safeSummary, userId]
  );

  // Log activity
  await query(
    `INSERT INTO activity_logs (user_id, action, target_type, target_id, details)
     VALUES ($1, 'create', 'file', $2, $3)`,
    [userId, file.id, JSON.stringify({ filename: safeOriginalName, size: fileSize, category, summary: safeSummary })]
  );

  // Recalculate storage breakdown so storage_usage is always live
  try {
    await recalculateUserStorage(userId);
  } catch (err) {
    console.warn('Failed to recalculate storage in saveBufferAsMediaVaultFile:', err.message);
  }

  return {
    ...file,
    metadata: meta
  };
}

