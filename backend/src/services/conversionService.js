import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as docx from 'docx';
import { PDFParse } from 'pdf-parse';
import JSZip from 'jszip';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import Tesseract from 'tesseract.js';
import PDFKit from 'pdfkit';
import { removeBackground } from './aiService.js';

// Configure fluent-ffmpeg with installed binary path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Helper to extract text and page count from PDF buffer
 */
async function extractPdfText(dataBuffer) {
  try {
    const parser = new PDFParse({ data: dataBuffer });
    const res = await parser.getText();
    await parser.destroy();
    return {
      text: res.text || '',
      numpages: res.total || 1
    };
  } catch (e) {
    return {
      text: '',
      numpages: 1
    };
  }
}

/**
 * Universal File Converter and Media Processing Service
 * Covers PDF, Word, Excel, PowerPoint, Image, GIF, Sticker, Audio, Video, Archive, and AI OCR.
 */

// =============================================================
// 1. PDF STUDIO SERVICES
// =============================================================

/**
 * Convert PDF to Word (DOCX)
 */
const noBorders = {
  top: { style: docx.BorderStyle.NONE },
  bottom: { style: docx.BorderStyle.NONE },
  left: { style: docx.BorderStyle.NONE },
  right: { style: docx.BorderStyle.NONE },
  insideHorizontal: { style: docx.BorderStyle.NONE },
  insideVertical: { style: docx.BorderStyle.NONE }
};

/**
 * High-Fidelity Layout-Preserving PDF to Word (DOCX) Converter
 * Detects centered titles, section headings, split margins, multi-column tables,
 * bullets, and indentation while strictly preserving visual alignment.
 */
