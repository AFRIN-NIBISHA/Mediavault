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

  // 1. SMART UTILITIES & SPECIALIZED STUDIO INTENTS (Checked first to prevent format shadowing)

  // A. COMPRESSION
  if (
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
  // B. WATERMARK
  else if (intent === 'general_chat' && (lower.includes('watermark') || lower.includes('வாட்டர்மார்க்'))) {
    intent = 'watermark';
    const match = message.match(/["']([^"']+)["']/) || message.match(/watermark\s+([A-Za-z0-9_-]+)/i);
    params.text = match ? match[1] : 'CONFIDENTIAL';
  }
  // C. OCR / TEXT EXTRACTION
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
  // D. AUDIO TO TRANSCRIPT
  else if (
    intent === 'general_chat' &&
    (
      lower.includes('transcript') ||
      lower.includes('audio to text') ||
      lower.includes('speech to text') ||
      lower.includes('transcribe') ||
      lower.includes('audio-va text') ||
      lower.includes('audio va text') ||
      lower.includes('audio transcript') ||
      lower.includes('டிரான்ஸ்கிரிப்ட்') ||
      (['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'webm'].includes(ext) && (lower.includes('text') || lower.includes('transcript') || lower.includes('subtitles')))
    )
  ) {
    intent = 'audio_to_transcript';
    targetFormat = lower.includes('docx') ? 'docx' : (lower.includes('srt') ? 'srt' : (lower.includes('json') ? 'json' : 'txt'));
  }
  // E. EXCEL DEDUPLICATION
  else if (
    intent === 'general_chat' &&
    (['xlsx', 'xls', 'csv'].includes(ext) || lower.includes('excel')) &&
    (
      lower.includes('dedup') ||
      lower.includes('remove duplicate') ||
      lower.includes('duplicate remove') ||
      lower.includes('clean duplicate') ||
      lower.includes('duplicate thooku') ||
      lower.includes('போலி வரிகளை நீக்கு')
    )
  ) {
    intent = 'excel_dedup';
  }
  // F. ARCHIVE (ZIP) CONVERSIONS
  else if (
    intent === 'general_chat' &&
    (ext === 'zip' || lower.includes('unzip') || lower.includes('extract zip') || lower.includes('zip extract') || lower.includes('பிரித்தெடு'))
  ) {
    intent = 'extract_zip';
    targetFormat = 'zip';
  }
  else if (
    intent === 'general_chat' &&
    (lower.includes('create zip') || lower.includes('make zip') || lower.includes('zip bundle') || lower.includes('zip panni') || lower.includes('to zip'))
  ) {
    intent = 'create_zip';
    targetFormat = 'zip';
  }
  // G. REVERSE GIF
  else if (
    intent === 'general_chat' &&
    (ext === 'gif' || lower.includes('gif')) &&
    (lower.includes('reverse') || lower.includes('boomerang') || lower.includes('thirupu') || lower.includes('loop'))
  ) {
    intent = 'reverse_gif';
    targetFormat = 'gif';
  }
  // H. STICKER INTENTS
  else if (
    intent === 'general_chat' &&
    (lower.includes('sticker') || lower.includes('ஸ்டிக்கர்') || lower.includes('stiker'))
  ) {
    intent = 'sticker';
    targetFormat = 'webp';
  }
  // I. BACKGROUND REMOVAL INTENTS
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
  // J. PDF PAGE MANIPULATION (Remove/Extract last, first, or specific pages/certificates)
  else if (isPdf && (hasRemoveKeywords || hasPageKeywords || hasLastKeywords || hasFirstKeywords)) {
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

  // 2. VIDEO CONVERSIONS (Video to GIF, Extract Audio, Transcode)
  else if (
    intent === 'general_chat' &&
    (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext) || lower.includes('video')) &&
    (lower.includes('to gif') || lower.includes('gif ah') || lower.includes('gif mathu') || lower.includes('clip to gif'))
  ) {
    intent = 'convert_format';
    targetFormat = 'gif';
  }
  else if (
    intent === 'general_chat' &&
    (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext) || lower.includes('video')) &&
    (
      lower.includes('extract audio') ||
      lower.includes('audio extract') ||
      lower.includes('video to mp3') ||
      lower.includes('video to audio') ||
      lower.includes('mp3 ah mathu') ||
      lower.includes('soundtrack') ||
      lower.includes('bgm') ||
      lower.includes('audio mattum') ||
      lower.includes('ஆடியோவை பிரி')
    )
  ) {
    intent = 'convert_format';
    targetFormat = 'mp3';
  }
  // GIF to Video
  else if (
    intent === 'general_chat' &&
    ext === 'gif' &&
    (lower.includes('to video') || lower.includes('to mp4') || lower.includes('mp4 ah') || lower.includes('video ah'))
  ) {
    intent = 'convert_format';
    targetFormat = 'mp4';
  }
  // Word to PDF / HTML / TXT / Excel
  else if (intent === 'general_chat' && (ext === 'docx' || ext === 'doc' || lower.includes('word to') || lower.includes('docx to'))) {
    if (lower.includes('to html') || lower.includes('html ah')) {
      intent = 'convert_format';
      targetFormat = 'html';
    } else if (lower.includes('to txt') || lower.includes('to text') || lower.includes('text ah')) {
      intent = 'convert_format';
      targetFormat = 'txt';
    } else if (lower.includes('to excel') || lower.includes('to xlsx') || lower.includes('excel ah')) {
      intent = 'convert_format';
      targetFormat = 'xlsx';
    } else if (lower.includes('to pdf') || lower.includes('pdf ah') || lower.includes('pdf mathu') || lower.includes('word to pdf')) {
      intent = 'convert_format';
      targetFormat = 'pdf';
    }
  }
  // PDF to Word / Excel / TXT / HTML / Image
  else if (intent === 'general_chat' && (ext === 'pdf' || lower.includes('pdf to'))) {
    if (lower.includes('to word') || lower.includes('to docx') || lower.includes('word ah') || lower.includes('word docx') || lower.includes('editable word')) {
      intent = 'convert_format';
      targetFormat = 'docx';
    } else if (lower.includes('to excel') || lower.includes('to xlsx') || lower.includes('excel ah') || lower.includes('to csv')) {
      intent = 'convert_format';
      targetFormat = 'xlsx';
    } else if (lower.includes('to txt') || lower.includes('to text') || lower.includes('text ah')) {
      intent = 'convert_format';
      targetFormat = 'txt';
    } else if (lower.includes('to html') || lower.includes('html ah')) {
      intent = 'convert_format';
      targetFormat = 'html';
    } else if (lower.includes('to image') || lower.includes('to png') || lower.includes('png ah')) {
      intent = 'convert_format';
      targetFormat = 'png';
    } else if (lower.includes('to jpg') || lower.includes('jpg ah')) {
      intent = 'convert_format';
      targetFormat = 'jpg';
    }
  }
  // Excel to PDF / CSV / JSON / XML / HTML
  else if (intent === 'general_chat' && (['xlsx', 'xls', 'csv'].includes(ext) || lower.includes('excel to'))) {
    if (lower.includes('to csv') || lower.includes('csv ah')) {
      intent = 'convert_format';
      targetFormat = 'csv';
    } else if (lower.includes('to json') || lower.includes('json ah')) {
      intent = 'convert_format';
      targetFormat = 'json';
    } else if (lower.includes('to xml') || lower.includes('xml ah')) {
      intent = 'convert_format';
      targetFormat = 'xml';
    } else if (lower.includes('to html') || lower.includes('html ah') || lower.includes('web table')) {
      intent = 'convert_format';
      targetFormat = 'html';
    } else if (lower.includes('to pdf') || lower.includes('pdf ah')) {
      intent = 'convert_format';
      targetFormat = 'pdf';
    }
  }
  // PowerPoint to PDF / PNG / Image
  else if (intent === 'general_chat' && (['pptx', 'ppt'].includes(ext) || lower.includes('powerpoint') || lower.includes('ppt to'))) {
    if (lower.includes('to image') || lower.includes('to png') || lower.includes('png ah') || lower.includes('slides to image')) {
      intent = 'convert_format';
      targetFormat = 'png';
    } else {
      intent = 'convert_format';
      targetFormat = 'pdf';
    }
  }
  // Audio to MP3 / WAV
  else if (intent === 'general_chat' && ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'webm'].includes(ext)) {
    if (lower.includes('to wav') || lower.includes('wav ah') || lower.includes('studio wav')) {
      intent = 'convert_format';
      targetFormat = 'wav';
    } else if (lower.includes('to mp3') || lower.includes('mp3 ah')) {
      intent = 'convert_format';
      targetFormat = 'mp3';
    }
  }
  // Generic to PDF
  else if (intent === 'general_chat' && (lower.includes('to pdf') || lower.includes('pdf ah mathu') || lower.includes('pdf mathi'))) {
    intent = 'convert_format';
    targetFormat = 'pdf';
  }
  // To PNG / JPG / WebP / AVIF
  else if (intent === 'general_chat' && (lower.includes('to png') || lower.includes('png ah'))) {
    intent = 'convert_format';
    targetFormat = 'png';
  } else if (intent === 'general_chat' && (lower.includes('to jpg') || lower.includes('to jpeg') || lower.includes('jpg ah'))) {
    intent = 'convert_format';
    targetFormat = 'jpg';
  } else if (intent === 'general_chat' && (lower.includes('to webp') || lower.includes('webp ah'))) {
    intent = 'convert_format';
    targetFormat = 'webp';
  } else if (intent === 'general_chat' && (lower.includes('to avif') || lower.includes('avif ah'))) {
    intent = 'convert_format';
    targetFormat = 'avif';
  }
  // 3. IMAGE ADJUSTMENTS
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
    const normTarget = targetFormat.toLowerCase();
    operationTitle = `Convert to ${normTarget.toUpperCase()}`;
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}.${normTarget}`);

    // PDF source conversions
    if (ext === 'pdf') {
      if (normTarget === 'docx' || normTarget === 'doc') {
        resultMeta = await conversionService.convertPdfToWord(inputPath, outputPath);
      } else if (normTarget === 'xlsx' || normTarget === 'csv') {
        resultMeta = await conversionService.convertPdfToExcel(inputPath, outputPath);
      } else if (normTarget === 'txt') {
        resultMeta = await conversionService.convertPdfToTxt(inputPath, outputPath);
      } else if (normTarget === 'html') {
        resultMeta = await conversionService.convertPdfToHtml(inputPath, outputPath);
      } else if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(normTarget)) {
        resultMeta = await conversionService.convertImage(inputPath, normTarget, outputPath);
      } else {
        throw new Error(`Unsupported conversion from PDF to ${normTarget}`);
      }
    }
    // Word source conversions
    else if (ext === 'docx' || ext === 'doc') {
      if (normTarget === 'pdf') {
        resultMeta = await conversionService.convertWordToPdf(inputPath, outputPath);
      } else if (normTarget === 'html') {
        resultMeta = await conversionService.convertWordToHtml(inputPath, outputPath);
      } else if (normTarget === 'txt') {
        resultMeta = await conversionService.convertWordToTxt(inputPath, outputPath);
      } else if (normTarget === 'xlsx') {
        resultMeta = await conversionService.convertWordToExcel(inputPath, outputPath);
      } else if (normTarget === 'mp3' || normTarget === 'wav') {
        resultMeta = await conversionService.convertTextToAudio(inputPath, outputPath);
      } else {
        throw new Error(`Unsupported conversion from Word to ${normTarget}`);
      }
    }
    // Excel source conversions
    else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      resultMeta = await conversionService.convertExcel(inputPath, normTarget, outputPath);
    }
    // PowerPoint source conversions
    else if (['pptx', 'ppt'].includes(ext)) {
      resultMeta = await conversionService.convertPowerPoint(inputPath, normTarget, outputPath);
    }
    // Image source conversions
    else if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'bmp'].includes(ext)) {
      resultMeta = await conversionService.convertImage(inputPath, normTarget, outputPath);
    }
    // GIF source conversions
    else if (ext === 'gif') {
      if (normTarget === 'mp4') {
        resultMeta = await conversionService.convertGifToVideo(inputPath, outputPath);
      } else if (normTarget === 'webp') {
        resultMeta = await conversionService.convertGifToSticker(inputPath, outputPath);
      } else {
        resultMeta = await conversionService.convertImage(inputPath, normTarget, outputPath);
      }
    }
    // Video source conversions (Video to GIF, Extract Audio, Transcode)
    else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
      if (normTarget === 'gif') {
        operationTitle = 'Video to GIF Animated Clip';
        resultMeta = await conversionService.convertVideoToGif(inputPath, outputPath);
      } else if (normTarget === 'mp3' || normTarget === 'wav') {
        operationTitle = 'Extract Audio Track (MP3)';
        resultMeta = await conversionService.extractAudioFromVideo(inputPath, outputPath);
      } else {
        resultMeta = await conversionService.convertVideo(inputPath, outputPath);
      }
    }
    // Audio source conversions
    else if (['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'webm'].includes(ext)) {
      if (['txt', 'docx', 'srt', 'json'].includes(normTarget)) {
        operationTitle = `Audio to Transcript (${normTarget.toUpperCase()})`;
        resultMeta = await conversionService.convertAudioToTranscript(inputPath, outputPath, { targetFormat: normTarget });
      } else {
        resultMeta = await conversionService.convertAudio(inputPath, outputPath, { format: normTarget });
      }
    }
    // Text to Audio / Speech
    else if (['txt', 'text'].includes(ext)) {
      if (normTarget === 'mp3' || normTarget === 'wav') {
        operationTitle = 'Text to Spoken Audio';
        resultMeta = await conversionService.convertTextToAudio(inputPath, outputPath);
      } else {
        resultMeta = await conversionService.convertWordToPdf(inputPath, outputPath);
      }
    } else {
      throw new Error(`Cannot convert from .${ext} to .${targetFormat}`);
    }
    tempOutExt = normTarget;
  }
  // 4b. REVERSE GIF
  else if (intent === 'reverse_gif') {
    operationTitle = 'Reverse GIF Animation';
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-reverse.gif`);
    resultMeta = await conversionService.reverseGif(inputPath, outputPath);
    tempOutExt = 'gif';
  }
  // 4c. EXCEL DEDUPLICATION
  else if (intent === 'excel_dedup') {
    operationTitle = 'Excel Duplicate Rows Removal';
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-deduped.xlsx`);
    resultMeta = await conversionService.deduplicateExcel(inputPath, outputPath);
    tempOutExt = 'xlsx';
  }
  // 4d. CREATE ZIP ARCHIVE
  else if (intent === 'create_zip') {
    operationTitle = 'Create Compressed ZIP Archive';
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}.zip`);
    resultMeta = await conversionService.createArchive([inputPath], outputPath, 'zip');
    tempOutExt = 'zip';
  }
  // 4e. EXTRACT ZIP ARCHIVE
  else if (intent === 'extract_zip') {
    operationTitle = 'Extract ZIP Archive';
    const extractDir = path.join(uploadsDir, `assistant-unzip-${timestamp}`);
    const resUnzip = await conversionService.extractArchive(inputPath, extractDir);
    resultMeta = resUnzip;
    if (resUnzip.extractedFiles && resUnzip.extractedFiles.length > 0) {
      const firstFile = resUnzip.extractedFiles[0];
      outputPath = path.join(extractDir, firstFile.filename);
      tempOutExt = path.extname(firstFile.filename).replace('.', '').toLowerCase() || 'bin';
    } else {
      outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-extracted.txt`);
      fs.writeFileSync(outputPath, `Extracted 0 files from ${originalName}`);
      tempOutExt = 'txt';
    }
  }
  // 4f. AUDIO TO TRANSCRIPT
  else if (intent === 'audio_to_transcript') {
    operationTitle = `Audio to Transcript (${targetFormat.toUpperCase()})`;
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}.${targetFormat}`);
    resultMeta = await conversionService.convertAudioToTranscript(inputPath, outputPath, {
      language: lower.includes('tamil') || lower.includes('தமிழ்') ? 'tam' : (lower.includes('hindi') ? 'hin' : 'eng'),
      targetFormat
    });
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
      resultMeta = await conversionService.compressPdf(inputPath, outputPath);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      resultMeta = await conversionService.convertImage(inputPath, ext, outputPath, { quality: 70 });
    } else if (['mp4', 'mov', 'webm'].includes(ext)) {
      resultMeta = await conversionService.convertVideo(inputPath, outputPath, { crf: 28 });
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      resultMeta = await conversionService.convertAudio(inputPath, outputPath, { bitrate: '128k' });
    } else {
      resultMeta = await conversionService.createArchive([inputPath], outputPath, 'zip');
      tempOutExt = 'zip';
    }
  }
  // 7. OCR
  else if (intent === 'ocr') {
    operationTitle = 'Optical Character Recognition (OCR)';
    const ocr = await conversionService.runOcr(inputPath, 'eng');
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-ocr.txt`);
    fs.writeFileSync(outputPath, ocr.text || 'No legible text detected.', 'utf8');
    resultMeta = { text: ocr.text, confidence: ocr.confidence, lines: ocr.lines };
    tempOutExt = 'txt';
  }
  // 8. WATERMARK
  else if (intent === 'watermark') {
    const wmText = params.text || 'CONFIDENTIAL';
    operationTitle = `Add Watermark "${wmText}"`;
    outputPath = path.join(uploadsDir, `assistant-${timestamp}-${cleanBase}-watermarked.${ext}`);

    if (ext === 'pdf') {
      resultMeta = await conversionService.watermarkPdf(inputPath, outputPath, wmText);
    } else if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) {
      const imgMeta = await sharp(inputPath).metadata();
      const w = imgMeta.width || 800;
      const h = imgMeta.height || 600;
      const fontSize = Math.max(22, Math.round(w / 18));
      const svg = `<svg width="${w}" height="${h}">
        <style>.wm { fill: rgba(255, 255, 255, 0.45); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; stroke: rgba(0,0,0,0.3); stroke-width: 1.5px; }</style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30, ${w / 2}, ${h / 2})" class="wm">${wmText}</text>
      </svg>`;
      await sharp(inputPath).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toFile(outputPath);
      resultMeta = { watermark: wmText, width: w, height: h };
    } else {
      resultMeta = await conversionService.watermarkPdf(inputPath, outputPath, wmText);
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
    } else if (intent === 'reverse_gif') {
      return `Super! Unga GIF-ah successfully reverse panniten! Boomerang reverse playback ready-ah iruku. Keela check out pannikalam! 🎬🔄✨`;
    } else if (intent === 'excel_dedup') {
      return `Done! Excel sheet-la iruntha duplicate rows-ah successfully clean panniten (${actionResult.metadata?.duplicatesRemoved || 0} duplicate rows removed). Clean spreadsheet ready! 📊✨`;
    } else if (intent === 'create_zip') {
      return `Super! Unga file-ah compressed ZIP archive-la bundle panniten! Safe & compact storage-ku download pannikonga! 📦✨`;
    } else if (intent === 'extract_zip') {
      return `ZIP archive-la iruntha contents-ah successfully unpack & extract panni mudichiten! Keela irunthu files access pannikalam! 📦📂✨`;
    } else if (intent === 'audio_to_transcript') {
      return `Super! Unga audio file-ah analyze panni transcript (${actionResult.outExt.toUpperCase()}) create panniten! Spoken intervals & timestamps ellamae neat-ah extract aagi iruku. Keela check out pannikalam! 🎙️📄✨`;
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
    } else if (intent === 'reverse_gif') {
      return `அற்புதம்! உங்கள் GIF அசைவுப்படம் வெற்றிகரமாக தலைகீழாக (Reverse) மாற்றப்பட்டது! கீழே உள்ள மாதிரியைப் பார்த்துப் பதிவிறக்கிக் கொள்ளலாம்! 🎬🔄✨`;
    } else if (intent === 'excel_dedup') {
      return `வெற்றிகரமாக எக்செல் தாளில் இருந்த ${actionResult.metadata?.duplicatesRemoved || 0} போலி வரிகள் நீக்கப்பட்டு தூய்மைப்படுத்தப்பட்டது! 📊✨`;
    } else if (intent === 'create_zip') {
      return `உங்கள் கோப்பு வெற்றிகரமாக கச்சிதமான ZIP காப்பகமாக மாற்றப்பட்டது! 📦✨`;
    } else if (intent === 'extract_zip') {
      return `ZIP காப்பகத்தில் இருந்த கோப்புகள் வெற்றிகரமாகப் பிரித்தெடுக்கப்பட்டன! 📦📂✨`;
    } else if (intent === 'audio_to_transcript') {
      return `அற்புதம்! உங்கள் ஆடியோ கோப்பு வெற்றிகரமாக உரை வடிவத்திற்கு (Transcript - ${actionResult.outExt.toUpperCase()}) மாற்றப்பட்டது. துல்லியமான நேரக் குறிப்புகள் (Timestamps) மற்றும் வசனங்களுடன் தயாராக உள்ளது! 🎙️📄✨`;
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
    } else if (intent === 'reverse_gif') {
      return `Successfully reversed your GIF animation! The boomerang loop is ready for preview and download below. 🎬🔄`;
    } else if (intent === 'excel_dedup') {
      return `Successfully cleaned duplicate rows from your spreadsheet (${actionResult.metadata?.duplicatesRemoved || 0} duplicates removed). Preview and download your clean workbook below! 📊✨`;
    } else if (intent === 'create_zip') {
      return `Successfully packaged your file into a compressed ZIP archive! Ready to download below. 📦✨`;
    } else if (intent === 'extract_zip') {
      return `Successfully extracted and unpacked the contents of your ZIP archive! 📦📂`;
    } else if (intent === 'audio_to_transcript') {
      return `Transcription complete! Your audio has been transcribed into ${actionResult.outExt.toUpperCase()} with speech segments, duration analysis, and timestamps. You can preview or download below! 🎙️📄`;
    }
    return `I've successfully applied "${op}" to your file! You can preview the result and download it right below. 👍`;
  }
}
