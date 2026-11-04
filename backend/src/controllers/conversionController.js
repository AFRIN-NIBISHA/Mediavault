import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as conversionService from '../services/conversionService.js';
import { saveBufferAsMediaVaultFile } from '../utils/vaultFileSaver.js';
import { query } from '../database/db.js';

// Resolve source file from req.file or req.body.fileId
async function resolveInput(req) {
  if (req.file && req.file.path) {
    return {
      filePath: req.file.path,
      originalName: req.file.originalname,
      isUploaded: true
    };
  }

  const fileId = req.body.fileId || req.query.fileId;
  if (fileId) {
    const res = await query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2 AND is_trashed = false',
      [fileId, req.user.id]
    );
    if (res.rows.length === 0) {
      throw new Error('Selected file not found or unauthorized.');
    }
    return {
      filePath: res.rows[0].file_path,
      originalName: res.rows[0].original_name,
      fileId: res.rows[0].id,
      isUploaded: false
    };
  }

  throw new Error('Please select or upload a file for conversion.');
}

/**
 * Universal File Converter
 */
export async function handleUniversalConvert(req, res, next) {
  try {
    const input = await resolveInput(req);
    const {
      targetFormat,
      saveToVault = true,
      options = {}
    } = req.body;

    if (!targetFormat) {
      return res.status(400).json({ success: false, message: 'Please specify targetFormat.' });
    }

    let opts = {};
    try {
      opts = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : (options || {});
    } catch (e) {
      opts = {};
    }

    const toolId = req.body.toolId || opts.toolId || '';
    const ext = path.extname(input.originalName).replace('.', '').toLowerCase();
    const cleanBaseName = path.parse(input.originalName).name;
    const normTarget = targetFormat.toLowerCase().replace('.', '');
    const isSticker = normTarget === 'sticker' ||
                      opts.asSticker ||
                      toolId === 'create-sticker' ||
                      toolId.includes('sticker');

    const outExt = isSticker ? 'webp' : normTarget;
    const outFilename = `${cleanBaseName}${isSticker ? '-sticker' : ''}.${outExt}`;
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const tempOutputPath = path.join(uploadDir, `converted-${Date.now()}-${uuidv4()}.${outExt}`);

    let resultMeta = {};

    // 1. PDF conversions
    if (ext === 'pdf') {
      if (normTarget === 'docx' || normTarget === 'doc') {
        resultMeta = await conversionService.convertPdfToWord(input.filePath, tempOutputPath);
      } else if (normTarget === 'xlsx' || normTarget === 'csv') {
        resultMeta = await conversionService.convertPdfToExcel(input.filePath, tempOutputPath);
      } else if (normTarget === 'txt') {
        resultMeta = await conversionService.convertPdfToTxt(input.filePath, tempOutputPath);
      } else if (normTarget === 'html') {
        resultMeta = await conversionService.convertPdfToHtml(input.filePath, tempOutputPath);
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(normTarget)) {
        resultMeta = await conversionService.convertImage(input.filePath, normTarget, tempOutputPath, options);
      } else {
        throw new Error(`Unsupported conversion from PDF to ${normTarget}`);
      }
    }
    // 2. Word conversions
    else if (ext === 'docx' || ext === 'doc') {
      if (normTarget === 'pdf') {
        resultMeta = await conversionService.convertWordToPdf(input.filePath, tempOutputPath);
      } else if (normTarget === 'html') {
        resultMeta = await conversionService.convertWordToHtml(input.filePath, tempOutputPath);
      } else if (normTarget === 'txt') {
        resultMeta = await conversionService.convertWordToTxt(input.filePath, tempOutputPath);
      } else if (normTarget === 'xlsx') {
        resultMeta = await conversionService.convertWordToExcel(input.filePath, tempOutputPath);
      } else {
        throw new Error(`Unsupported conversion from Word to ${normTarget}`);
      }
    }
    // 3. Excel conversions
    else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      resultMeta = await conversionService.convertExcel(input.filePath, normTarget, tempOutputPath);
    }
    // 4. PowerPoint conversions
    else if (ext === 'pptx' || ext === 'ppt') {
      resultMeta = await conversionService.convertPowerPoint(input.filePath, normTarget, tempOutputPath);
    }
    // 5. Image conversions & Stickers
    else if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'bmp'].includes(ext)) {
      if (isSticker) {
        resultMeta = await conversionService.createSticker(input.filePath, tempOutputPath, opts);
      } else {
        resultMeta = await conversionService.convertImage(input.filePath, normTarget, tempOutputPath, opts);
      }
    }
    // 6. GIF conversions
    else if (ext === 'gif') {
      if (normTarget === 'mp4') {
        resultMeta = await conversionService.convertGifToVideo(input.filePath, tempOutputPath);
      } else if (opts.reverse) {
        resultMeta = await conversionService.reverseGif(input.filePath, tempOutputPath);
      } else if (isSticker) {
        resultMeta = await conversionService.convertGifToSticker(input.filePath, tempOutputPath);
      } else {
        resultMeta = await conversionService.convertImage(input.filePath, normTarget, tempOutputPath, opts);
      }
    }
    // 7. Video conversions
    else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
      if (normTarget === 'gif') {
        resultMeta = await conversionService.convertVideoToGif(input.filePath, tempOutputPath, opts);
      } else if (normTarget === 'mp3' || normTarget === 'wav') {
        resultMeta = await conversionService.extractAudioFromVideo(input.filePath, tempOutputPath);
      } else {
        resultMeta = await conversionService.convertVideo(input.filePath, tempOutputPath, opts);
      }
    }
    // 8. Audio conversions
    else if (['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'].includes(ext)) {
      resultMeta = await conversionService.convertAudio(input.filePath, tempOutputPath, opts);
    } else {
      throw new Error(`Format .${ext} is currently unsupported for conversion to .${normTarget}`);
    }

    // Verify output file exists on disk
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Output conversion file was not created.');
    }

    const outputBuffer = fs.readFileSync(tempOutputPath);
    let savedFile = null;

    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        outputBuffer,
        outFilename,
        { summary: `Converted ${ext.toUpperCase()} to ${normTarget.toUpperCase()}` }
      );
    }

    // Log in processing_jobs
    await query(
      `INSERT INTO processing_jobs (user_id, job_type, status, progress_percent, output_file_id, output_metadata)
       VALUES ($1, 'universal_convert', 'completed', 100, $2, $3)`,
      [
        req.user.id,
        savedFile ? savedFile.id : null,
        JSON.stringify({ from: ext, to: normTarget, ...resultMeta })
      ]
    );

    const isImgOutput = ['webp', 'png', 'jpg', 'jpeg', 'gif'].includes(normTarget);
    const previewUrl = isImgOutput
      ? `data:image/${normTarget === 'jpg' ? 'jpeg' : normTarget};base64,${outputBuffer.toString('base64')}`
      : (savedFile ? `/api/files/${savedFile.id}/download` : null);

    res.json({
      success: true,
      message: `Successfully converted to ${normTarget.toUpperCase()}.`,
      file: savedFile,
      filename: outFilename,
      downloadUrl: savedFile ? `/api/files/${savedFile.id}/download` : null,
      previewUrl,
      metadata: resultMeta
    });
  } catch (err) {
    next(err);
  }
}

