export const CATEGORIES = {
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  PDFS: 'pdfs',
  VIDEOS: 'videos',
  AUDIO: 'audio',
  ARCHIVES: 'archives',
  OTHER: 'other'
};

export const EXTENSION_CATEGORIES = {
  // Photos
  jpg: CATEGORIES.PHOTOS,
  jpeg: CATEGORIES.PHOTOS,
  png: CATEGORIES.PHOTOS,
  webp: CATEGORIES.PHOTOS,
  gif: CATEGORIES.PHOTOS,
  svg: CATEGORIES.PHOTOS,
  bmp: CATEGORIES.PHOTOS,
  tiff: CATEGORIES.PHOTOS,
  ico: CATEGORIES.PHOTOS,
  avif: CATEGORIES.PHOTOS,

  // PDFs
  pdf: CATEGORIES.PDFS,

  // Documents
  txt: CATEGORIES.DOCUMENTS,
  md: CATEGORIES.DOCUMENTS,
  doc: CATEGORIES.DOCUMENTS,
  docx: CATEGORIES.DOCUMENTS,
  xls: CATEGORIES.DOCUMENTS,
  xlsx: CATEGORIES.DOCUMENTS,
  ppt: CATEGORIES.DOCUMENTS,
  pptx: CATEGORIES.DOCUMENTS,
  csv: CATEGORIES.DOCUMENTS,
  rtf: CATEGORIES.DOCUMENTS,
  json: CATEGORIES.DOCUMENTS,
  xml: CATEGORIES.DOCUMENTS,
  html: CATEGORIES.DOCUMENTS,

  // Videos
  mp4: CATEGORIES.VIDEOS,
  mkv: CATEGORIES.VIDEOS,
  mov: CATEGORIES.VIDEOS,
  avi: CATEGORIES.VIDEOS,
  webm: CATEGORIES.VIDEOS,
  flv: CATEGORIES.VIDEOS,
  wmv: CATEGORIES.VIDEOS,

  // Audio
  mp3: CATEGORIES.AUDIO,
  wav: CATEGORIES.AUDIO,
  ogg: CATEGORIES.AUDIO,
  aac: CATEGORIES.AUDIO,
  flac: CATEGORIES.AUDIO,
  m4a: CATEGORIES.AUDIO,

  // Archives
  zip: CATEGORIES.ARCHIVES,
  rar: CATEGORIES.ARCHIVES,
  '7z': CATEGORIES.ARCHIVES,
  tar: CATEGORIES.ARCHIVES,
  gz: CATEGORIES.ARCHIVES,
  bz2: CATEGORIES.ARCHIVES
};

export function getFileCategory(mimeType = '', extension = '') {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  if (EXTENSION_CATEGORIES[ext]) {
    return EXTENSION_CATEGORIES[ext];
  }

  if (mimeType.startsWith('image/')) return CATEGORIES.PHOTOS;
  if (mimeType === 'application/pdf') return CATEGORIES.PDFS;
  if (mimeType.startsWith('video/')) return CATEGORIES.VIDEOS;
  if (mimeType.startsWith('audio/')) return CATEGORIES.AUDIO;
  if (
    mimeType.includes('zip') ||
    mimeType.includes('compressed') ||
    mimeType.includes('tar') ||
    mimeType.includes('archive')
  ) {
    return CATEGORIES.ARCHIVES;
  }
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation')
  ) {
    return CATEGORIES.DOCUMENTS;
  }

  return CATEGORIES.OTHER;
}

