import { PDFDocument, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Get PDF basic info: page count, author, title
 */
export async function getPdfInfo(filePath) {
  try {
    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
    return {
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      creator: pdfDoc.getCreator() || ''
    };
  } catch (error) {
    return { pageCount: 1, title: '', author: '', error: error.message };
  }
}

/**
 * Merge multiple PDF files into one output PDF
 */
export async function mergePdfs(inputPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();

  for (const inputPath of inputPaths) {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  return {
    outputPath,
    pageCount: mergedPdf.getPageCount(),
    fileSize: mergedPdfBytes.length
  };
}

/**
 * Split PDF into single pages or page range
 */
export async function splitPdf(inputPath, outputDir, pagesToExtract = null) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  const generatedFiles = [];
  const indices = pagesToExtract || pdfDoc.getPageIndices();

  for (let i = 0; i < indices.length; i++) {
    const pageIndex = indices[i];
    if (pageIndex < 0 || pageIndex >= totalPages) continue;

    const subDoc = await PDFDocument.create();
    const [copiedPage] = await subDoc.copyPages(pdfDoc, [pageIndex]);
    subDoc.addPage(copiedPage);

    const subPdfBytes = await subDoc.save();
    const outFilename = `split_page_${pageIndex + 1}_${Date.now()}.pdf`;
    const outPath = path.join(outputDir, outFilename);
    fs.writeFileSync(outPath, subPdfBytes);

    generatedFiles.push({
      pageNumber: pageIndex + 1,
      filename: outFilename,
      filePath: outPath,
      fileSize: subPdfBytes.length
    });
  }

  return { totalPages, splitCount: generatedFiles.length, files: generatedFiles };
}

/**
 * Extract specific pages into a single new PDF document
 */
export async function extractPdfPages(inputPath, outputPath, pageNumbers = []) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  // Convert 1-based pageNumbers to 0-based indices and filter valid ones
  const validIndices = pageNumbers
    .map(p => Number(p) - 1)
    .filter(idx => idx >= 0 && idx < totalPages);

  if (validIndices.length === 0) {
    throw new Error('No valid page numbers provided for extraction');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(pdfDoc, validIndices);
  copiedPages.forEach(page => newDoc.addPage(page));

  const newPdfBytes = await newDoc.save();
  fs.writeFileSync(outputPath, newPdfBytes);

  return {
    outputPath,
    pageCount: newDoc.getPageCount(),
    fileSize: newPdfBytes.length
  };
}

/**
 * Reorder pages in a PDF document
 * @param {Array<number>} newOrder - 1-based array of page numbers e.g. [3, 1, 2]
 */
export async function reorderPdfPages(inputPath, outputPath, newOrder = []) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  const newDoc = await PDFDocument.create();
  const validIndices = newOrder
    .map(p => Number(p) - 1)
    .filter(idx => idx >= 0 && idx < totalPages);

  const copiedPages = await newDoc.copyPages(pdfDoc, validIndices);
  copiedPages.forEach(page => newDoc.addPage(page));

  const newBytes = await newDoc.save();
  fs.writeFileSync(outputPath, newBytes);

  return {
    outputPath,
    pageCount: newDoc.getPageCount(),
    fileSize: newBytes.length
  };
}

/**
 * Rotate pages in a PDF document
 * @param {number} rotationAngle - 90, 180, 270 degrees
 * @param {Array<number>} targetPages - 1-based page numbers or empty for all
 */
export async function rotatePdfPages(inputPath, outputPath, rotationAngle = 90, targetPages = []) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  const targetSet = new Set(targetPages.map(p => Number(p) - 1));

  pages.forEach((page, index) => {
    if (targetPages.length === 0 || targetSet.has(index)) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationAngle) % 360));
    }
  });

  const rotatedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, rotatedBytes);

  return {
    outputPath,
    pageCount: pdfDoc.getPageCount(),
    fileSize: rotatedBytes.length
  };
}

/**
 * Convert images (JPEG, PNG) into a single PDF file
 */
export async function imagesToPdf(imagePaths, outputPath) {
  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    // Standardize to JPEG using Sharp to guarantee pdf-lib compatibility
    const jpegBuffer = await sharp(imgPath).jpeg({ quality: 90 }).toBuffer();
    const embeddedImage = await pdfDoc.embedJpg(jpegBuffer);

    const { width, height } = embeddedImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);

  return {
    outputPath,
    pageCount: pdfDoc.getPageCount(),
    fileSize: pdfBytes.length
  };
}

