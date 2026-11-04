import fs from 'fs';
import path from 'path';
import { query } from '../database/db.js';
import * as aiService from '../services/aiService.js';
import { saveBufferAsMediaVaultFile } from '../utils/vaultFileSaver.js';

/**
 * Helper to resolve input file path from either an uploaded file or an existing fileId
 */
async function resolveInputPath(req) {
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
      throw new Error('Selected source file not found or unauthorized.');
    }
    return {
      filePath: res.rows[0].file_path,
      originalName: res.rows[0].original_name,
      fileId: res.rows[0].id,
      isUploaded: false
    };
  }

  throw new Error('Please select an existing photo or upload an image.');
}

// -------------------------------------------------------------
// 1. AI BACKGROUND REMOVAL
// -------------------------------------------------------------
export async function removeBackground(req, res, next) {
  try {
    const input = await resolveInputPath(req);
    const { saveToVault = true } = req.body;

    const result = await aiService.removeBackground(input.filePath);
    const baseName = path.parse(input.originalName).name;
    const outputName = `${baseName}-no-bg.png`;

    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: 'AI Background Removal (Transparent PNG)' }
      );
    }

    // Record job
    await query(
      `INSERT INTO ai_processing_jobs (user_id, job_type, source_file_id, output_file_id, status, parameters, result_metadata)
       VALUES ($1, 'remove_bg', $2, $3, 'completed', $4, $5)`,
      [
        req.user.id,
        input.fileId || null,
        savedFile ? savedFile.id : null,
        JSON.stringify({ originalName: input.originalName }),
        JSON.stringify({ width: result.width, height: result.height, format: 'png' })
      ]
    );

    const base64Data = `data:image/png;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'Background successfully removed.',
      file: savedFile,
      previewUrl: base64Data,
      width: result.width,
      height: result.height
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 2. AI BACKGROUND GENERATOR & SCENE COMPOSITING
// -------------------------------------------------------------
export async function generateBackground(req, res, next) {
  try {
    const {
      prompt,
      subjectFileId,
      position = 'center',
      scale = 0.8,
      width = 1080,
      height = 1080,
      saveToVault = true
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a background description prompt.' });
    }

    // 1. Generate new background
    const bgResult = await aiService.generateBackground(prompt.trim(), width, height);

    let finalBuffer = bgResult.buffer;
    let finalWidth = bgResult.width;
    let finalHeight = bgResult.height;

    // 2. If subject provided, composite it onto the generated background
    if (subjectFileId) {
      const subRes = await query(
        'SELECT * FROM files WHERE id = $1 AND user_id = $2 AND is_trashed = false',
        [subjectFileId, req.user.id]
      );
      if (subRes.rows.length > 0) {
        const subPath = subRes.rows[0].file_path;
        // Check if subject is already transparent or needs bg removal
        let subjectBuffer;
        if (subRes.rows[0].extension.toLowerCase() === 'png') {
          subjectBuffer = fs.readFileSync(subPath);
        } else {
          const removed = await aiService.removeBackground(subPath);
          subjectBuffer = removed.buffer;
        }

        const compResult = await aiService.compositeSubjectOnBackground(subjectBuffer, bgResult.buffer, {
          position,
          scale: parseFloat(scale) || 0.8
        });
        finalBuffer = compResult.buffer;
        finalWidth = compResult.width;
        finalHeight = compResult.height;
      }
    }

    const outputName = `ai-bg-${Date.now()}.jpg`;
    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        finalBuffer,
        outputName,
        { summary: `AI Generated Background: "${prompt.slice(0, 40)}..."` }
      );
    }

    // Record in history & jobs
    await query(
      `INSERT INTO ai_generation_history (user_id, prompt, model_provider, generation_type, output_file_id, parameters)
       VALUES ($1, $2, $3, 'bg_generation', $4, $5)`,
      [
        req.user.id,
        prompt.trim(),
        bgResult.provider,
        savedFile ? savedFile.id : null,
        JSON.stringify({ position, scale, subjectFileId })
      ]
    );

    const base64Data = `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'AI background generated successfully.',
      file: savedFile,
      previewUrl: base64Data,
      width: finalWidth,
      height: finalHeight,
      provider: bgResult.provider
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 3. AI IMAGE GENERATION (Text-to-Image)
// -------------------------------------------------------------
export async function generateImage(req, res, next) {
  try {
    const {
      prompt,
      style = 'cinematic',
      aspectRatio = '1:1',
      negativePrompt = '',
      saveToVault = true
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a text prompt for image generation.' });
    }

    const result = await aiService.generateImage(prompt.trim(), {
      style,
      aspectRatio,
      negativePrompt
    });

    const outputName = `ai-gen-${style}-${Date.now()}.jpg`;
    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: `AI Generated: "${prompt.slice(0, 40)}..." (${style})` }
      );
    }

    await query(
      `INSERT INTO ai_generation_history (user_id, prompt, negative_prompt, model_provider, generation_type, output_file_id, parameters)
       VALUES ($1, $2, $3, $4, 'text_to_image', $5, $6)`,
      [
        req.user.id,
        prompt.trim(),
        negativePrompt || null,
        result.provider,
        savedFile ? savedFile.id : null,
        JSON.stringify({ style, aspectRatio })
      ]
    );

    const base64Data = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'AI Image generated successfully.',
      file: savedFile,
      previewUrl: base64Data,
      width: result.width,
      height: result.height,
      provider: result.provider
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 4. AI IMAGE-TO-IMAGE TRANSFORMATION
// -------------------------------------------------------------
export async function transformImage(req, res, next) {
  try {
    const input = await resolveInputPath(req);
    const { style = 'anime', customPrompt = '', saveToVault = true } = req.body;

    const result = await aiService.transformImage(input.filePath, style, customPrompt);
    const baseName = path.parse(input.originalName).name;
    const outputName = `${baseName}-${style}.jpg`;

    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: `AI Style Transformation: ${style}` }
      );
    }

    await query(
      `INSERT INTO ai_processing_jobs (user_id, job_type, source_file_id, output_file_id, status, parameters)
       VALUES ($1, 'transform_image', $2, $3, 'completed', $4)`,
      [
        req.user.id,
        input.fileId || null,
        savedFile ? savedFile.id : null,
        JSON.stringify({ style, customPrompt })
      ]
    );

    const base64Data = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: `Image transformed into ${style} style.`,
      file: savedFile,
      previewUrl: base64Data,
      width: result.width,
      height: result.height,
      style
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 5. AI OBJECT REMOVAL / INPAINTING
// -------------------------------------------------------------
export async function removeObject(req, res, next) {
  try {
    const input = await resolveInputPath(req);
    const { maskArea, saveToVault = true } = req.body;

    const parsedMask = typeof maskArea === 'string' ? JSON.parse(maskArea) : maskArea;
    const result = await aiService.removeObject(input.filePath, parsedMask || {});

    const baseName = path.parse(input.originalName).name;
    const outputName = `${baseName}-inpainted.jpg`;

    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: 'AI Object Removal & Inpainting' }
      );
    }

    await query(
      `INSERT INTO ai_processing_jobs (user_id, job_type, source_file_id, output_file_id, status, parameters)
       VALUES ($1, 'inpainting', $2, $3, 'completed', $4)`,
      [
        req.user.id,
        input.fileId || null,
        savedFile ? savedFile.id : null,
        JSON.stringify({ maskArea: parsedMask })
      ]
    );

    const base64Data = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'Object removed and background seamlessly reconstructed.',
      file: savedFile,
      previewUrl: base64Data,
      width: result.width,
      height: result.height
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 6. AI IMAGE ENHANCEMENT
// -------------------------------------------------------------
export async function enhanceImage(req, res, next) {
  try {
    const input = await resolveInputPath(req);
    const { mode = 'upscale_2x', saveToVault = true } = req.body;

    const result = await aiService.enhanceImage(input.filePath, mode);
    const baseName = path.parse(input.originalName).name;
    const outputName = `${baseName}-${mode}.jpg`;

    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: `AI Enhanced: ${mode}` }
      );
    }

    await query(
      `INSERT INTO ai_processing_jobs (user_id, job_type, source_file_id, output_file_id, status, parameters)
       VALUES ($1, 'enhance', $2, $3, 'completed', $4)`,
      [
        req.user.id,
        input.fileId || null,
        savedFile ? savedFile.id : null,
        JSON.stringify({ mode })
      ]
    );

    const base64Data = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: `Image enhancement (${mode}) completed successfully.`,
      file: savedFile,
      previewUrl: base64Data,
      originalDimensions: `${result.originalWidth}×${result.originalHeight}`,
      enhancedDimensions: `${result.enhancedWidth}×${result.enhancedHeight}`,
      mode
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 7. AI SMART PHOTO ANALYSIS
// -------------------------------------------------------------
export async function analyzePhoto(req, res, next) {
  try {
    const input = await resolveInputPath(req);
    const analysis = await aiService.smartAnalyze(input.filePath);

    res.json({
      success: true,
      analysis
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 8. AI SMART EDITING ASSISTANT
// -------------------------------------------------------------
export async function smartEdit(req, res, next) {
  try {
    const input = await resolveInputPath(req);
    const { instruction, saveToVault = true } = req.body;

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide editing instructions.' });
    }

    const result = await aiService.smartEdit(input.filePath, instruction.trim());
    const baseName = path.parse(input.originalName).name;
    const outputName = `${baseName}-smart-edit.jpg`;

    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: `AI Smart Edit: "${instruction.slice(0, 40)}..."` }
      );
    }

    await query(
      `INSERT INTO ai_processing_jobs (user_id, job_type, source_file_id, output_file_id, status, parameters, result_metadata)
       VALUES ($1, 'smart_edit', $2, $3, 'completed', $4, $5)`,
      [
        req.user.id,
        input.fileId || null,
        savedFile ? savedFile.id : null,
        JSON.stringify({ instruction }),
        JSON.stringify({ applied: result.operationsApplied })
      ]
    );

    const base64Data = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: result.summary,
      operationsApplied: result.operationsApplied,
      file: savedFile,
      previewUrl: base64Data
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 9. AI HISTORY & JOBS
// -------------------------------------------------------------
export async function getAiHistory(req, res, next) {
  try {
    const generations = await query(
      `SELECT h.*, f.original_name, f.file_size
       FROM ai_generation_history h
       LEFT JOIN files f ON h.output_file_id = f.id
       WHERE h.user_id = $1
       ORDER BY h.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    const jobs = await query(
      `SELECT j.*, f.original_name, f.file_size
       FROM ai_processing_jobs j
       LEFT JOIN files f ON j.output_file_id = f.id
       WHERE j.user_id = $1
       ORDER BY j.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    res.json({
      success: true,
      history: generations.rows,
      jobs: jobs.rows
    });
  } catch (err) {
    next(err);
  }
}

