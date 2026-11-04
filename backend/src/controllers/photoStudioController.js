import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { query } from '../database/db.js';
import * as compositionService from '../services/compositionService.js';
import { saveBufferAsMediaVaultFile } from '../utils/vaultFileSaver.js';

// -------------------------------------------------------------
// 1. PROJECTS CRUD
// -------------------------------------------------------------
export async function saveProject(req, res, next) {
  try {
    const {
      id,
      name = 'Untitled Studio Design',
      width = 1080,
      height = 1080,
      backgroundColor = '#ffffff',
      thumbnailData = null,
      canvasData = {},
      layers = []
    } = req.body;

    let project;
    if (id) {
      // Update existing project
      const updateRes = await query(
        `UPDATE photo_projects
         SET name = $1, width = $2, height = $3, background_color = $4,
             thumbnail_url = COALESCE($5, thumbnail_url),
             canvas_data = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [name, width, height, backgroundColor, thumbnailData, JSON.stringify(canvasData), id, req.user.id]
      );
      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }
      project = updateRes.rows[0];

      // Replace layers
      await query('DELETE FROM photo_layers WHERE project_id = $1', [project.id]);
    } else {
      // Create new project
      const insertRes = await query(
        `INSERT INTO photo_projects (user_id, name, width, height, background_color, thumbnail_url, canvas_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, name, width, height, backgroundColor, thumbnailData, JSON.stringify(canvasData)]
      );
      project = insertRes.rows[0];
    }

    // Insert layers if provided
    if (Array.isArray(layers) && layers.length > 0) {
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        await query(
          `INSERT INTO photo_layers (project_id, layer_type, name, z_index, properties, is_visible, is_locked)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            project.id,
            l.type || 'layer',
            l.name || `Layer ${i + 1}`,
            l.zIndex || i,
            JSON.stringify(l),
            l.visible !== false,
            l.locked === true
          ]
        );
      }
    }

    res.json({
      success: true,
      message: 'Studio project saved successfully.',
      project
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjects(req, res, next) {
  try {
    const result = await query(
      `SELECT p.*, COUNT(l.id)::int as layer_count
       FROM photo_projects p
       LEFT JOIN photo_layers l ON p.id = l.project_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      projects: result.rows
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;
    const projRes = await query(
      'SELECT * FROM photo_projects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (projRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const layersRes = await query(
      'SELECT * FROM photo_layers WHERE project_id = $1 ORDER BY z_index ASC',
      [id]
    );

    res.json({
      success: true,
      project: projRes.rows[0],
      layers: layersRes.rows
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM photo_projects WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 2. TEMPLATES
// -------------------------------------------------------------
export async function getTemplates(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM image_templates ORDER BY id ASC'
    );
    res.json({
      success: true,
      templates: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 3. IMAGE MERGE & COLLAGE
// -------------------------------------------------------------
export async function mergeImages(req, res, next) {
  try {
    const { fileIds = [], mode = 'horizontal', gap = 12, backgroundColor = '#ffffff', saveToVault = true } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length < 2) {
      return res.status(400).json({ success: false, message: 'At least two files must be selected for merging.' });
    }

    const filesRes = await query(
      `SELECT * FROM files WHERE id = ANY($1::int[]) AND user_id = $2 AND is_trashed = false`,
      [fileIds, req.user.id]
    );

    if (filesRes.rows.length < 2) {
      return res.status(404).json({ success: false, message: 'Selected images could not be loaded.' });
    }

    const imagePaths = filesRes.rows.map(f => f.file_path);
    const result = await compositionService.mergeImages(imagePaths, mode, {
      gap: parseInt(gap) || 0,
      backgroundColor
    });

    const outputName = `merged-${mode}-${Date.now()}.jpg`;
    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: `Merged ${imagePaths.length} photos (${mode})` }
      );
    }

    const previewUrl = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'Images merged successfully.',
      file: savedFile,
      previewUrl,
      width: result.width,
      height: result.height
    });
  } catch (err) {
    next(err);
  }
}

export async function createCollage(req, res, next) {
  try {
    const {
      fileIds = [],
      layout = '2x2',
      canvasWidth = 1200,
      canvasHeight = 1200,
      gap = 16,
      cornerRadius = 16,
      backgroundColor = '#ffffff',
      saveToVault = true
    } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select photos for the collage.' });
    }

    const filesRes = await query(
      `SELECT * FROM files WHERE id = ANY($1::int[]) AND user_id = $2 AND is_trashed = false`,
      [fileIds, req.user.id]
    );

    if (filesRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected images could not be loaded.' });
    }

    const imagePaths = filesRes.rows.map(f => f.file_path);
    const result = await compositionService.createCollage(imagePaths, layout, {
      canvasWidth: parseInt(canvasWidth) || 1200,
      canvasHeight: parseInt(canvasHeight) || 1200,
      gap: parseInt(gap) || 16,
      cornerRadius: parseInt(cornerRadius) || 16,
      backgroundColor
    });

    const outputName = `collage-${layout}-${Date.now()}.jpg`;
    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        result.buffer,
        outputName,
        { summary: `Collage layout: ${layout}` }
      );
    }

    const previewUrl = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'Collage created successfully.',
      file: savedFile,
      previewUrl,
      width: result.width,
      height: result.height
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 4. CANVAS EXPORT (PNG, JPG, WebP, PDF)
// -------------------------------------------------------------
export async function exportStudioDesign(req, res, next) {
  try {
    const {
      dataUrl,
      name = 'studio-export',
      format = 'png', // 'png', 'jpg', 'jpeg', 'webp', 'pdf'
      quality = 95,
      saveToVault = true
    } = req.body;

    if (!dataUrl) {
      return res.status(400).json({ success: false, message: 'Missing canvas image data.' });
    }

    // Strip data prefix
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const rawBuffer = Buffer.from(base64Data, 'base64');

    let outputBuffer;
    let mimeType;
    let ext;

    const normalizedFmt = format.toLowerCase().replace('.', '');
    if (normalizedFmt === 'pdf') {
      // Wrap raster design inside PDF document
      const pdfDoc = await PDFDocument.create();
      const sharpJpg = await sharp(rawBuffer).jpeg({ quality: 95 }).toBuffer();
      const meta = await sharp(sharpJpg).metadata();
      const imageEmbed = await pdfDoc.embedJpg(sharpJpg);

      const page = pdfDoc.addPage([meta.width, meta.height]);
      page.drawImage(imageEmbed, {
        x: 0,
        y: 0,
        width: meta.width,
        height: meta.height
      });

      const pdfBytes = await pdfDoc.save();
      outputBuffer = Buffer.from(pdfBytes);
      mimeType = 'application/pdf';
      ext = 'pdf';
    } else if (normalizedFmt === 'jpg' || normalizedFmt === 'jpeg') {
      outputBuffer = await sharp(rawBuffer).jpeg({ quality: parseInt(quality) || 95 }).toBuffer();
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else if (normalizedFmt === 'webp') {
      outputBuffer = await sharp(rawBuffer).webp({ quality: parseInt(quality) || 95 }).toBuffer();
      mimeType = 'image/webp';
      ext = 'webp';
    } else {
      // Default PNG
      outputBuffer = await sharp(rawBuffer).png({ compressionLevel: 8 }).toBuffer();
      mimeType = 'image/png';
      ext = 'png';
    }

    const cleanBaseName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = `${cleanBaseName}.${ext}`;

    let savedFile = null;
    if (saveToVault) {
      savedFile = await saveBufferAsMediaVaultFile(
        req.user.id,
        outputBuffer,
        finalFilename,
        {
          summary: `Exported from Creative Studio (${ext.toUpperCase()})`,
          categoryOverride: ext === 'pdf' ? 'pdfs' : 'photos'
        }
      );
    }

    const resultBase64 = `data:${mimeType};base64,${outputBuffer.toString('base64')}`;

    res.json({
      success: true,
      message: `Design exported as ${ext.toUpperCase()}.`,
      file: savedFile,
      downloadUrl: resultBase64,
      filename: finalFilename
    });
  } catch (err) {
    next(err);
  }
}

