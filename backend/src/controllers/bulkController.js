import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/db.js';
import { processImage, getImageMetadata } from '../services/imageService.js';
import { mergePdfs } from '../services/pdfService.js';
import { createZipArchive } from '../services/zipService.js';
import { calculateSha256, calculatePerceptualHash } from '../services/hashService.js';
import { recalculateUserStorage, logActivity } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

export async function processBulkJob(req, res) {
  try {
    const { jobType, fileIds = [], options = {} } = req.body;
    const userId = req.user.id;

    if (!jobType || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'jobType and non-empty fileIds array are required.' });
    }

    // Create processing job record
    const jobRes = await query(
      `INSERT INTO processing_jobs (user_id, job_type, status, input_files, progress_percent)
       VALUES ($1, $2, 'processing', $3, 10) RETURNING id`,
      [userId, jobType, JSON.stringify(fileIds)]
    );
    const jobId = jobRes.rows[0].id;

    const filesRes = await query(
      `SELECT * FROM files WHERE id = ANY($1::int[]) AND user_id = $2`,
      [fileIds.map(Number), userId]
    );

    const inputFiles = filesRes.rows;
    const results = [];
    let progress = 10;
    const progressStep = Math.floor(80 / Math.max(1, inputFiles.length));

    switch (jobType) {
      case 'batch_resize':
      case 'batch_compress':
      case 'batch_convert': {
        for (const file of inputFiles) {
          if (file.file_category !== 'photos') continue;

          const targetFormat = (options.format || file.extension || 'jpeg').toLowerCase();
          const outFilename = `batch_${jobType}_${Date.now()}_${Math.round(Math.random() * 1e4)}.${targetFormat}`;
          const outPath = path.join(uploadDir, outFilename);

          const processOptions = {
            ...options,
            format: targetFormat
          };

          const pResult = await processImage(file.file_path, outPath, processOptions);
          const sha = await calculateSha256(outPath);
          const pHash = await calculatePerceptualHash(outPath);

          const newFile = await query(
            `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'photos', $8, $9, $10) RETURNING *`,
            [userId, file.folder_id, outFilename, `Batch_${file.original_name}`, outPath, pResult.fileSize, `image/${targetFormat}`, targetFormat, sha, pHash]
          );

          await query(`INSERT INTO file_metadata (file_id, width, height, format) VALUES ($1, $2, $3, $4)`, [
            newFile.rows[0].id,
            pResult.width,
            pResult.height,
            targetFormat
          ]);

          results.push(newFile.rows[0]);
          progress = Math.min(90, progress + progressStep);
          await query('UPDATE processing_jobs SET progress_percent = $1 WHERE id = $2', [progress, jobId]);
        }
        break;
      }

      case 'batch_pdf_merge': {
        const pdfFiles = inputFiles.filter(f => f.file_category === 'pdfs');
        if (pdfFiles.length < 2) {
          throw new Error('At least 2 PDF files required to merge.');
        }

        const outFilename = `batch_merged_${Date.now()}.pdf`;
        const outPath = path.join(uploadDir, outFilename);
        const mergeRes = await mergePdfs(pdfFiles.map(f => f.file_path), outPath);
        const sha = await calculateSha256(outPath);

        const newFile = await query(
          `INSERT INTO files (user_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
           VALUES ($1, $2, $3, $4, $5, 'application/pdf', 'pdfs', 'pdf', $6) RETURNING *`,
          [userId, outFilename, options.outputTitle || 'Batch_Merged_Document.pdf', outPath, mergeRes.fileSize, sha]
        );

        await query(`INSERT INTO file_metadata (file_id, page_count) VALUES ($1, $2)`, [newFile.rows[0].id, mergeRes.pageCount]);
        results.push(newFile.rows[0]);
        break;
      }

      case 'batch_create_zip': {
        const outFilename = `archive_${Date.now()}.zip`;
        const outPath = path.join(uploadDir, outFilename);
        const filesToZip = inputFiles.map(f => ({ filePath: f.file_path, archiveName: f.original_name }));

        const zipRes = await createZipArchive(filesToZip, outPath);
        const sha = await calculateSha256(outPath);

        const newFile = await query(
          `INSERT INTO files (user_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
           VALUES ($1, $2, $3, $4, $5, 'application/zip', 'archives', 'zip', $6) RETURNING *`,
          [userId, outFilename, options.outputTitle || 'MediaVault_Archive.zip', outPath, zipRes.fileSize, sha]
        );

        results.push(newFile.rows[0]);
        break;
      }

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }

    await query(
      `UPDATE processing_jobs
       SET status = 'completed', progress_percent = 100, completed_at = CURRENT_TIMESTAMP,
           output_metadata = $1
       WHERE id = $2`,
      [JSON.stringify({ processedCount: results.length }), jobId]
    );

    await recalculateUserStorage(userId);
    await logActivity(userId, 'process', 'bulk_job', jobId, { jobType, processedCount: results.length });

    return res.json({
      success: true,
      message: `Bulk job '${jobType}' completed successfully.`,
      jobId,
      results
    });
  } catch (err) {
    console.error('processBulkJob error:', err);
    return res.status(500).json({ success: false, message: `Bulk processing error: ${err.message}` });
  }
}

export async function getJobs(req, res) {
  try {
    const jobsRes = await query(
      `SELECT * FROM processing_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    return res.json({ success: true, jobs: jobsRes.rows });
  } catch (err) {
    console.error('getJobs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch processing jobs.' });
  }
}

