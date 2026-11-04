import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from '../database/db.js';
import {
  mergePdfs,
  splitPdf,
  extractPdfPages,
  reorderPdfPages,
  rotatePdfPages,
  imagesToPdf,
  getPdfInfo
} from '../services/pdfService.js';
import { calculateSha256 } from '../services/hashService.js';
import { recalculateUserStorage, logActivity } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

export async function merge(req, res) {
  try {
    const { fileIds, outputTitle = 'Merged_Document.pdf' } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length < 2) {
      return res.status(400).json({ success: false, message: 'At least two PDF file IDs are required to merge.' });
    }

    const filesRes = await query(
      `SELECT id, original_name, file_path FROM files
       WHERE id = ANY($1::int[]) AND user_id = $2 AND file_category = 'pdfs'`,
      [fileIds.map(Number), req.user.id]
    );

    if (filesRes.rows.length !== fileIds.length) {
      return res.status(400).json({ success: false, message: 'One or more PDF files could not be found.' });
    }

    // Preserve order of fileIds
    const orderedPaths = fileIds.map(id => filesRes.rows.find(f => f.id === Number(id)).file_path);

    const outFilename = `merged_${Date.now()}_${Math.round(Math.random() * 1e4)}.pdf`;
    const outPath = path.join(uploadDir, outFilename);

    const mergeResult = await mergePdfs(orderedPaths, outPath);
    const sha256 = await calculateSha256(outPath);

    const newFile = await query(
      `INSERT INTO files (user_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
       VALUES ($1, $2, $3, $4, $5, 'application/pdf', 'pdfs', 'pdf', $6) RETURNING *`,
      [req.user.id, outFilename, outputTitle, outPath, mergeResult.fileSize, sha256]
    );

    await query(
      `INSERT INTO file_metadata (file_id, page_count, format)
       VALUES ($1, $2, 'pdf')`,
      [newFile.rows[0].id, mergeResult.pageCount]
    );

    await query(
      `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
       VALUES ($1, 1, $2, $3, 'Generated from PDF merge', $4)`,
      [newFile.rows[0].id, outPath, mergeResult.fileSize, req.user.id]
    );

    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'process', 'pdf', newFile.rows[0].id, {
      type: 'merge',
      sourceCount: fileIds.length,
      pages: mergeResult.pageCount
    });

    return res.status(201).json({
      success: true,
      message: 'PDFs merged successfully.',
      file: newFile.rows[0],
      pageCount: mergeResult.pageCount
    });
  } catch (err) {
    console.error('PDF merge error:', err);
    return res.status(500).json({ success: false, message: `PDF merge failed: ${err.message}` });
  }
}

export async function split(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const { pages } = req.body; // optional array of specific page numbers to split

    const fileRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'PDF file not found.' });
    }

    const pdfFile = fileRes.rows[0];
    const splitResult = await splitPdf(pdfFile.file_path, uploadDir, pages);

    const createdRecords = [];
    for (const item of splitResult.files) {
      const sha256 = await calculateSha256(item.filePath);
      const originalTitle = `${path.basename(pdfFile.original_name, '.pdf')}_page_${item.pageNumber}.pdf`;

      const inserted = await query(
        `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
         VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 'pdfs', 'pdf', $7) RETURNING *`,
        [req.user.id, pdfFile.folder_id, item.filename, originalTitle, item.filePath, item.fileSize, sha256]
      );

      await query(`INSERT INTO file_metadata (file_id, page_count) VALUES ($1, 1)`, [inserted.rows[0].id]);
      createdRecords.push(inserted.rows[0]);
    }

    await recalculateUserStorage(req.user.id);
    await logActivity(req.user.id, 'process', 'pdf', fileId, { type: 'split', createdFiles: createdRecords.length });

    return res.json({
      success: true,
      message: `Split PDF into ${createdRecords.length} individual pages.`,
      files: createdRecords
    });
  } catch (err) {
    console.error('PDF split error:', err);
    return res.status(500).json({ success: false, message: `PDF split failed: ${err.message}` });
  }
}

export async function extract(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const { pageNumbers, outputTitle = 'Extracted_Pages.pdf' } = req.body;

    if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) {
      return res.status(400).json({ success: false, message: 'pageNumbers array is required (e.g. [1, 2, 5]).' });
    }

    const fileRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'PDF file not found.' });
    }

    const pdfFile = fileRes.rows[0];
    const outFilename = `extracted_${Date.now()}_${Math.round(Math.random() * 1e4)}.pdf`;
    const outPath = path.join(uploadDir, outFilename);

    const extractResult = await extractPdfPages(pdfFile.file_path, outPath, pageNumbers);
    const sha256 = await calculateSha256(outPath);

    const newFile = await query(
      `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 'pdfs', 'pdf', $7) RETURNING *`,
      [req.user.id, pdfFile.folder_id, outFilename, outputTitle, outPath, extractResult.fileSize, sha256]
    );

    await query(`INSERT INTO file_metadata (file_id, page_count) VALUES ($1, $2)`, [newFile.rows[0].id, extractResult.pageCount]);
    await recalculateUserStorage(req.user.id);

    return res.status(201).json({
      success: true,
      message: `Extracted ${extractResult.pageCount} page(s) successfully.`,
      file: newFile.rows[0]
    });
  } catch (err) {
    console.error('PDF extract error:', err);
    return res.status(500).json({ success: false, message: `PDF extraction failed: ${err.message}` });
  }
}

