import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import * as conversionService from './conversionService.js';
import * as aiService from './aiService.js';
import * as pdfService from './pdfService.js';

const TAMIL_NUMBERS = {
  'onnu': 1, 'oru': 1, 'one': 1, '1': 1, 'ஒன்று': 1, 'ஒரு': 1, 'first': 1, 'modhal': 1,
  'rendu': 2, 'irandu': 2, 'two': 2, '2': 2, 'இரண்டு': 2, 'second': 2, 'rendavathu': 2,
  'moonu': 3, 'moondru': 3, 'three': 3, '3': 3, 'மூன்று': 3, 'third': 3, 'moonavathu': 3,
  'naalu': 4, 'naanku': 4, 'four': 4, '4': 4, 'நான்கு': 4, 'fourth': 4,
  'anju': 5, 'ainthu': 5, 'five': 5, '5': 5, 'ஐந்து': 5, 'fifth': 5,
  'aaru': 6, 'six': 6, '6': 6, 'ஆறு': 6, 'sixth': 6,
  'ezhu': 7, 'seven': 7, '7': 7, 'ஏழு': 7, 'seventh': 7,
  'ettu': 8, 'eight': 8, '8': 8, 'எட்டு': 8, 'eighth': 8,
  'ombathu': 9, 'nine': 9, '9': 9, 'ஒன்பது': 9, 'ninth': 9,
  'pathu': 10, 'ten': 10, '10': 10, 'பத்து': 10, 'tenth': 10
};

export function extractNumberFromText(text = '') {
  const match = text.match(/\b(\d+)\b/);
  if (match) return parseInt(match[1], 10);
  const words = text.toLowerCase().split(/[\s,?.!_-]+/);
  for (const w of words) {
    if (TAMIL_NUMBERS[w]) return TAMIL_NUMBERS[w];
  }
  return 1;
}

/**
 * Detect language of input message (tanglish, tamil, or english)
 */
export function detectLanguage(text = '') {
  const lower = text.toLowerCase().trim();
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'tamil';
  }

  const tanglishMarkers = [
    'pannu', 'mathu', 'kudu', 'tha', 'thanga', 'kora', 'ethu', 'thirupu',
    'suthu', 'panni', 'podu', 'edukalam', 'venum', 'aaku', 'aahuthu',
    'itha', 'ithula', 'unga', 'enaku', 'enna', 'apdi', 'epdi', 'seri',
    'mudiyum', 'neekku', 'thooku', 'velicham', 'karupu', 'vellai', 'rendu',
    'onnu', 'moonu', 'naalu', 'anju', 'last', 'iruka', 'mattum'
  ];

  const words = lower.split(/[\s,?.!]+/);
  if (words.some(w => tanglishMarkers.includes(w))) {
    return 'tanglish';
  }

  return 'english';
}

/**
 * Multi-lingual Intent Parser for English, Tanglish, and Tamil
 */
