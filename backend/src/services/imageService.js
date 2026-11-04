import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Extract comprehensive metadata from an image
 */
export async function getImageMetadata(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return {
      width: meta.width || null,
      height: meta.height || null,
      format: meta.format || null,
      space: meta.space || null,
      channels: meta.channels || null,
      depth: meta.depth || null,
      density: meta.density || null,
      hasAlpha: meta.hasAlpha || false,
      orientation: meta.orientation || null,
      exif: meta.exif ? { hasExif: true } : {}
    };
  } catch (error) {
    return { width: null, height: null, format: null, exif: {} };
  }
}

/**
 * Process image with extensive pipeline:
 * transformations: {
 *   crop: { left, top, width, height },
 *   resize: { width, height, fit },
 *   rotate: number,
 *   flip: boolean, // vertical
 *   flop: boolean, // horizontal
 *   brightness: number, // 0.1 to 3.0 (1.0 is default)
 *   contrast: number, // 0.1 to 3.0 (1.0 is default)
 *   saturation: number, // 0.0 to 3.0 (1.0 is default)
 *   filter: 'grayscale' | 'sepia' | 'invert' | 'blur' | 'sharpen' | 'vintage' | 'none',
 *   blurRadius: number,
 *   sharpenAmount: number,
 *   watermark: { text, color, fontSize, position, opacity },
 *   backgroundBlur: boolean,
 *   enhance: boolean,
 *   format: 'jpeg' | 'png' | 'webp' | 'avif',
 *   quality: number // 1 to 100
 * }
 */
export async function processImage(inputPath, outputPath, options = {}) {
  let pipeline = sharp(inputPath);

  // 1. Auto orient by EXIF first
  pipeline = pipeline.rotate();

  // 2. Crop
  if (options.crop && options.crop.width && options.crop.height) {
    pipeline = pipeline.extract({
      left: Math.max(0, Math.round(options.crop.left || 0)),
      top: Math.max(0, Math.round(options.crop.top || 0)),
      width: Math.round(options.crop.width),
      height: Math.round(options.crop.height)
    });
  }

  // 3. Resize
  if (options.resize && (options.resize.width || options.resize.height)) {
    pipeline = pipeline.resize({
      width: options.resize.width ? Math.round(options.resize.width) : null,
      height: options.resize.height ? Math.round(options.resize.height) : null,
      fit: options.resize.fit || 'inside',
      withoutEnlargement: options.resize.withoutEnlargement !== false
    });
  }

  // 4. Rotation
  if (options.rotate && typeof options.rotate === 'number') {
    pipeline = pipeline.rotate(options.rotate);
  }

  // 5. Flip & Flop
  if (options.flip) {
    pipeline = pipeline.flip(); // vertical
  }
  if (options.flop) {
    pipeline = pipeline.flop(); // horizontal
  }

  // 6. Color Adjustments: Brightness & Saturation
  if (options.brightness !== undefined || options.saturation !== undefined) {
    pipeline = pipeline.modulate({
      brightness: options.brightness !== undefined ? Number(options.brightness) : 1,
      saturation: options.saturation !== undefined ? Number(options.saturation) : 1
    });
  }

  // 7. Contrast Adjustment
  if (options.contrast !== undefined && Number(options.contrast) !== 1) {
    const c = Number(options.contrast);
    // Linear contrast scaling: f(x) = a * x + b
    const a = c;
    const b = 128 * (1 - c);
    pipeline = pipeline.linear(a, b);
  }

  // 8. Preset Filters
  if (options.filter) {
    switch (options.filter) {
      case 'grayscale':
        pipeline = pipeline.grayscale();
        break;
      case 'invert':
        pipeline = pipeline.negate({ alpha: false });
        break;
      case 'sepia':
        pipeline = pipeline.recomb([
          [0.393, 0.769, 0.189],
          [0.349, 0.686, 0.168],
          [0.272, 0.534, 0.131]
        ]);
        break;
      case 'vintage':
        pipeline = pipeline
          .modulate({ brightness: 1.05, saturation: 0.85 })
          .tint({ r: 240, g: 215, b: 175 });
        break;
      case 'blur':
        pipeline = pipeline.blur(options.blurRadius ? Math.min(50, Math.max(0.3, options.blurRadius)) : 5);
        break;
      case 'sharpen':
        pipeline = pipeline.sharpen(options.sharpenAmount || 2);
        break;
      default:
        break;
    }
  }

  // 9. Independent blur / sharpen if requested
  if (options.blur && !options.filter) {
    pipeline = pipeline.blur(Math.min(50, Math.max(0.3, options.blur)));
  }
  if (options.sharpen && !options.filter) {
    pipeline = pipeline.sharpen(options.sharpen);
  }

  // 10. Quality Enhancement (normalize dynamic range and gentle sharpening)
  if (options.enhance) {
    pipeline = pipeline.normalise().sharpen({ sigma: 1, m1: 1.5, m2: 0.7 });
  }

  // 11. Watermark Addition
  if (options.watermark && options.watermark.text) {
    const text = options.watermark.text;
    const inMeta = await getImageMetadata(inputPath);
    const imgW = inMeta.width || 800;
    const imgH = inMeta.height || 600;

    const wmWidth = Math.min(imgW, Math.max(80, Math.round(imgW * 0.6)));
    const wmHeight = Math.min(imgH, Math.max(30, Math.round(imgH * 0.2)));
    const fontSize = Math.max(12, Math.min(Math.round(wmHeight * 0.5), Math.round(wmWidth / Math.max(1, text.length * 0.7))));
    const opacity = options.watermark.opacity || 0.6;
    const color = options.watermark.color || '#ffffff';

    const svgWatermark = `
      <svg width="${wmWidth}" height="${wmHeight}">
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
          fill="${color}" fill-opacity="${opacity}" stroke="#000000" stroke-width="1" stroke-opacity="${opacity * 0.5}">
          ${text.replace(/[<>&]/g, '')}
        </text>
      </svg>
    `;

    const gravityMap = {
      center: 'centre',
      bottomRight: 'southeast',
      bottomLeft: 'southwest',
      topRight: 'northeast',
      topLeft: 'northwest'
    };

    pipeline = pipeline.composite([
      {
        input: Buffer.from(svgWatermark),
        gravity: gravityMap[options.watermark.position] || 'southeast'
      }
    ]);
  }

  // 12. Output Format and Quality Compression
  const quality = options.quality ? Math.min(100, Math.max(1, Number(options.quality))) : 85;
  const targetFormat = (options.format || 'jpeg').toLowerCase();

  switch (targetFormat) {
    case 'png':
      pipeline = pipeline.png({ quality: Math.round(quality), compressionLevel: 9 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: Math.round(quality), effort: 4 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: Math.round(quality) });
      break;
    case 'jpg':
    case 'jpeg':
    default:
      pipeline = pipeline.jpeg({ quality: Math.round(quality), mozjpeg: true });
      break;
  }

  await pipeline.toFile(outputPath);
  const outStats = fs.statSync(outputPath);
  const outMeta = await getImageMetadata(outputPath);

  return {
    filePath: outputPath,
    fileSize: outStats.size,
    format: targetFormat,
    width: outMeta.width,
    height: outMeta.height
  };
}
