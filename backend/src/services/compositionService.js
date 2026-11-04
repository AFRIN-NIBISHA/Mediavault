import sharp from 'sharp';

/**
 * Composition Service for MediaVault Photo Studio
 * Handles multi-image merging, collages, side-by-side comparisons, and layering.
 */

// -------------------------------------------------------------
// 1. MERGE MULTIPLE IMAGES
// -------------------------------------------------------------
export async function mergeImages(imagePaths = [], mode = 'horizontal', options = {}) {
  if (!imagePaths || imagePaths.length < 2) {
    throw new Error('At least two images are required for merging.');
  }

  const { gap = 0, backgroundColor = '#ffffff' } = options;
  const metas = await Promise.all(imagePaths.map(p => sharp(p).metadata()));

  if (mode === 'horizontal') {
    // Normalize to same height
    const targetHeight = Math.min(...metas.map(m => m.height));
    const resizedImages = await Promise.all(
      imagePaths.map(p => sharp(p).resize({ height: targetHeight }).toBuffer())
    );
    const resizedMetas = await Promise.all(resizedImages.map(b => sharp(b).metadata()));

    const totalWidth = resizedMetas.reduce((sum, m) => sum + m.width, 0) + (imagePaths.length - 1) * gap;

    let currentX = 0;
    const compositeList = [];
    for (let i = 0; i < resizedImages.length; i++) {
      compositeList.push({
        input: resizedImages[i],
        left: currentX,
        top: 0
      });
      currentX += resizedMetas[i].width + gap;
    }

    const merged = await sharp({
      create: {
        width: totalWidth,
        height: targetHeight,
        channels: 4,
        background: backgroundColor
      }
    })
      .composite(compositeList)
      .jpeg({ quality: 95 })
      .toBuffer();

    return { buffer: merged, width: totalWidth, height: targetHeight, format: 'jpeg' };
  } else if (mode === 'vertical') {
    // Normalize to same width
    const targetWidth = Math.min(...metas.map(m => m.width));
    const resizedImages = await Promise.all(
      imagePaths.map(p => sharp(p).resize({ width: targetWidth }).toBuffer())
    );
    const resizedMetas = await Promise.all(resizedImages.map(b => sharp(b).metadata()));

    const totalHeight = resizedMetas.reduce((sum, m) => sum + m.height, 0) + (imagePaths.length - 1) * gap;

    let currentY = 0;
    const compositeList = [];
    for (let i = 0; i < resizedImages.length; i++) {
      compositeList.push({
        input: resizedImages[i],
        left: 0,
        top: currentY
      });
      currentY += resizedMetas[i].height + gap;
    }

    const merged = await sharp({
      create: {
        width: targetWidth,
        height: totalHeight,
        channels: 4,
        background: backgroundColor
      }
    })
      .composite(compositeList)
      .jpeg({ quality: 95 })
      .toBuffer();

    return { buffer: merged, width: targetWidth, height: totalHeight, format: 'jpeg' };
  } else if (mode === 'grid') {
    // 2x2 grid or NxN
    const targetCell = 600;
    const resized = await Promise.all(
      imagePaths.slice(0, 4).map(p =>
        sharp(p)
          .resize(targetCell, targetCell, { fit: 'cover', position: 'center' })
          .toBuffer()
      )
    );

    const canvasWidth = targetCell * 2 + gap * 3;
    const canvasHeight = targetCell * 2 + gap * 3;

    const positions = [
      { left: gap, top: gap },
      { left: targetCell + gap * 2, top: gap },
      { left: gap, top: targetCell + gap * 2 },
      { left: targetCell + gap * 2, top: targetCell + gap * 2 }
    ];

    const compositeList = resized.map((img, i) => ({
      input: img,
      left: positions[i].left,
      top: positions[i].top
    }));

    const merged = await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: backgroundColor
      }
    })
      .composite(compositeList)
      .jpeg({ quality: 95 })
      .toBuffer();

    return { buffer: merged, width: canvasWidth, height: canvasHeight, format: 'jpeg' };
  }

  throw new Error(`Unsupported merge mode: ${mode}`);
}

// -------------------------------------------------------------
// 2. PHOTO COLLAGE MAKER
// -------------------------------------------------------------
export async function createCollage(imagePaths = [], layout = '2x2', options = {}) {
  const {
    canvasWidth = 1200,
    canvasHeight = 1200,
    gap = 16,
    cornerRadius = 16,
    backgroundColor = '#ffffff'
  } = options;

  if (!imagePaths || imagePaths.length === 0) {
    throw new Error('At least one image is required for a collage.');
  }

  // Pre-calculate cell bounding boxes depending on layout
  let cells = [];
  if (layout === '2x2') {
    const cellW = Math.round((canvasWidth - gap * 3) / 2);
    const cellH = Math.round((canvasHeight - gap * 3) / 2);
    cells = [
      { left: gap, top: gap, width: cellW, height: cellH },
      { left: gap * 2 + cellW, top: gap, width: cellW, height: cellH },
      { left: gap, top: gap * 2 + cellH, width: cellW, height: cellH },
      { left: gap * 2 + cellW, top: gap * 2 + cellH, width: cellW, height: cellH }
    ];
  } else if (layout === '1_top_2_bottom') {
    const topW = canvasWidth - gap * 2;
    const topH = Math.round((canvasHeight - gap * 3) * 0.55);
    const botW = Math.round((canvasWidth - gap * 3) / 2);
    const botH = canvasHeight - topH - gap * 3;
    cells = [
      { left: gap, top: gap, width: topW, height: topH },
      { left: gap, top: gap * 2 + topH, width: botW, height: botH },
      { left: gap * 2 + botW, top: gap * 2 + topH, width: botW, height: botH }
    ];
  } else if (layout === '3_vertical_strips') {
    const stripW = Math.round((canvasWidth - gap * 4) / 3);
    const stripH = canvasHeight - gap * 2;
    cells = [
      { left: gap, top: gap, width: stripW, height: stripH },
      { left: gap * 2 + stripW, top: gap, width: stripW, height: stripH },
      { left: gap * 3 + stripW * 2, top: gap, width: stripW, height: stripH }
    ];
  } else {
    // Default 2 horizontal split
    const splitW = Math.round((canvasWidth - gap * 3) / 2);
    const splitH = canvasHeight - gap * 2;
    cells = [
      { left: gap, top: gap, width: splitW, height: splitH },
      { left: gap * 2 + splitW, top: gap, width: splitW, height: splitH }
    ];
  }

  const compositeList = [];
  for (let i = 0; i < Math.min(imagePaths.length, cells.length); i++) {
    const cell = cells[i];
    let cellImg = sharp(imagePaths[i]).resize(cell.width, cell.height, {
      fit: 'cover',
      position: 'center'
    });

    // Rounded corners if requested
    if (cornerRadius > 0) {
      const rectSvg = Buffer.from(
        `<svg><rect x="0" y="0" width="${cell.width}" height="${cell.height}" rx="${cornerRadius}" ry="${cornerRadius}"/></svg>`
      );
      cellImg = cellImg.composite([{ input: rectSvg, blend: 'dest-in' }]);
    }

    const cellBuffer = await cellImg.png().toBuffer();
    compositeList.push({
      input: cellBuffer,
      left: cell.left,
      top: cell.top
    });
  }

  const collage = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: backgroundColor
    }
  })
    .composite(compositeList)
    .jpeg({ quality: 95 })
    .toBuffer();

  return { buffer: collage, width: canvasWidth, height: canvasHeight, format: 'jpeg' };
}