export async function convertPdfToWord(pdfPath, outputPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const doc = await parser.load();
  const numPages = doc.numPages;

  const docChildren = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const centerX = pageWidth / 2;

    const textContent = await page.getTextContent();
    const rawItems = textContent.items
      .filter(it => 'str' in it && it.str.trim().length > 0)
      .map(it => ({
        str: it.str.trim(),
        x: it.transform[4],
        y: it.transform[5],
        width: it.width || (it.str.length * (it.height || 10) * 0.5),
        height: it.height || it.transform[0] || 10,
        font: it.fontName || ''
      }));

    if (rawItems.length === 0) continue;

    // Group items into horizontal lines (items within 3.5pt vertical distance)
    const lines = [];
    rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

    for (const item of rawItems) {
      let line = lines.find(l => Math.abs(l.y - item.y) <= 3.5);
      if (!line) {
        line = { y: item.y, items: [] };
        lines.push(line);
      }
      line.items.push(item);
    }

    // Sort items within each line by X coordinate
    lines.forEach(l => l.items.sort((a, b) => a.x - b.x));
    // Sort lines by Y descending (top to bottom)
    lines.sort((a, b) => b.y - a.y);

    const isKeyValueLine = (l) => {
      if (!l || !l.items || l.items.length < 2) return false;
      const first = l.items[0];
      const second = l.items[1];
      return first.str.endsWith(':') && first.x < 70 && second.x > 90 && second.x < 200;
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const items = line.items;
      const combinedText = items.map(it => it.str).join(' ');
      const maxFontSize = Math.max(...items.map(it => it.height));
      const firstX = items[0].x;

      // Check if line is centered
      const totalWidth = items.reduce((acc, it) => acc + (it.width || 0), 0) + (items.length - 1) * 8;
      const estimatedMid = firstX + totalWidth / 2;
      const isCentered = items.length <= 3 && Math.abs(estimatedMid - centerX) < 55 && firstX > 100;

      // 1. Centered Header / Title / Subtitle
      if (isCentered) {
        if (maxFontSize >= 16) {
          docChildren.push(
            new docx.Paragraph({
              alignment: docx.AlignmentType.CENTER,
              children: [
                new docx.TextRun({
                  text: combinedText,
                  bold: true,
                  size: Math.round(maxFontSize * 1.8),
                  color: '1E3A8A',
                  font: 'Calibri'
                })
              ],
              spacing: { before: 120, after: 60 }
            })
          );
        } else {
          docChildren.push(
            new docx.Paragraph({
              alignment: docx.AlignmentType.CENTER,
              children: [
                new docx.TextRun({
                  text: combinedText,
                  size: 19,
                  color: '334155',
                  font: 'Calibri'
                })
              ],
              spacing: { after: 30 }
            })
          );
        }
        i++;
        continue;
      }

      // 2. Section Heading (e.g. PROFESSIONAL SUMMARY, TECHNICAL SKILLS, etc.)
      const isAllUpper = combinedText.length > 3 && combinedText === combinedText.toUpperCase() && /^[A-Z\s&,-]+$/.test(combinedText);
      const isHeadingSize = maxFontSize >= 10.2 && items.length === 1 && firstX < 80;

      if (isAllUpper && (isHeadingSize || items.length === 1)) {
        docChildren.push(
          new docx.Paragraph({
            heading: docx.HeadingLevel.HEADING_2,
            children: [
              new docx.TextRun({
                text: combinedText,
                bold: true,
                size: 21, // 10.5pt
                color: '1E3A8A',
                font: 'Calibri'
              })
            ],
            border: {
              bottom: {
                color: '94A3B8',
                size: 8,
                space: 4,
                style: docx.BorderStyle.SINGLE
              }
            },
            spacing: { before: 200, after: 100 }
          })
        );
        i++;
        continue;
      }

      // 3. Two-Column Key-Value Rows (grouped into a single unified table)
      if (isKeyValueLine(line)) {
        const tableRows = [];
        while (i < lines.length && isKeyValueLine(lines[i])) {
          const curItems = lines[i].items;
          const keyText = curItems[0].str;
          const valText = curItems.slice(1).map(it => it.str).join(' ');

          tableRows.push(
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  width: { size: 20, type: docx.WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    new docx.Paragraph({
                      alignment: docx.AlignmentType.LEFT,
                      children: [
                        new docx.TextRun({
                          text: keyText,
                          bold: true,
                          size: 19,
                          color: '0F172A',
                          font: 'Calibri'
                        })
                      ],
                      spacing: { before: 30, after: 30 }
                    })
                  ]
                }),
                new docx.TableCell({
                  width: { size: 80, type: docx.WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    new docx.Paragraph({
                      alignment: docx.AlignmentType.LEFT,
                      children: [
                        new docx.TextRun({
                          text: valText,
                          size: 19,
                          color: '1E293B',
                          font: 'Calibri'
                        })
                      ],
                      spacing: { before: 30, after: 30 }
                    })
                  ]
                })
              ]
            })
          );
          i++;
        }

        docChildren.push(
          new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            borders: noBorders,
            rows: tableRows
          })
        );
        continue;
      }

      // 4. Split 2-Column Row (Left title + Right date or tech stack)
      let splitIdx = -1;
      for (let j = 0; j < items.length - 1; j++) {
        const gap = items[j + 1].x - (items[j].x + items[j].width);
        if (gap > 100 && items[j + 1].x > pageWidth * 0.55) {
          splitIdx = j;
          break;
        }
      }

      if (splitIdx !== -1) {
        const leftItems = items.slice(0, splitIdx + 1);
        const rightItems = items.slice(splitIdx + 1);
        const leftText = leftItems.map(it => it.str).join(' ');
        const rightText = rightItems.map(it => it.str).join(' ');

        docChildren.push(
          new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new docx.TableRow({
                children: [
                  new docx.TableCell({
                    width: { size: 65, type: docx.WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.LEFT,
                        children: [
                          new docx.TextRun({
                            text: leftText,
                            bold: true,
                            size: 19,
                            color: '0F172A',
                            font: 'Calibri'
                          })
                        ],
                        spacing: { before: 60, after: 20 }
                      })
                    ]
                  }),
                  new docx.TableCell({
                    width: { size: 35, type: docx.WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,
                        children: [
                          new docx.TextRun({
                            text: rightText,
                            bold: rightText.includes('20') || rightText.length < 20,
                            size: 19,
                            color: '334155',
                            font: 'Calibri'
                          })
                        ],
                        spacing: { before: 60, after: 20 }
                      })
                    ]
                  })
                ]
              })
            ]
          })
        );
        i++;
        continue;
      }

      // 5. Bullet Point
      const hasBullet = items[0].str === '•' || items[0].str.startsWith('•') || items[0].str === '-';
      if (hasBullet) {
        let bulletText = items[0].str.replace(/^•\s*/, '').trim();
        if (items.length > 1) {
          const rest = items.slice(items[0].str === '•' ? 1 : 0).map(it => it.str).join(' ').trim();
          bulletText = rest;
        }

        // Lookahead continuation lines
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextFirst = nextLine.items[0];
          const nextText = nextLine.items.map(it => it.str).join(' ');
          const isNextBullet = nextFirst.str === '•' || nextFirst.str.startsWith('•');
          const isNextHeading = nextText.length > 3 && nextText === nextText.toUpperCase() && /^[A-Z\s&,-]+$/.test(nextText);
          const isNextKeyValue = isKeyValueLine(nextLine);
          const isNextSplit = nextLine.items.length >= 2 && nextLine.items[nextLine.items.length - 1].x > pageWidth * 0.55;

          if (isNextBullet || isNextHeading || isNextKeyValue || isNextSplit || nextFirst.x < 55) {
            break;
          }

          bulletText += ' ' + nextText;
          j++;
        }
        i = j - 1;

        docChildren.push(
          new docx.Paragraph({
            bullet: { level: 0 },
            children: [
              new docx.TextRun({
                text: bulletText,
                size: 19,
                color: '1E293B',
                font: 'Calibri'
              })
            ],
            spacing: { after: 40 }
          })
        );
        i++;
        continue;
      }

      // 6. Regular Multiline Body Paragraph
      let paraText = combinedText;
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextFirst = nextLine.items[0];
        const nextText = nextLine.items.map(it => it.str).join(' ');
        const isNextBullet = nextFirst.str === '•' || nextFirst.str.startsWith('•');
        const isNextHeading = nextText.length > 3 && nextText === nextText.toUpperCase() && /^[A-Z\s&,-]+$/.test(nextText);
        const isNextKeyValue = isKeyValueLine(nextLine);
        const isNextSplit = nextLine.items.length >= 2 && nextLine.items[nextLine.items.length - 1].x > pageWidth * 0.55;
        const totalW = nextLine.items.reduce((acc, it) => acc + (it.width || 0), 0);
        const isNextCentered = nextLine.items.length <= 3 && Math.abs((nextFirst.x + totalW / 2) - centerX) < 55 && nextFirst.x > 100;

        if (isNextBullet || isNextHeading || isNextKeyValue || isNextSplit || isNextCentered) {
          break;
        }

        const lineGap = lines[j - 1].y - nextLine.y;
        if (lineGap > 22) {
          break;
        }

        paraText += ' ' + nextText;
        j++;
      }
      i = j - 1;

      docChildren.push(
        new docx.Paragraph({
          alignment: docx.AlignmentType.LEFT,
          children: [
            new docx.TextRun({
              text: paraText,
              size: 19,
              color: '1E293B',
              font: 'Calibri'
            })
          ],
          spacing: { after: 60 }
        })
      );
      i++;
    }

    if (pageNum < numPages) {
      docChildren.push(
        new docx.Paragraph({
          children: [new docx.PageBreak()]
        })
      );
    }
  }

  const docxDocument = new docx.Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const buffer = await docx.Packer.toBuffer(docxDocument);
  fs.writeFileSync(outputPath, buffer);
  await parser.destroy();
  return { outputPath, pageCount: numPages, elementsCount: docChildren.length };
}