export function parseIntent(message = '', fileMeta = {}) {
  const lower = message.toLowerCase().trim();
  const lang = detectLanguage(message);
  const ext = fileMeta.ext ? fileMeta.ext.toLowerCase().replace('.', '') : '';

  let intent = 'general_chat';
  let targetFormat = null;
  let params = {};

  const isPdf = ext === 'pdf';
  const hasPageKeywords =
    lower.includes('page') ||
    lower.includes('pages') ||
    lower.includes('certificate') ||
    lower.includes('sheet') ||
    lower.includes('sheets') ||
    lower.includes('pakka') ||
    lower.includes('பக்கம்') ||
    lower.includes('சான்றிதழ்');

  const hasRemoveKeywords =
    lower.includes('remove') ||
    lower.includes('delete') ||
    lower.includes('thooku') ||
    lower.includes('neekku') ||
    lower.includes('kora') ||
    lower.includes('erase') ||
    lower.includes('cut') ||
    lower.includes('நீக்கு');

  const hasLastKeywords =
    lower.includes('last') ||
    lower.includes('kadaisi') ||
    lower.includes('pinnala') ||
    lower.includes('final') ||
    lower.includes('கடைசி');

  const hasFirstKeywords =
    lower.includes('first') ||
    lower.includes('modhal') ||
    lower.includes('munnala') ||
    lower.includes('முதல்');

  // 1. PDF PAGE MANIPULATION (Remove/Extract last, first, or specific pages/certificates)
  if (isPdf && (hasRemoveKeywords || hasPageKeywords || hasLastKeywords || hasFirstKeywords)) {
    if (hasRemoveKeywords && hasLastKeywords) {
      intent = 'pdf_pages';
      targetFormat = 'pdf';
      params = { action: 'remove_last', count: extractNumberFromText(message) || 1 };
    } else if (hasRemoveKeywords && hasFirstKeywords) {
      intent = 'pdf_pages';
      targetFormat = 'pdf';
      params = { action: 'remove_first', count: extractNumberFromText(message) || 1 };
    } else if (hasRemoveKeywords && (message.match(/\b\d+\b/g) || hasPageKeywords)) {
      intent = 'pdf_pages';
      targetFormat = 'pdf';
      const numbers = (message.match(/\b\d+\b/g) || []).map(n => parseInt(n, 10));
      params = { action: 'remove_specific', specificPages: numbers.length > 0 ? numbers : [1] };
    } else if (lower.includes('extract') || lower.includes('mattum') || lower.includes('keep') || lower.includes('only')) {
      intent = 'pdf_pages';
      targetFormat = 'pdf';
      const rangeMatch = lower.match(/page[s]?\s*(\d+)\s*(?:to|-)\s*(\d+)/i);
      if (rangeMatch) {
        const s = parseInt(rangeMatch[1], 10);
        const e = parseInt(rangeMatch[2], 10);
        const specificPages = [];
        for (let p = Math.min(s, e); p <= Math.max(s, e); p++) specificPages.push(p);
        params = { action: 'extract_specific', specificPages };
      } else if (hasFirstKeywords) {
        params = { action: 'extract_first', count: extractNumberFromText(message) || 1 };
      } else {
        const numbers = (message.match(/\b\d+\b/g) || []).map(n => parseInt(n, 10));
        params = { action: 'extract_specific', specificPages: numbers.length > 0 ? numbers : [1] };
      }
    }
  }

  // 2. STICKER INTENTS
  if (
    intent === 'general_chat' &&
    (lower.includes('sticker') || lower.includes('ஸ்டிக்கர்') || lower.includes('stiker'))
  ) {
    intent = 'sticker';
    targetFormat = 'webp';
  }
  // 3. BACKGROUND REMOVAL INTENTS
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('background remove') ||
      lower.includes('remove background') ||
      lower.includes('remove bg') ||
      lower.includes('bg remove') ||
      lower.includes('erase background') ||
      lower.includes('pinnani neekku') ||
      lower.includes('bg thooku') ||
      lower.includes('பின்னணி') ||
      lower.includes('transparent aaku') ||
      lower.includes('transparent mathu')
    )
  ) {
    intent = 'remove_bg';
    targetFormat = 'png';
  }
  // 4. DOCUMENT CONVERSIONS
  // Word to PDF
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('word to pdf') || lower.includes('docx to pdf') ||
      (ext === 'docx' && (lower.includes('to pdf') || lower.includes('pdf ah') || lower.includes('pdf mathu'))) ||
      (lower.includes('வேர்ட்') && lower.includes('பிடிஎஃப்'))
    )
  ) {
    intent = 'convert_format';
    targetFormat = 'pdf';
  }
  // PDF to Word
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('pdf to word') || lower.includes('pdf to docx') ||
      (ext === 'pdf' && (lower.includes('to word') || lower.includes('to docx') || lower.includes('word ah') || lower.includes('word docx'))) ||
      lower.includes('editable word')
    )
  ) {
    intent = 'convert_format';
    targetFormat = 'docx';
  }
  // Excel to PDF / CSV / JSON
  else if (intent === 'general_chat' && (lower.includes('excel') || ext === 'xlsx' || ext === 'xls')) {
    if (lower.includes('csv')) {
      intent = 'convert_format';
      targetFormat = 'csv';
    } else if (lower.includes('json')) {
      intent = 'convert_format';
      targetFormat = 'json';
    } else {
      intent = 'convert_format';
      targetFormat = 'pdf';
    }
  }
  // PPT to PDF
  else if (intent === 'general_chat' && (lower.includes('powerpoint') || lower.includes('ppt') || ext === 'pptx')) {
    intent = 'convert_format';
    targetFormat = 'pdf';
  }
  // Generic to PDF
  else if (intent === 'general_chat' && (lower.includes('to pdf') || lower.includes('pdf ah mathu') || lower.includes('pdf mathi'))) {
    intent = 'convert_format';
    targetFormat = 'pdf';
  }
  // To PNG / JPG / WebP
  else if (intent === 'general_chat' && (lower.includes('to png') || lower.includes('png ah'))) {
    intent = 'convert_format';
    targetFormat = 'png';
  } else if (intent === 'general_chat' && (lower.includes('to jpg') || lower.includes('to jpeg') || lower.includes('jpg ah'))) {
    intent = 'convert_format';
    targetFormat = 'jpg';
  } else if (intent === 'general_chat' && (lower.includes('to webp') || lower.includes('webp ah'))) {
    intent = 'convert_format';
    targetFormat = 'webp';
  }
  // 5. IMAGE ADJUSTMENTS
  // Brightness
  else if (
    intent === 'general_chat' &&
    (lower.includes('brightness') || lower.includes('bright') || lower.includes('velicham') || lower.includes('பிரைட்'))
  ) {
    if (lower.includes('kora') || lower.includes('decrease') || lower.includes('dark') || lower.includes('dim')) {
      intent = 'darken';
    } else {
      intent = 'brighten';
    }
  }
  // Contrast
  else if (intent === 'general_chat' && (lower.includes('contrast') || lower.includes('கான்ட்ராஸ்ட்'))) {
    intent = 'contrast';
  }
  // Grayscale / Black & White
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('black and white') ||
      lower.includes('b&w') ||
      lower.includes('karupu vellai') ||
      lower.includes('grayscale') ||
      lower.includes('monochrome') ||
      lower.includes('கருப்பு வெள்ளை')
    )
  ) {
    intent = 'grayscale';
  }
  // Sepia / Vintage
  else if (intent === 'general_chat' && (lower.includes('sepia') || lower.includes('vintage') || lower.includes('retro'))) {
    intent = 'sepia';
  }
  // Sharpen
  else if (
    intent === 'general_chat' &&
    (lower.includes('sharpen') || lower.includes('sharp') || lower.includes('clear ah') || lower.includes('தெளிவு'))
  ) {
    intent = 'sharpen';
  }
  // Blur
  else if (intent === 'general_chat' && (lower.includes('blur') || lower.includes('மங்கலாக'))) {
    intent = 'blur';
  }
  // Rotate
  else if (intent === 'general_chat' && (lower.includes('rotate') || lower.includes('thirupu') || lower.includes('suthu') || lower.includes('சுழற்று'))) {
    intent = 'rotate';
    if (lower.includes('180')) params.angle = 180;
    else if (lower.includes('270')) params.angle = 270;
    else params.angle = 90;
  }
  // 6. COMPRESSION
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('compress') ||
      lower.includes('size reduce') ||
      lower.includes('size kora') ||
      lower.includes('chinnatha mathu') ||
      lower.includes('சுருக்கு')
    )
  ) {
    intent = 'compress';
  }
  // 7. WATERMARK
  else if (intent === 'general_chat' && (lower.includes('watermark') || lower.includes('வாட்டர்மார்க்'))) {
    intent = 'watermark';
    const match = message.match(/["']([^"']+)["']/) || message.match(/watermark\s+([A-Za-z0-9_-]+)/i);
    params.text = match ? match[1] : 'CONFIDENTIAL';
  }
  // 8. OCR / TEXT EXTRACTION
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('ocr') ||
      lower.includes('extract text') ||
      lower.includes('text extract') ||
      lower.includes('eluthu edukalam') ||
      lower.includes('read text') ||
      lower.includes('எழுத்து')
    )
  ) {
    intent = 'ocr';
  }

  return { intent, targetFormat, params, language: lang, originalText: message };
}