export async function reorder(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const { newOrder } = req.body; // e.g. [3, 1, 2]

    if (!Array.isArray(newOrder) || newOrder.length === 0) {
      return res.status(400).json({ success: false, message: 'newOrder array is required (e.g. [3, 1, 2]).' });
    }

    const fileRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'PDF file not found.' });
    }

    const pdfFile = fileRes.rows[0];
    const outFilename = `reordered_${Date.now()}_${Math.round(Math.random() * 1e4)}.pdf`;
    const outPath = path.join(uploadDir, outFilename);

    const result = await reorderPdfPages(pdfFile.file_path, outPath, newOrder);
    const sha256 = await calculateSha256(outPath);

    const newFile = await query(
      `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 'pdfs', 'pdf', $7) RETURNING *`,
      [req.user.id, pdfFile.folder_id, outFilename, `Reordered_${pdfFile.original_name}`, outPath, result.fileSize, sha256]
    );

    await query(`INSERT INTO file_metadata (file_id, page_count) VALUES ($1, $2)`, [newFile.rows[0].id, result.pageCount]);
    await recalculateUserStorage(req.user.id);

    return res.status(201).json({
      success: true,
      message: 'PDF pages reordered successfully.',
      file: newFile.rows[0]
    });
  } catch (err) {
    console.error('PDF reorder error:', err);
    return res.status(500).json({ success: false, message: `PDF reorder failed: ${err.message}` });
  }
}

export async function rotate(req, res) {
  try {
    const fileId = parseInt(req.params.id, 10);
    const { angle = 90, targetPages = [] } = req.body; // angle: 90, 180, 270

    const fileRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, req.user.id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'PDF file not found.' });
    }

    const pdfFile = fileRes.rows[0];
    const outFilename = `rotated_${Date.now()}_${Math.round(Math.random() * 1e4)}.pdf`;
    const outPath = path.join(uploadDir, outFilename);

    const result = await rotatePdfPages(pdfFile.file_path, outPath, angle, targetPages);
    const sha256 = await calculateSha256(outPath);

    const newFile = await query(
      `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 'pdfs', 'pdf', $7) RETURNING *`,
      [req.user.id, pdfFile.folder_id, outFilename, `Rotated_${pdfFile.original_name}`, outPath, result.fileSize, sha256]
    );

    await query(`INSERT INTO file_metadata (file_id, page_count) VALUES ($1, $2)`, [newFile.rows[0].id, result.pageCount]);
    await recalculateUserStorage(req.user.id);

    return res.status(201).json({
      success: true,
      message: `PDF pages rotated by ${angle} degrees.`,
      file: newFile.rows[0]
    });
  } catch (err) {
    console.error('PDF rotate error:', err);
    return res.status(500).json({ success: false, message: `PDF rotation failed: ${err.message}` });
  }
}

export async function convertImagesToPdf(req, res) {
  try {
    const { imageFileIds, outputTitle = 'Converted_Photos.pdf' } = req.body;
    if (!Array.isArray(imageFileIds) || imageFileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'imageFileIds array is required.' });
    }

    const filesRes = await query(
      `SELECT id, file_path, original_name FROM files
       WHERE id = ANY($1::int[]) AND user_id = $2 AND file_category = 'photos'`,
      [imageFileIds.map(Number), req.user.id]
    );

    if (filesRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid photos found for conversion.' });
    }

    const imagePaths = imageFileIds
      .map(id => filesRes.rows.find(f => f.id === Number(id))?.file_path)
      .filter(Boolean);

    const outFilename = `img2pdf_${Date.now()}_${Math.round(Math.random() * 1e4)}.pdf`;
    const outPath = path.join(uploadDir, outFilename);

    const result = await imagesToPdf(imagePaths, outPath);
    const sha256 = await calculateSha256(outPath);

    const newFile = await query(
      `INSERT INTO files (user_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
       VALUES ($1, $2, $3, $4, $5, 'application/pdf', 'pdfs', 'pdf', $6) RETURNING *`,
      [req.user.id, outFilename, outputTitle, outPath, result.fileSize, sha256]
    );

    await query(`INSERT INTO file_metadata (file_id, page_count) VALUES ($1, $2)`, [newFile.rows[0].id, result.pageCount]);
    await recalculateUserStorage(req.user.id);

    return res.status(201).json({
      success: true,
      message: `Converted ${imagePaths.length} photo(s) into PDF.`,
      file: newFile.rows[0]
    });
  } catch (err) {
    console.error('convertImagesToPdf error:', err);
    return res.status(500).json({ success: false, message: `Images to PDF conversion failed: ${err.message}` });
  }
}