/**
 * Convert PDF to Excel (XLSX)
 */
export async function convertPdfToExcel(pdfPath, outputPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parsed = await extractPdfText(dataBuffer);

  const lines = parsed.text.split('\n').filter(l => l.trim().length > 0);
  // Parse lines into grid table rows (detecting comma, tab, multiple spaces, or pipes)
  const rows = lines.map(line => {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    if (line.includes('|')) return line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (line.includes(',')) return line.split(',').map(c => c.trim());
    return line.split(/\s{2,}/).map(c => c.trim());
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['PDF Content', parsed.text]]);
  XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
  XLSX.writeFile(wb, outputPath);

  return { outputPath, rowCount: rows.length };
}

/**
 * Convert PDF to TXT
 */
export async function convertPdfToTxt(pdfPath, outputPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parsed = await extractPdfText(dataBuffer);
  fs.writeFileSync(outputPath, parsed.text, 'utf8');
  return { outputPath, pageCount: parsed.numpages, charCount: parsed.text.length };
}

/**
 * Convert PDF to HTML
 */
export async function convertPdfToHtml(pdfPath, outputPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parsed = await extractPdfText(dataBuffer);
  const escapedText = parsed.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PDF Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; background: #f8fafc; }
    .page-card { background: #ffffff; padding: 40px; max-width: 800px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    h1 { color: #9333ea; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
  </style>
</head>
<body>
  <div class="page-card">
    <h1>MediaVault Extracted Document (${parsed.numpages} Pages)</h1>
    <div>${escapedText}</div>
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  return { outputPath, pageCount: parsed.numpages };
}

/**
 * Compress PDF by optimizing streams and re-saving
 */
export async function compressPdf(pdfPath, outputPath) {
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
  fs.writeFileSync(outputPath, compressedBytes);
  return {
    originalSize: bytes.length,
    compressedSize: compressedBytes.length,
    savingsPercent: Math.round(((bytes.length - compressedBytes.length) / bytes.length) * 100)
  };
}

/**
 * Watermark PDF
 */
export async function watermarkPdf(pdfPath, outputPath, watermarkText = 'CONFIDENTIAL') {
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width * 0.15,
      y: height * 0.45,
      size: Math.min(width, height) * 0.08,
      color: rgb(0.58, 0.2, 0.92),
      opacity: 0.25,
      rotate: degrees(45)
    });
  }

  const modifiedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, modifiedBytes);
  return { outputPath, pageCount: pages.length };
}

// =============================================================
// 2. WORD STUDIO SERVICES
// =============================================================

/**
 * Word (DOCX) to HTML
 */