/**
 * Execute actual editing / conversion operation
 */
export async function executeAssistantAction(parsed, inputPath, originalName, uploadsDir) {
  const { intent, targetFormat, params } = parsed;
  const ext = path.extname(originalName).replace('.', '').toLowerCase();
  const cleanBase = path.parse(originalName).name;

  const timestamp = Date.now();
  let tempOutExt = targetFormat || ext;
  let outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}.${tempOutExt}`);
  let resultMeta = {};
  let operationTitle = '';

  // 1. PDF PAGE MANIPULATION (Remove/Extract pages/certificates)
  if (intent === 'pdf_pages') {
    const pdfInfo = await pdfService.getPdfInfo(inputPath);
    const totalPages = pdfInfo.pageCount || 1;
    let pagesToKeep = [];

    const { action, count = 1, specificPages = [] } = params;

    if (action === 'remove_last') {
      const keepCount = Math.max(1, totalPages - count);
      for (let i = 1; i <= keepCount; i++) pagesToKeep.push(i);
      operationTitle = `Removed Last ${count} Certificate/Page(s)`;
    } else if (action === 'remove_first') {
      for (let i = count + 1; i <= totalPages; i++) pagesToKeep.push(i);
      operationTitle = `Removed First ${count} Page(s)`;
    } else if (action === 'remove_specific') {
      for (let i = 1; i <= totalPages; i++) {
        if (!specificPages.includes(i)) pagesToKeep.push(i);
      }
      operationTitle = `Removed Page(s) ${specificPages.join(', ')}`;
    } else if (action === 'extract_specific') {
      pagesToKeep = specificPages.filter(p => p >= 1 && p <= totalPages);
      operationTitle = `Extracted Page(s) ${pagesToKeep.join(', ')}`;
    } else if (action === 'extract_first') {
      const keepCount = Math.min(totalPages, count);
      for (let i = 1; i <= keepCount; i++) pagesToKeep.push(i);
      operationTitle = `Extracted First ${keepCount} Pages`;
    }

    if (pagesToKeep.length === 0) {
      pagesToKeep = [1];
    }

    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-pages.pdf`);
    resultMeta = await pdfService.extractPdfPages(inputPath, outputPath, pagesToKeep);
    resultMeta.originalPages = totalPages;
    resultMeta.remainingPages = pagesToKeep.length;
    resultMeta.pagesKept = pagesToKeep;
    tempOutExt = 'pdf';
  }
  // 2. STICKER
  else if (intent === 'sticker') {
    operationTitle = 'Transparent Sticker Creation';
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-sticker.webp`);
    resultMeta = await conversionService.createSticker(inputPath, outputPath, {
      strokeWidth: 7,
      addBorder: true,
      quality: 95
    });
    tempOutExt = 'webp';
  }
  // 3. BACKGROUND REMOVAL
  else if (intent === 'remove_bg') {
    operationTitle = 'AI Background Removal';
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-no-bg.png`);
    const bgRes = await aiService.removeBackground(inputPath);
    fs.writeFileSync(outputPath, bgRes.buffer);
    resultMeta = { width: bgRes.width, height: bgRes.height, format: 'png', hasAlpha: true };
    tempOutExt = 'png';
  }
  // 4. FORMAT CONVERSIONS
  else if (intent === 'convert_format') {
    operationTitle = `Convert to ${targetFormat.toUpperCase()}`;
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}.${targetFormat}`);

    if (ext === 'docx' || ext === 'doc') {
      resultMeta = await conversionService.convertWordDocument(inputPath, targetFormat, outputPath);
    } else if (ext === 'pdf') {
      resultMeta = await conversionService.convertPdf(inputPath, targetFormat, outputPath);
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      resultMeta = await conversionService.convertSpreadsheet(inputPath, targetFormat, outputPath);
    } else if (['pptx', 'ppt'].includes(ext)) {
      resultMeta = await conversionService.convertPowerPoint(inputPath, targetFormat, outputPath);
    } else if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'bmp'].includes(ext)) {
      resultMeta = await conversionService.convertImage(inputPath, targetFormat, outputPath);
    } else {
      throw new Error(`Cannot convert from .${ext} to .${targetFormat}`);
    }
    tempOutExt = targetFormat;
  }
  // 5. IMAGE ADJUSTMENTS
  else if (['brighten', 'darken', 'contrast', 'grayscale', 'sepia', 'sharpen', 'blur', 'rotate'].includes(intent)) {
    let pipeline = sharp(inputPath);

    if (intent === 'brighten') {
      operationTitle = 'Brightness Boost (+25%)';
      pipeline = pipeline.modulate({ brightness: 1.25 });
    } else if (intent === 'darken') {
      operationTitle = 'Darken / Dim (-20%)';
      pipeline = pipeline.modulate({ brightness: 0.8 });
    } else if (intent === 'contrast') {
      operationTitle = 'Contrast Enhancement (+30%)';
      pipeline = pipeline.linear(1.3, -20);
    } else if (intent === 'grayscale') {
      operationTitle = 'Black & White Grayscale';
      pipeline = pipeline.grayscale();
    } else if (intent === 'sepia') {
      operationTitle = 'Vintage Sepia Filter';
      pipeline = pipeline.recomb([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131]
      ]);
    } else if (intent === 'sharpen') {
      operationTitle = 'High-Precision Sharpening';
      pipeline = pipeline.sharpen({ sigma: 1.8, m1: 2.0, m2: 3.5 });
    } else if (intent === 'blur') {
      operationTitle = 'Gaussian Blur (Soft Focus)';
      pipeline = pipeline.blur(5);
    } else if (intent === 'rotate') {
      const angle = params.angle || 90;
      operationTitle = `Rotate ${angle}° Clockwise`;
      pipeline = pipeline.rotate(angle);
    }

    tempOutExt = ext === 'jpg' ? 'jpeg' : (['png', 'webp'].includes(ext) ? ext : 'png');
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-edited.${tempOutExt === 'jpeg' ? 'jpg' : tempOutExt}`);

    if (tempOutExt === 'jpeg') {
      await pipeline.jpeg({ quality: 95 }).toFile(outputPath);
    } else if (tempOutExt === 'webp') {
      await pipeline.webp({ quality: 95 }).toFile(outputPath);
    } else {
      await pipeline.png().toFile(outputPath);
    }

    const meta = await sharp(outputPath).metadata();
    resultMeta = { width: meta.width, height: meta.height, format: meta.format };
  }
  // 6. COMPRESS
  else if (intent === 'compress') {
    operationTitle = 'Smart Compression';
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-compressed.${ext}`);

    if (ext === 'pdf') {
      resultMeta = await conversionService.compressPdf(inputPath, outputPath, 0.65);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      resultMeta = await conversionService.compressImage(inputPath, outputPath, 75);
    } else {
      resultMeta = await conversionService.compressFile(inputPath, outputPath);
    }
    tempOutExt = ext;
  }
  // 7. OCR
  else if (intent === 'ocr') {
    operationTitle = 'Optical Character Recognition (OCR)';
    const ocr = await conversionService.runOcr(inputPath, 'eng');
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-ocr.txt`);
    fs.writeFileSync(outputPath, ocr.text, 'utf8');
    resultMeta = { text: ocr.text, confidence: ocr.confidence, lines: ocr.lines };
    tempOutExt = 'txt';
  }
  // 8. WATERMARK
  else if (intent === 'watermark') {
    operationTitle = `Add Watermark "${params.text || 'CONFIDENTIAL'}"`;
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-watermarked.${ext}`);

    if (ext === 'pdf') {
      resultMeta = await conversionService.addWatermarkToPdf(inputPath, outputPath, params.text || 'CONFIDENTIAL');
    } else {
      resultMeta = await conversionService.watermarkImage(inputPath, outputPath, params.text || 'CONFIDENTIAL');
    }
    tempOutExt = ext;
  } else {
    throw new Error('Instruction not recognized. Please specify what you would like to edit or convert.');
  }

  const outFilename = path.basename(outputPath);
  const outStats = fs.statSync(outputPath);

  return {
    outputPath,
    outFilename,
    outExt: tempOutExt,
    size: outStats.size,
    operationTitle,
    metadata: resultMeta
  };
}

/**
 * Generate friendly conversational response in the requested language
 */
export function buildAssistantResponse(parsed, actionResult) {
  const { language, intent, params = {} } = parsed;
  const op = actionResult?.operationTitle || 'Operation';

  if (language === 'tanglish') {
    if (intent === 'pdf_pages') {
      if (params.action === 'remove_last') {
        return `Kandippa! Unga PDF-la iruntha last ${params.count || 2} certificate / pages-ah successfully remove panniten! Total-ah ${actionResult.metadata?.remainingPages || (actionResult.metadata?.originalPages - (params.count || 2))} pages ippo iruku. Keela iruka preview pathutu download pannikonga! 👍📄✨`;
      } else if (params.action === 'remove_first') {
        return `Unga PDF-la iruntha first ${params.count || 1} pages-ah remove panniten! Ippo ${actionResult.metadata?.remainingPages} pages ready-ah iruku. Download below! 📄✨`;
      } else if (params.action === 'remove_specific') {
        return `Unga PDF-la neenga sonna page(s) ${params.specificPages?.join(', ') || ''}-ah successfully remove panniten! Keela preview check pannikonga! 📄✨`;
      } else {
        return `Unga PDF pages-ah successfully extract panni mudichiten! (${actionResult.metadata?.remainingPages} pages). Check out the preview below! 📄✨`;
      }
    } else if (intent === 'sticker') {
      return `Kandippa! Unga photo-va WhatsApp & Telegram standard 512×512 Transparent Sticker-ah mathiten! White contour outline & soft shadow kooda serthu iruku. Keela iruka preview pathutu download pannikonga! 👍✨`;
    } else if (intent === 'remove_bg') {
      return `Unga image-la background-ah clean-ah remove panniten! Transparent PNG ready-ah iruku. Keela irunthu direct-ah download pannikalam! ✂️✨`;
    } else if (intent === 'convert_format') {
      return `Super! Unga document-ah ${actionResult.outExt.toUpperCase()}-ah convert panni mudichiten. Formatting & alignment ellamae neat-ah maintain aagi iruku. Check out the preview! 📄✨`;
    } else if (['brighten', 'darken', 'contrast', 'grayscale', 'sepia', 'sharpen', 'blur', 'rotate'].includes(intent)) {
      return `Done! Neenga ketta mathiri "${op}" edit panni mudichiten! Keela preview-la changes pathutu download pannikonga! 🎨✨`;
    } else if (intent === 'compress') {
      return `Unga file size-ah compress panni reduce panniten! Quality athigama affect aagatha mathiri optimize panni iruku. Download below! 🗜️✨`;
    } else if (intent === 'ocr') {
      return `Unga image/document-la iruntha text-ah successfully extract panniten! Keela text preview kooda download txt option iruku! 🔤✨`;
    } else if (intent === 'watermark') {
      return `Unga file-la watermark successfully add panniten! Keela preview check pannikonga! 🔒✨`;
    }
    return `Unga request-ku etha mathiri "${op}" successfully panni mudichiten! Output file download panna ready-ah iruku! 👍✨`;
  } else if (language === 'tamil') {
    if (intent === 'pdf_pages') {
      return `நிச்சயமாக! உங்கள் PDF ஆவணத்தில் கடைசி ${params.count || 2} பக்கங்கள்/சான்றிதழ்கள் வெற்றிகரமாக நீக்கப்பட்டுவிட்டன! தற்போது ${actionResult.metadata?.remainingPages} பக்கங்கள் உள்ளன. கீழே உள்ள மாதிரியைப் பார்த்துப் பதிவிறக்கிக் கொள்ளலாம்! 📄✨`;
    } else if (intent === 'sticker') {
      return `நிச்சயமாக! உங்கள் புகைப்படம் 512×512 வெளிப்படையான (Transparent) ஸ்டிக்கராக மாற்றப்பட்டது. வெள்ளை அவுட்லைன் பார்டருடன் தயாராக உள்ளது. கீழே உள்ள பிரிவியூவைச் சரிபார்த்துப் பதிவிறக்கிக் கொள்ளலாம்! 👍✨`;
    } else if (intent === 'remove_bg') {
      return `உங்கள் படத்தின் பின்னணி (Background) வெற்றிகரமாக நீக்கப்பட்டது. வெளிப்படையான PNG கோப்பு தயாராக உள்ளது! ✂️✨`;
    } else if (intent === 'convert_format') {
      return `அற்புதம்! உங்கள் ஆவணம் வெற்றிகரமாக ${actionResult.outExt.toUpperCase()} வடிவத்திற்கு மாற்றப்பட்டது. அலைன்மென்ட் மற்றும் வடிவமைப்பு துல்லியமாகப் பாதுகாக்கப்பட்டுள்ளது! 📄✨`;
    }
    return `முடிந்தது! நீங்கள் கோரிய "${op}" செயல்பாடு வெற்றிகரமாக முடிக்கப்பட்டது. உங்கள் கோப்பைக் கீழே இருந்து பதிவிறக்கிக் கொள்ளலாம்! 🌟✨`;
  } else {
    // English
    if (intent === 'pdf_pages') {
      return `I've successfully removed the specified page(s)/certificate(s) from your PDF! The updated document now has ${actionResult.metadata?.remainingPages} pages. Preview and download below! 📄✨`;
    } else if (intent === 'sticker') {
      return `I've created a standard 512×512 transparent WebP sticker for WhatsApp and Telegram, complete with a clean cutout, white die-cut contour border, and soft drop shadow! Preview and download below. 🌟`;
    } else if (intent === 'remove_bg') {
      return `I've cleanly removed the background from your image! The subject has been isolated into a transparent PNG. Check the live preview below! ✂️`;
    } else if (intent === 'convert_format') {
      return `Conversion complete! Your file is now converted to ${actionResult.outExt.toUpperCase()} with layout, typography, and styling preserved. 📄`;
    }
    return `I've successfully applied "${op}" to your file! You can preview the result and download it right below. 👍`;
  }
}
