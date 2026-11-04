import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { initDb, query, closeDb } from './db.js';
import { calculateSha256, calculatePerceptualHash } from '../services/hashService.js';
import { recalculateUserStorage } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function seedDemoAssets() {
  await initDb();
  console.log('Seeding rich demo assets for MediaVault...');

  // 1. Get user and folders
  const userRes = await query("SELECT id FROM users WHERE email = 'user@mediavault.io'");
  if (userRes.rows.length === 0) {
    console.error('Demo user not found. Run npm run db:seed first.');
    await closeDb();
    return;
  }
  const userId = userRes.rows[0].id;

  const foldersRes = await query('SELECT id, name FROM folders WHERE user_id = $1', [userId]);
  const folders = foldersRes.rows.reduce((acc, f) => ({ ...acc, [f.name]: f.id }), {});

  const photoFolderId = folders['Photography 2026'] || null;
  const docsFolderId = folders['Financial Documents'] || null;
  const blueFolderId = folders['Project Blueprints'] || null;

  const albumRes = await query('SELECT id FROM albums WHERE user_id = $1 LIMIT 1', [userId]);
  const albumId = albumRes.rows.length > 0 ? albumRes.rows[0].id : null;

  // 2. Generate Photo 1: Sunset Mountain Vista (JPEG)
  const svg1 = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#9333ea;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#c084fc;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f472b6;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g1)" />
    <polygon points="100,500 350,220 550,500" fill="#3b0764" fill-opacity="0.8" />
    <polygon points="300,500 520,180 750,500" fill="#581c87" fill-opacity="0.7" />
    <circle cx="650" cy="160" r="70" fill="#fef08a" />
    <text x="400" y="550" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">Sunset Peaks • High Definition</text>
  </svg>`;
  const p1Filename = `photo_sunset_${Date.now()}.jpg`;
  const p1Path = path.join(uploadDir, p1Filename);
  await sharp(Buffer.from(svg1)).jpeg({ quality: 92 }).toFile(p1Path);
  const p1Stats = fs.statSync(p1Path);
  const p1Sha = await calculateSha256(p1Path);
  const p1Dhash = await calculatePerceptualHash(p1Path);

  const file1 = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, 'image/jpeg', 'photos', 'jpg', $7, $8, true) RETURNING id`,
    [userId, photoFolderId, p1Filename, 'Sunset_Peaks_Landscape.jpg', p1Path, p1Stats.size, p1Sha, p1Dhash]
  );
  await query('INSERT INTO file_metadata (file_id, width, height, format) VALUES ($1, 800, 600, $2)', [file1.rows[0].id, 'jpeg']);
  await query('INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by) VALUES ($1, $2, $3, $4, $5, $6)', [
    file1.rows[0].id, 1, p1Path, p1Stats.size, 'Original asset upload', userId
  ]);
  if (albumId) {
    await query('INSERT INTO album_files (album_id, file_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [albumId, file1.rows[0].id]);
  }
  console.log('✓ Created Photo 1: Sunset_Peaks_Landscape.jpg');

  // 3. Generate Photo 2: Cyber Interface (PNG)
  const svg2 = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1e1b4b;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g2)" />
    <circle cx="400" cy="300" r="180" stroke="#a855f7" stroke-width="6" fill="none" />
    <circle cx="400" cy="300" r="100" stroke="#06b6d4" stroke-width="4" stroke-dasharray="12,12" fill="none" />
    <text x="400" y="305" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#38bdf8" text-anchor="middle">CYBER_NETWORK_MATRIX</text>
    <text x="400" y="340" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">Node Verified • SHA-256 Engine</text>
  </svg>`;
  const p2Filename = `photo_matrix_${Date.now()}.png`;
  const p2Path = path.join(uploadDir, p2Filename);
  await sharp(Buffer.from(svg2)).png().toFile(p2Path);
  const p2Stats = fs.statSync(p2Path);
  const p2Sha = await calculateSha256(p2Path);
  const p2Dhash = await calculatePerceptualHash(p2Path);

  const file2 = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, 'image/png', 'photos', 'png', $7, $8, true) RETURNING id`,
    [userId, blueFolderId, p2Filename, 'Cyber_Network_Interface.png', p2Path, p2Stats.size, p2Sha, p2Dhash]
  );
  await query('INSERT INTO file_metadata (file_id, width, height, format) VALUES ($1, 800, 600, $2)', [file2.rows[0].id, 'png']);
  await query('INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by) VALUES ($1, $2, $3, $4, $5, $6)', [
    file2.rows[0].id, 1, p2Path, p2Stats.size, 'Original asset upload', userId
  ]);
  if (albumId) {
    await query('INSERT INTO album_files (album_id, file_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [albumId, file2.rows[0].id]);
  }
  console.log('✓ Created Photo 2: Cyber_Network_Interface.png');

  // 4. Generate Exact Duplicate of Photo 1 (Tests Exact Duplicate Detection)
  const p3Filename = `photo_sunset_copy_${Date.now()}.jpg`;
  const p3Path = path.join(uploadDir, p3Filename);
  fs.copyFileSync(p1Path, p3Path);
  const p3Stats = fs.statSync(p3Path);

  const file3 = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
     VALUES ($1, $2, $3, $4, $5, $6, 'image/jpeg', 'photos', 'jpg', $7, $8) RETURNING id`,
    [userId, photoFolderId, p3Filename, 'Sunset_Peaks_Landscape (Copy).jpg', p3Path, p3Stats.size, p1Sha, p1Dhash]
  );
  await query('INSERT INTO file_metadata (file_id, width, height, format) VALUES ($1, 800, 600, $2)', [file3.rows[0].id, 'jpeg']);
  console.log('✓ Created Duplicate 1 (Exact): Sunset_Peaks_Landscape (Copy).jpg');

  // 5. Generate Perceptual Duplicate (Re-compressed/dHash match)
  const p4Filename = `photo_sunset_compressed_${Date.now()}.jpg`;
  const p4Path = path.join(uploadDir, p4Filename);
  await sharp(p1Path).jpeg({ quality: 65 }).toFile(p4Path);
  const p4Stats = fs.statSync(p4Path);
  const p4Sha = await calculateSha256(p4Path);
  const p4Dhash = await calculatePerceptualHash(p4Path);

  const file4 = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, perceptual_hash)
     VALUES ($1, $2, $3, $4, $5, $6, 'image/jpeg', 'photos', 'jpg', $7, $8) RETURNING id`,
    [userId, photoFolderId, p4Filename, 'Sunset_Peaks_WebCompress.jpg', p4Path, p4Stats.size, p4Sha, p4Dhash]
  );
  await query('INSERT INTO file_metadata (file_id, width, height, format) VALUES ($1, 800, 600, $2)', [file4.rows[0].id, 'jpeg']);
  console.log('✓ Created Duplicate 2 (Perceptual dHash): Sunset_Peaks_WebCompress.jpg');

  // 6. Generate Real Multi-Page PDF 1: MediaVault System Manual
  const pdf1Doc = await PDFDocument.create();
  const font = await pdf1Doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf1Doc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const page1 = pdf1Doc.addPage([612, 792]);
  page1.drawText('MEDIAVAULT USER MANUAL', { x: 50, y: 720, size: 26, font, color: rgb(0.58, 0.2, 0.92) });
  page1.drawText('Unified Digital Asset & File Management Platform', { x: 50, y: 680, size: 14, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page1.drawText('Chapter 1: Photo Toolkit & High Precision Processing', { x: 50, y: 620, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText('This chapter covers interactive image cropping, color grading (brightness, contrast,', { x: 50, y: 580, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page1.drawText('saturation), artistic filters (sepia, grayscale, invert, vintage), and SVG watermarking.', { x: 50, y: 560, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  // Page 2
  const page2 = pdf1Doc.addPage([612, 792]);
  page2.drawText('Chapter 2: Cryptographic Duplicate Detection', { x: 50, y: 720, size: 18, font, color: rgb(0.58, 0.2, 0.92) });
  page2.drawText('MediaVault computes SHA-256 for byte-level redundancy and 64-bit dHash for perceptual matching.', { x: 50, y: 670, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText('Users can review side-by-side previews and safely move redundant assets to the Recycle Bin.', { x: 50, y: 640, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  const pdf1Bytes = await pdf1Doc.save();
  const pdf1Filename = `manual_${Date.now()}.pdf`;
  const pdf1Path = path.join(uploadDir, pdf1Filename);
  fs.writeFileSync(pdf1Path, pdf1Bytes);
  const pdf1Sha = await calculateSha256(pdf1Path);

  const filePdf1 = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 'pdfs', 'pdf', $7, true) RETURNING id`,
    [userId, docsFolderId, pdf1Filename, 'MediaVault_System_Manual.pdf', pdf1Path, pdf1Bytes.length, pdf1Sha]
  );
  await query('INSERT INTO file_metadata (file_id, page_count, format) VALUES ($1, 2, $2)', [filePdf1.rows[0].id, 'pdf']);
  console.log('✓ Created PDF 1: MediaVault_System_Manual.pdf (2 Pages)');

  // 7. Generate Real Multi-Page PDF 2: Engineering Final Project Report
  const pdf2Doc = await PDFDocument.create();
  const pA = pdf2Doc.addPage([612, 792]);
  pA.drawText('ENGINEERING CAPSTONE PROJECT REPORT', { x: 50, y: 720, size: 22, font, color: rgb(0.1, 0.4, 0.8) });
  pA.drawText('Unified Platform for Visual & File Asset Governance', { x: 50, y: 680, size: 13, font: fontRegular });
  pA.drawText('Section 3.2: Performance benchmarks under high load testing.', { x: 50, y: 620, size: 12, font: fontRegular });

  const pB = pdf2Doc.addPage([612, 792]);
  pB.drawText('System Specifications & Schema Verification', { x: 50, y: 720, size: 16, font, color: rgb(0.1, 0.4, 0.8) });
  pB.drawText('All file mutations are tracked in file_versions with complete rollback capability.', { x: 50, y: 670, size: 12, font: fontRegular });

  const pdf2Bytes = await pdf2Doc.save();
  const pdf2Filename = `report_${Date.now()}.pdf`;
  const pdf2Path = path.join(uploadDir, pdf2Filename);
  fs.writeFileSync(pdf2Path, pdf2Bytes);
  const pdf2Sha = await calculateSha256(pdf2Path);

  const filePdf2 = await query(
    `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash)
     VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 'pdfs', 'pdf', $7) RETURNING id`,
    [userId, docsFolderId, pdf2Filename, 'Engineering_Project_Report.pdf', pdf2Path, pdf2Bytes.length, pdf2Sha]
  );
  await query('INSERT INTO file_metadata (file_id, page_count, format) VALUES ($1, 2, $2)', [filePdf2.rows[0].id, 'pdf']);
  console.log('✓ Created PDF 2: Engineering_Project_Report.pdf (2 Pages)');

  // 8. Recalculate user storage metrics
  await recalculateUserStorage(userId);
  console.log('✓ Storage consumption recalculated for demouser!');

  console.log('All rich demo assets successfully created!');
  await closeDb();
}

seedDemoAssets().catch(err => {
  console.error('Seed demo assets error:', err);
  process.exit(1);
});