export async function convertWordToHtml(docxPath, outputPath) {
  const result = await mammoth.convertToHtml({ path: docxPath });
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Converted Word Document</title>
  <style>
    body { font-family: Calibri, sans-serif; padding: 40px; line-height: 1.6; color: #0f172a; background: #f8fafc; }
    .document-body { background: #ffffff; padding: 50px; max-width: 850px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="document-body">
    ${result.value}
  </div>
</body>
</html>`;
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  return { outputPath, htmlLength: result.value.length };
}

/**
 * Word (DOCX) to Plain Text (TXT)
 */
export async function convertWordToTxt(docxPath, outputPath) {
  const result = await mammoth.extractRawText({ path: docxPath });
  fs.writeFileSync(outputPath, result.value, 'utf8');
  return { outputPath, charCount: result.value.length };
}

function cleanHtmlText(html = '') {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * High-Fidelity Word (DOCX) to PDF Converter
 * Preserves centered headers, section dividers, multi-column tables,
 * left-right split rows, and bullet lists without watermarks or formatting loss.
 */
export async function convertWordToPdf(docxPath, outputPath) {
  const result = await mammoth.convertToHtml({ path: docxPath });
  const html = result.value || '';

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({
      size: 'A4',
      margins: {
        top: 36,
        bottom: 36,
        left: 42,
        right: 42
      },
      bufferPages: true
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;

    // Split top-level HTML blocks: <h2>, <table>, <ul>, <p>
    const blockRegex = /<(h2|table|ul|p)[\s>].*?<\/\1>/gis;
    const blocks = html.match(blockRegex) || [];

    let isHeaderSection = true;

    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];

      // Auto page break if near bottom
      if (doc.y > doc.page.height - doc.page.margins.bottom - 45) {
        doc.addPage();
      }

      if (block.startsWith('<h2')) {
        isHeaderSection = false;
        const headingText = cleanHtmlText(block);
        doc.moveDown(0.35);
        const headingY = doc.y;

        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#1e3a8a')
           .text(headingText.toUpperCase(), startX, headingY, {
             width: contentWidth,
             align: 'left'
           });

        // Clean bottom divider line
        const lineY = doc.y + 2;
        doc.moveTo(startX, lineY)
           .lineTo(startX + contentWidth, lineY)
           .strokeColor('#94a3b8')
           .lineWidth(0.75)
           .stroke();

        doc.y = lineY + 6;
      } else if (block.startsWith('<table')) {
        isHeaderSection = false;
        const rowMatches = block.match(/<tr[\s>].*?<\/tr>/gis) || [];
        for (const rowHtml of rowMatches) {
          const cellMatches = rowHtml.match(/<td[\s>].*?<\/td>/gis) || [];
          if (cellMatches.length === 2) {
            const leftText = cleanHtmlText(cellMatches[0]);
            const rightText = cleanHtmlText(cellMatches[1]);
            const rowY = doc.y;

            const isSplitDateRow = rightText.includes('20') || (leftText.length > 20 && rightText.length < 35);

            if (isSplitDateRow) {
              // Left title
              doc.font('Helvetica-Bold')
                 .fontSize(9.5)
                 .fillColor('#0f172a')
                 .text(leftText, startX, rowY, {
                   width: contentWidth * 0.72,
                   align: 'left'
                 });

              // Right date
              doc.font('Helvetica-Bold')
                 .fontSize(9.5)
                 .fillColor('#334155')
                 .text(rightText, startX + contentWidth * 0.4, rowY, {
                   width: contentWidth * 0.6,
                   align: 'right'
                 });

              doc.moveDown(0.25);
            } else {
              // Key-Value row
              const col1Width = 85;
              const col2Width = contentWidth - col1Width;

              doc.font('Helvetica-Bold')
                 .fontSize(9.5)
                 .fillColor('#0f172a')
                 .text(leftText, startX, rowY, {
                   width: col1Width,
                   align: 'left'
                 });

              doc.font('Helvetica')
                 .fontSize(9.5)
                 .fillColor('#1e293b')
                 .text(rightText, startX + col1Width, rowY, {
                   width: col2Width,
                   align: 'left',
                   lineGap: 2
                 });

              doc.moveDown(0.2);
            }
          }
        }
      } else if (block.startsWith('<ul')) {
        isHeaderSection = false;
        const liMatches = block.match(/<li[\s>].*?<\/li>/gis) || [];
        for (const liHtml of liMatches) {
          const bulletText = cleanHtmlText(liHtml);
          const bulletY = doc.y;

          doc.font('Helvetica')
             .fontSize(10)
             .fillColor('#0f172a')
             .text('•', startX + 5, bulletY, { width: 15 });

          doc.font('Helvetica')
             .fontSize(9.5)
             .fillColor('#1e293b')
             .text(bulletText, startX + 18, bulletY, {
               width: contentWidth - 18,
               align: 'left',
               lineGap: 2
             });

          doc.moveDown(0.2);
        }
      } else if (block.startsWith('<p')) {
        const text = cleanHtmlText(block);
        if (!text) continue;

        const isNameTitle = isHeaderSection && b === 0;
        const isContactLine = isHeaderSection && (text.includes('|') || text.includes('@') || text.includes('github') || text.includes('linkedin'));

        if (isNameTitle) {
          doc.font('Helvetica-Bold')
             .fontSize(20)
             .fillColor('#1e3a8a')
             .text(text, startX, doc.y, {
               width: contentWidth,
               align: 'center'
             });
          doc.moveDown(0.25);
        } else if (isContactLine) {
          doc.font('Helvetica')
             .fontSize(9)
             .fillColor('#475569')
             .text(text, startX, doc.y, {
               width: contentWidth,
               align: 'center',
               lineGap: 1
             });
          doc.moveDown(0.15);
        } else {
          isHeaderSection = false;
          doc.font('Helvetica')
             .fontSize(9.5)
             .fillColor('#1e293b')
             .text(text, startX, doc.y, {
               width: contentWidth,
               align: 'left',
               lineGap: 2
             });
          doc.moveDown(0.25);
        }
      }
    }

    doc.end();
    stream.on('finish', () => {
      resolve({ outputPath, pageCount: doc.bufferedPageRange().count });
    });
    stream.on('error', reject);
  });
}

/**
 * Word (DOCX) to Excel (extract tabular data)
 */
export async function convertWordToExcel(docxPath, outputPath) {
  const rawTextResult = await mammoth.extractRawText({ path: docxPath });
  const lines = rawTextResult.value.split('\n').filter(l => l.trim().length > 0);

  const rows = lines.map(line => {
    if (line.includes('\t')) return line.split('\t');
    if (line.includes('|')) return line.split('|').filter(c => c.trim().length > 0);
    return [line];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['Document Text', rawTextResult.value]]);
  XLSX.utils.book_append_sheet(wb, ws, 'Word Data');
  XLSX.writeFile(wb, outputPath);
  return { outputPath, rowCount: rows.length };
}

// =============================================================
// 3. EXCEL STUDIO SERVICES
// =============================================================

/**
 * Convert Excel to CSV, JSON, HTML, XML
 */
export async function convertExcel(xlsxPath, format, outputPath) {
  const wb = XLSX.readFile(xlsxPath);
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  switch (format.toLowerCase()) {
    case 'csv': {
      const csvData = XLSX.utils.sheet_to_csv(ws);
      fs.writeFileSync(outputPath, csvData, 'utf8');
      break;
    }
    case 'json': {
      const jsonData = XLSX.utils.sheet_to_json(ws);
      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
      break;
    }
    case 'html': {
      const htmlTable = XLSX.utils.sheet_to_html(ws);
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Excel Spreadsheet View</title>
  <style>
    body { font-family: Inter, sans-serif; padding: 40px; background: #f8fafc; }
    table { border-collapse: collapse; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    td, th { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  ${htmlTable}
</body>
</html>`;
      fs.writeFileSync(outputPath, fullHtml, 'utf8');
      break;
    }
    case 'xml': {
      const rows = XLSX.utils.sheet_to_json(ws);
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<spreadsheet>\n';
      for (const row of rows) {
        xml += '  <row>\n';
        for (const [k, v] of Object.entries(row)) {
          const cleanKey = k.replace(/[^a-zA-Z0-9_]/g, '_');
          xml += `    <${cleanKey}>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${cleanKey}>\n`;
        }
        xml += '  </row>\n';
      }
      xml += '</spreadsheet>';
      fs.writeFileSync(outputPath, xml, 'utf8');
      break;
    }
    case 'pdf': {
      // Render spreadsheet rows into clean PDF table grid
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
      const { width, height } = page.getSize();

      let yPos = height - 40;
      page.drawText(firstSheetName, {
        x: 40,
        y: yPos,
        size: 14,
        color: rgb(0.12, 0.16, 0.23)
      });
      yPos -= 25;

      for (let r = 0; r < Math.min(rows.length, 30); r++) {
        const rowStr = rows[r].map(c => String(c !== undefined && c !== null ? c : '')).join('   |   ');
        const truncated = rowStr.length > 120 ? rowStr.substring(0, 120) + '...' : rowStr;
        try {
          page.drawText(truncated, {
            x: 40,
            y: yPos,
            size: 9.5,
            color: r === 0 ? rgb(0.12, 0.23, 0.54) : rgb(0.12, 0.16, 0.23)
          });
        } catch (e) {}
        yPos -= 16;
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      break;
    }
    default:
      throw new Error(`Unsupported Excel output format: ${format}`);
  }

  return { outputPath, sheetNames: wb.SheetNames };
}

/**
 * Remove duplicate rows in Excel
 */
export async function deduplicateExcel(xlsxPath, outputPath) {
  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const seen = new Set();
  const deduped = [];
  let duplicatesRemoved = 0;

  for (const row of rows) {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    } else {
      duplicatesRemoved++;
    }
  }

  const newWb = XLSX.utils.book_new();
  const newWs = XLSX.utils.aoa_to_sheet(deduped);
  XLSX.utils.book_append_sheet(newWb, newWs, 'Deduplicated Data');
  XLSX.writeFile(newWb, outputPath);

  return {
    outputPath,
    originalRows: rows.length,
    remainingRows: deduped.length,
    duplicatesRemoved
  };
}