/**
 * OCR Text Extraction
 */
export async function handleOcr(req, res, next) {
  try {
    const input = await resolveInput(req);
    const { language = 'eng' } = req.body;

    const ocrResult = await conversionService.runOcr(input.filePath, language);

    res.json({
      success: true,
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      lines: ocrResult.lines
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Universal Compression
 */
export async function handleCompression(req, res, next) {
  try {
    const input = await resolveInput(req);
    const ext = path.extname(input.originalName).replace('.', '').toLowerCase();
    const cleanBase = path.parse(input.originalName).name;
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const outPath = path.join(uploadDir, `comp-${Date.now()}-${uuidv4()}.${ext}`);

    let compResult = {};
    if (ext === 'pdf') {
      compResult = await conversionService.compressPdf(input.filePath, outPath);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      compResult = await conversionService.convertImage(input.filePath, ext, outPath, { quality: 70 });
    } else if (['mp4', 'mov', 'webm'].includes(ext)) {
      compResult = await conversionService.convertVideo(input.filePath, outPath, { crf: 28 });
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      compResult = await conversionService.convertAudio(input.filePath, outPath, { bitrate: '128k' });
    } else {
      throw new Error(`Compression not supported for .${ext}`);
    }

    const outputBuffer = fs.readFileSync(outPath);
    const savedFile = await saveBufferAsMediaVaultFile(
      req.user.id,
      outputBuffer,
      `compressed-${input.originalName}`,
      { summary: `Compressed ${ext.toUpperCase()}` }
    );

    res.json({
      success: true,
      message: 'File compressed successfully.',
      file: savedFile,
      downloadUrl: `/api/files/${savedFile.id}/download`,
      ...compResult
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Tools Catalog for Instant Global Search
 */
export async function getToolsCatalog(req, res) {
  const tools = [
    // PDF Studio
    { id: 'pdf-to-word', studio: 'pdf', title: 'PDF to Word', desc: 'Convert PDF documents to editable Microsoft Word DOCX', from: 'pdf', to: 'docx' },
    { id: 'pdf-to-excel', studio: 'pdf', title: 'PDF to Excel', desc: 'Extract tabular data from PDF into XLSX spreadsheets', from: 'pdf', to: 'xlsx' },
    { id: 'pdf-to-txt', studio: 'pdf', title: 'PDF to Text', desc: 'Extract plaintext content from PDF files', from: 'pdf', to: 'txt' },
    { id: 'pdf-to-html', studio: 'pdf', title: 'PDF to HTML', desc: 'Convert PDF pages into semantic HTML webpages', from: 'pdf', to: 'html' },
    { id: 'pdf-compress', studio: 'pdf', title: 'PDF Compression', desc: 'Reduce PDF file size while retaining document clarity', from: 'pdf', to: 'pdf' },
    { id: 'pdf-watermark', studio: 'pdf', title: 'PDF Watermark', desc: 'Stamp custom confidentiality watermark on all pages', from: 'pdf', to: 'pdf' },

    // Word Studio
    { id: 'word-to-pdf', studio: 'word', title: 'Word to PDF', desc: 'Convert DOCX documents to standardized PDF format', from: 'docx', to: 'pdf' },
    { id: 'word-to-html', studio: 'word', title: 'Word to HTML', desc: 'Convert Word documents to clean web HTML', from: 'docx', to: 'html' },
    { id: 'word-to-txt', studio: 'word', title: 'Word to TXT', desc: 'Extract clean raw text from Word documents', from: 'docx', to: 'txt' },
    { id: 'word-to-excel', studio: 'word', title: 'Word to Excel', desc: 'Extract tables from Word document into Excel workbook', from: 'docx', to: 'xlsx' },

    // Excel Studio
    { id: 'excel-to-pdf', studio: 'excel', title: 'Excel to PDF', desc: 'Render spreadsheet tables into landscape PDF pages', from: 'xlsx', to: 'pdf' },
    { id: 'excel-to-csv', studio: 'excel', title: 'Excel to CSV', desc: 'Export spreadsheets as comma-separated values', from: 'xlsx', to: 'csv' },
    { id: 'excel-to-json', studio: 'excel', title: 'Excel to JSON', desc: 'Convert spreadsheet records into JSON format', from: 'xlsx', to: 'json' },
    { id: 'excel-to-xml', studio: 'excel', title: 'Excel to XML', desc: 'Export spreadsheet rows as structured XML schema', from: 'xlsx', to: 'xml' },
    { id: 'excel-to-html', studio: 'excel', title: 'Excel to HTML', desc: 'Generate responsive HTML table from spreadsheet', from: 'xlsx', to: 'html' },
    { id: 'excel-dedup', studio: 'excel', title: 'Remove Duplicate Rows', desc: 'Clean duplicate rows from any Excel spreadsheet', from: 'xlsx', to: 'xlsx' },

    // PowerPoint Studio
    { id: 'ppt-to-pdf', studio: 'powerpoint', title: 'PowerPoint to PDF', desc: 'Convert presentation slides into high-res PDF presentation', from: 'pptx', to: 'pdf' },
    { id: 'ppt-to-img', studio: 'powerpoint', title: 'PowerPoint to Image', desc: 'Extract and render presentation slide thumbnails as PNG', from: 'pptx', to: 'png' },

    // Image Studio
    { id: 'img-webp', studio: 'image', title: 'Image to WebP', desc: 'Next-gen web compression for JPG and PNG', from: 'jpg', to: 'webp' },
    { id: 'img-png', studio: 'image', title: 'Image to PNG', desc: 'Convert any image format to lossless PNG', from: 'webp', to: 'png' },
    { id: 'img-avif', studio: 'image', title: 'Image to AVIF', desc: 'Ultra high-efficiency AVIF compression', from: 'png', to: 'avif' },

    // GIF Studio
    { id: 'video-to-gif', studio: 'gif', title: 'Video to GIF', desc: 'Convert video clips into animated GIFs with custom FPS', from: 'mp4', to: 'gif' },
    { id: 'gif-to-video', studio: 'gif', title: 'GIF to MP4', desc: 'Convert animated GIF to smooth H.264 video', from: 'gif', to: 'mp4' },
    { id: 'gif-reverse', studio: 'gif', title: 'Reverse GIF', desc: 'Play animated GIF frames in reverse sequence', from: 'gif', to: 'gif' },

    // Sticker Studio
    { id: 'img-to-sticker', studio: 'sticker', title: 'Image to Sticker', desc: 'Create 512x512 transparent WebP sticker for WhatsApp/Telegram', from: 'png', to: 'webp' },

    // Audio Studio
    { id: 'audio-mp3', studio: 'audio', title: 'Audio to MP3', desc: 'Convert WAV, AAC, OGG, or FLAC to MP3', from: 'wav', to: 'mp3' },
    { id: 'audio-wav', studio: 'audio', title: 'Audio to WAV', desc: 'Convert audio to uncompressed studio WAV', from: 'mp3', to: 'wav' },
    { id: 'audio-compress', studio: 'audio', title: 'Compress Audio', desc: 'Optimize bitrate (128k/64k) to reduce audio file size', from: 'mp3', to: 'mp3' },

    // Video Studio
    { id: 'video-mp4', studio: 'video', title: 'Video to MP4', desc: 'Convert MOV, AVI, or WebM to universal MP4', from: 'mov', to: 'mp4' },
    { id: 'video-audio', studio: 'video', title: 'Extract Audio from Video', desc: 'Extract MP3 audio track from any video', from: 'mp4', to: 'mp3' },
    { id: 'video-compress', studio: 'video', title: 'Video Compression', desc: 'Reduce video file size using H.264 CRF encoding', from: 'mp4', to: 'mp4' },

    // Archive Studio
    { id: 'create-zip', studio: 'archive', title: 'Create ZIP Archive', desc: 'Bundle multiple files into compressed ZIP', from: '*', to: 'zip' },
    { id: 'extract-zip', studio: 'archive', title: 'Extract ZIP Archive', desc: 'Unpack ZIP contents into individual files', from: 'zip', to: '*' },

    // AI Studio
    { id: 'ai-ocr', studio: 'ai', title: 'AI Optical Character Recognition (OCR)', desc: 'Extract text from scanned documents and photos', from: 'png', to: 'txt' }
  ];

  res.json({ success: true, count: tools.length, tools });
}

/**
 * Create ZIP Archive from multiple files
 */
export async function handleCreateArchive(req, res, next) {
  try {
    let filePaths = [];
    if (req.files && req.files.length > 0) {
      filePaths = req.files.map(f => f.path);
    } else if (req.body.fileIds) {
      const ids = Array.isArray(req.body.fileIds) ? req.body.fileIds : JSON.parse(req.body.fileIds);
      const rows = await query('SELECT file_path FROM files WHERE id = ANY($1) AND user_id = $2', [ids, req.user.id]);
      filePaths = rows.rows.map(r => r.file_path);
    }

    if (filePaths.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one file to create an archive.' });
    }

    const archiveName = req.body.archiveName ? (req.body.archiveName.endsWith('.zip') ? req.body.archiveName : `${req.body.archiveName}.zip`) : `Archive-${Date.now()}.zip`;
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const outPath = path.join(uploadDir, `archive-${Date.now()}-${uuidv4()}.zip`);

    const archiveResult = await conversionService.createArchive(filePaths, outPath, 'zip');
    const buffer = fs.readFileSync(outPath);
    const savedFile = await saveBufferAsMediaVaultFile(
      req.user.id,
      buffer,
      archiveName,
      { summary: `ZIP Archive created with ${filePaths.length} files.` }
    );

    res.json({
      success: true,
      message: 'ZIP Archive created successfully.',
      file: savedFile,
      downloadUrl: `/api/files/${savedFile.id}/download`,
      fileCount: filePaths.length,
      size: archiveResult.totalBytes
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Extract ZIP Archive
 */
export async function handleExtractArchive(req, res, next) {
  try {
    const input = await resolveInput(req);
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const extractDir = path.join(uploadDir, `extracted-${Date.now()}-${uuidv4()}`);

    const extractResult = await conversionService.extractArchive(input.filePath, extractDir);

    // Save extracted files to user vault
    const savedFiles = [];
    for (const item of extractResult.extractedFiles) {
      const p = path.join(extractDir, item.filename);
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        const sf = await saveBufferAsMediaVaultFile(
          req.user.id,
          buf,
          item.filename,
          { summary: `Extracted from ${input.originalName}` }
        );
        savedFiles.push(sf);
      }
    }

    res.json({
      success: true,
      message: `Extracted ${savedFiles.length} files successfully.`,
      extractedFiles: savedFiles
    });
  } catch (err) {
    next(err);
  }
}
