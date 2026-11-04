import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

/**
 * Create a ZIP archive from multiple files
 * files: Array<{ filePath: string, archiveName: string }>
 */
export async function createZipArchive(files, outputPath) {
  const zip = new JSZip();

  for (const file of files) {
    if (fs.existsSync(file.filePath)) {
      const fileData = fs.readFileSync(file.filePath);
      zip.file(file.archiveName || path.basename(file.filePath), fileData);
    }
  }

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  fs.writeFileSync(outputPath, content);
  return {
    outputPath,
    fileSize: content.length,
    entryCount: files.length
  };
}

/**
 * Extract files from a ZIP archive
 */
export async function extractZipArchive(zipPath, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zipData = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  const extractedFiles = [];

  for (const filename of Object.keys(zip.files)) {
    const fileEntry = zip.files[filename];
    if (!fileEntry.dir) {
      const content = await fileEntry.async('nodebuffer');
      const safeName = path.basename(filename);
      const uniqueName = `${Date.now()}_${safeName}`;
      const destPath = path.join(outputDir, uniqueName);
      fs.writeFileSync(destPath, content);

      extractedFiles.push({
        originalName: safeName,
        savedName: uniqueName,
        filePath: destPath,
        fileSize: content.length
      });
    }
  }

  return {
    extractedCount: extractedFiles.length,
    files: extractedFiles
  };
}