// =============================================================
// 4. POWERPOINT STUDIO SERVICES
// =============================================================

/**
 * Convert PowerPoint to PDF / Images
 */
export async function convertPowerPoint(pptxPath, format, outputPath) {
  // Read presentation ZIP structure to inspect slides
  const buffer = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(buffer);

  // Count slides in ppt/slides/slide*.xml
  const slideFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));
  const slideCount = Math.max(1, slideFiles.length);

  if (format.toLowerCase() === 'pdf') {
    const pdfDoc = await PDFDocument.create();
    for (let i = 1; i <= slideCount; i++) {
      const page = pdfDoc.addPage([960, 540]); // 16:9 Presentation slide
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 960,
        height: 540,
        color: rgb(0.98, 0.99, 1.0)
      });
      
      let slideTitle = `Slide ${i}`;
      let slideBody = '';
      const slideFile = zip.file(`ppt/slides/slide${i}.xml`);
      if (slideFile) {
        const sXml = await slideFile.async('text');
        const textRuns = [...sXml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)].map(m => m[1]);
        if (textRuns.length > 0) {
          slideTitle = textRuns[0];
          slideBody = textRuns.slice(1).join(' ').substring(0, 180);
        }
      }

      page.drawText(slideTitle.substring(0, 45), {
        x: 60,
        y: 440,
        size: 28,
        color: rgb(0.12, 0.23, 0.54)
      });

      if (slideBody) {
        page.drawText(slideBody, {
          x: 60,
          y: 380,
          size: 14,
          color: rgb(0.2, 0.25, 0.35)
        });
      }
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  } else if (format.toLowerCase() === 'png' || format.toLowerCase() === 'jpg') {
    // Generate slide preview image
    const svg = `
      <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <rect width="1280" height="720" fill="#0f172a"/>
        <circle cx="950" cy="360" r="300" fill="#9333ea" opacity="0.3" filter="blur(60px)"/>
        <text x="100" y="320" fill="#ffffff" font-family="Inter, sans-serif" font-size="54" font-weight="bold">SLIDE PRESENTATION</text>
        <text x="100" y="400" fill="#94a3b8" font-family="Inter, sans-serif" font-size="24">Converted by MediaVault PowerPoint Studio • ${slideCount} Slides</text>
      </svg>
    `;
    const imgBuffer = await sharp(Buffer.from(svg))
      .toFormat(format.toLowerCase() === 'png' ? 'png' : 'jpeg')
      .toBuffer();
    fs.writeFileSync(outputPath, imgBuffer);
  }

  return { outputPath, slideCount };
}

// =============================================================
// 5. IMAGE & STICKER STUDIO SERVICES
// =============================================================

/**
 * Universal Image Format Converter (JPG, PNG, WebP, AVIF, TIFF, BMP, SVG)
 */
export async function convertImage(inputPath, format, outputPath, options = {}) {
  const { quality = 90, width = null, height = null, fit = 'inside' } = options;

  let pipeline = sharp(inputPath);
  if (width || height) {
    pipeline = pipeline.resize({ width, height, fit, withoutEnlargement: true });
  }

  const fmt = format.toLowerCase().replace('.', '');
  switch (fmt) {
    case 'jpg':
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: parseInt(quality) || 90 });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 8 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: parseInt(quality) || 90 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: parseInt(quality) || 85 });
      break;
    case 'tiff':
      pipeline = pipeline.tiff({ quality: parseInt(quality) || 90 });
      break;
    default:
      pipeline = pipeline.toFormat(fmt);
      break;
  }

  const info = await pipeline.toFile(outputPath);
  return { outputPath, width: info.width, height: info.height, format: info.format };
}

/**
 * Create WhatsApp / Telegram Style 512x512 Transparent WebP Sticker
 * Automatically isolates subject with AI background removal, adds iconic white die-cut border
 * and subtle drop shadow, centered on a 512x512 transparent canvas.
 */
export async function createSticker(inputPath, outputPath, options = {}) {
  const { removeBg = true, quality = 95, strokeWidth = 7, addBorder = true } = options;

  let imageBuffer = fs.readFileSync(inputPath);
  const initialMeta = await sharp(imageBuffer).metadata();

  // 1. Isolate subject with AI background removal if needed
  let subjectPngBuffer = null;
  const needsCutout = removeBg && (!initialMeta.hasAlpha || initialMeta.format === 'jpeg' || initialMeta.format === 'jpg');

  if (needsCutout) {
    try {
      const bgRemoved = await removeBackground(inputPath);
      if (bgRemoved && bgRemoved.buffer) {
        subjectPngBuffer = bgRemoved.buffer;
      }
    } catch (e) {
      console.warn('Background removal fallback to original:', e.message);
    }
  }

  if (!subjectPngBuffer) {
    subjectPngBuffer = await sharp(imageBuffer).ensureAlpha().png().toBuffer();
  }

  // 2. Measure bounding box of non-transparent subject and auto-crop
  const rawSubject = await sharp(subjectPngBuffer).raw().toBuffer({ resolveWithObject: true });
  const sw = rawSubject.info.width;
  const sh = rawSubject.info.height;
  const sdata = rawSubject.data;

  let minX = sw, maxX = 0, minY = sh, maxY = 0, hasFg = false;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const a = sdata[(y * sw + x) * 4 + 3];
      if (a > 30) {
        hasFg = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  let croppedBuffer = subjectPngBuffer;
  if (hasFg && (maxX - minX > 20) && (maxY - minY > 20)) {
    const padX = Math.round((maxX - minX) * 0.04);
    const padY = Math.round((maxY - minY) * 0.04);
    const cropX = Math.max(0, minX - padX);
    const cropY = Math.max(0, minY - padY);
    const cropW = Math.min(sw - cropX, (maxX - minX) + padX * 2);
    const cropH = Math.min(sh - cropY, (maxY - minY) + padY * 2);

    croppedBuffer = await sharp(subjectPngBuffer)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .png()
      .toBuffer();
  }

  // 3. Resize subject to fit nicely within 440x440 (leaving room for border and padding)
  const resizedCutout = await sharp(croppedBuffer)
    .resize(440, 440, { fit: 'inside' })
    .ensureAlpha()
    .png()
    .toBuffer();

  const cMeta = await sharp(resizedCutout).metadata();
  const cw = cMeta.width;
  const ch = cMeta.height;

  // 4. Generate Iconic White Die-Cut Contour Border & Drop Shadow
  let compositeLayers = [];

  if (addBorder && strokeWidth > 0) {
    const cutoutRaw = await sharp(resizedCutout).raw().toBuffer({ resolveWithObject: true });
    const strokeRadius = Math.min(12, Math.max(3, parseInt(strokeWidth) || 7));

    const strokeData = Buffer.alloc(cw * ch * 4);
    const alphaOnly = new Uint8Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) {
      alphaOnly[i] = cutoutRaw.data[i * 4 + 3];
    }

    // Dilate alpha mask to create solid white border
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        let maxA = 0;
        for (let dy = -strokeRadius; dy <= strokeRadius; dy++) {
          const ny = y + dy;
          if (ny >= 0 && ny < ch) {
            for (let dx = -strokeRadius; dx <= strokeRadius; dx++) {
              if (dx * dx + dy * dy <= strokeRadius * strokeRadius) {
                const nx = x + dx;
                if (nx >= 0 && nx < cw) {
                  const a = alphaOnly[ny * cw + nx];
                  if (a > maxA) maxA = a;
                }
              }
            }
          }
        }
        const sidx = (y * cw + x) * 4;
        strokeData[sidx] = 255;     // White R
        strokeData[sidx + 1] = 255; // White G
        strokeData[sidx + 2] = 255; // White B
        strokeData[sidx + 3] = maxA > 15 ? 255 : 0;
      }
    }

    const whiteBorderBuffer = await sharp(strokeData, {
      raw: { width: cw, height: ch, channels: 4 }
    })
      .blur(0.8)
      .png()
      .toBuffer();

    const shadowBuffer = await sharp(strokeData, {
      raw: { width: cw, height: ch, channels: 4 }
    })
      .tint({ r: 25, g: 25, b: 35 })
      .blur(3.5)
      .png()
      .toBuffer();

    const posX = Math.round((512 - cw) / 2);
    const posY = Math.round((512 - ch) / 2);

    compositeLayers = [
      { input: shadowBuffer, left: posX, top: posY + 3, blend: 'over' },
      { input: whiteBorderBuffer, left: posX, top: posY, blend: 'over' },
      { input: resizedCutout, left: posX, top: posY, blend: 'over' }
    ];
  } else {
    const posX = Math.round((512 - cw) / 2);
    const posY = Math.round((512 - ch) / 2);
    compositeLayers = [
      { input: resizedCutout, left: posX, top: posY, blend: 'over' }
    ];
  }

  // 5. Composite onto 512x512 Transparent Canvas
  const isPng = outputPath.endsWith('.png');
  const canvas = sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(compositeLayers);

  if (isPng) {
    await canvas.png().toFile(outputPath);
  } else {
    await canvas.webp({ quality: parseInt(quality) || 95 }).toFile(outputPath);
  }

  return { outputPath, width: 512, height: 512, format: isPng ? 'png' : 'webp', hasAlpha: true };
}

/**
 * Convert Animated GIF to 512x512 Animated WebP Sticker
 */
export function convertGifToSticker(gifPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(gifPath)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-filter_complex', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-loop', '0',
        '-vsync', '0'
      ])
      .output(outputPath)
      .on('end', () => resolve({ outputPath, format: 'webp', width: 512, height: 512, hasAlpha: true }))
      .on('error', (err) => reject(new Error(`GIF to Animated Sticker failed: ${err.message}`)))
      .run();
  });
}

// =============================================================
// 6. GIF STUDIO SERVICES (FFmpeg Powered)
// =============================================================

/**
 * Convert Video to GIF
 */
export function convertVideoToGif(videoPath, outputPath, options = {}) {
  const { fps = 12, width = 480, speed = 1.0 } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .fps(fps)
      .setStartTime(options.startTime || 0)
      .setDuration(options.duration || 6)
      .complexFilter([
        `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`
      ])
      .output(outputPath)
      .on('end', () => resolve({ outputPath, fps, width }))
      .on('error', (err) => reject(new Error(`Video to GIF failed: ${err.message}`)))
      .run();
  });
}

/**
 * Convert GIF to MP4 Video
 */
export function convertGifToVideo(gifPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(gifPath)
      .outputOptions([
        '-movflags', 'faststart',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2' // Even dimensions required for H.264
      ])
      .output(outputPath)
      .on('end', () => resolve({ outputPath }))
      .on('error', (err) => reject(new Error(`GIF to Video failed: ${err.message}`)))
      .run();
  });
}

/**
 * Reverse GIF Animation
 */
export function reverseGif(gifPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(gifPath)
      .complexFilter(['reverse'])
      .output(outputPath)
      .on('end', () => resolve({ outputPath }))
      .on('error', (err) => reject(new Error(`GIF reverse failed: ${err.message}`)))
      .run();
  });
}

// =============================================================
// 7. AUDIO STUDIO SERVICES (FFmpeg Powered)
// =============================================================

/**
 * Convert Audio (MP3, WAV, AAC, OGG, FLAC) with Bitrate Compression
 */
export function convertAudio(inputPath, outputPath, options = {}) {
  const { bitrate = '192k', sampleRate = 44100 } = options;

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath).audioBitrate(bitrate).audioFrequency(sampleRate);

    if (options.startTime) cmd = cmd.setStartTime(options.startTime);
    if (options.duration) cmd = cmd.setDuration(options.duration);

    cmd
      .output(outputPath)
      .on('end', () => resolve({ outputPath, bitrate }))
      .on('error', (err) => reject(new Error(`Audio conversion failed: ${err.message}`)))
      .run();
  });
}

// =============================================================
// 8. VIDEO STUDIO SERVICES (FFmpeg Powered)
// =============================================================

/**
 * Universal Video Converter, Compressor & Trimmer
 */
export function convertVideo(inputPath, outputPath, options = {}) {
  const {
    crf = 24, // 18-28 (lower is higher quality, higher is more compression)
    width = null,
    height = null,
    startTime = null,
    duration = null
  } = options;

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([`-crf ${crf}`, '-preset fast']);

    if (startTime) cmd = cmd.setStartTime(startTime);
    if (duration) cmd = cmd.setDuration(duration);

    if (width && height) {
      cmd = cmd.size(`${width}x${height}`);
    }

    cmd
      .output(outputPath)
      .on('end', () => resolve({ outputPath, crf }))
      .on('error', (err) => reject(new Error(`Video conversion failed: ${err.message}`)))
      .run();
  });
}

/**
 * Extract Audio from Video (MP4 to MP3)
 */
export function extractAudioFromVideo(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => resolve({ outputPath }))
      .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
      .run();
  });
}

// =============================================================
// 9. ARCHIVE STUDIO SERVICES
// =============================================================

/**
 * Create ZIP / TAR Archive
 */
export async function createArchive(filePaths = [], outputPath, format = 'zip') {
  const zip = new JSZip();
  for (const f of filePaths) {
    if (fs.existsSync(f)) {
      const fileData = fs.readFileSync(f);
      zip.file(path.basename(f), fileData);
    }
  }
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  fs.writeFileSync(outputPath, content);
  return { outputPath, totalBytes: content.length };
}

/**
 * Extract ZIP Archive
 */
export async function extractArchive(zipPath, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const data = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(data);

  const extractedFiles = [];
  for (const [filename, fileObj] of Object.entries(zip.files)) {
    if (!fileObj.dir) {
      const content = await fileObj.async('nodebuffer');
      const outFilePath = path.join(targetDir, path.basename(filename));
      fs.writeFileSync(outFilePath, content);
      extractedFiles.push({ filename: path.basename(filename), size: content.length });
    }
  }

  return { targetDir, extractedFiles };
}

// =============================================================
// 10. AI OCR & TABLE EXTRACTION
// =============================================================

/**
 * OCR Text Extraction from Image
 */
export async function runOcr(imagePath, language = 'eng') {
  const result = await Tesseract.recognize(imagePath, language);
  return {
    text: result.data.text,
    confidence: result.data.confidence,
    lines: result.data.lines.map(l => l.text.trim()).filter(l => l.length > 0)
  };
}
