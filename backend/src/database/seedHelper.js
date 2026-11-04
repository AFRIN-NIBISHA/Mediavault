import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from './db.js';

export async function seedUsers() {
  const checkAdmin = await query('SELECT id FROM users WHERE email = $1', ['admin@mediavault.io']);
  let adminId;
  if (checkAdmin.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AdminPassword123!', salt);
    const res = await query(
      `INSERT INTO users (email, username, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      ['admin@mediavault.io', 'admin', hash, 'admin']
    );
    adminId = res.rows[0].id;
    await query(
      `INSERT INTO user_profiles (user_id, full_name, bio, storage_limit_bytes, theme_preference)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'Platform Administrator', 'System operations and asset security manager', 53687091200, 'light']
    );
    await query(`INSERT INTO storage_usage (user_id) VALUES ($1)`, [adminId]);
    console.log('✓ Auto-seeded Admin: admin@mediavault.io / AdminPassword123!');
  } else {
    adminId = checkAdmin.rows[0].id;
  }

  const checkUser = await query('SELECT id FROM users WHERE email = $1', ['user@mediavault.io']);
  let userId;
  if (checkUser.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('UserPassword123!', salt);
    const res = await query(
      `INSERT INTO users (email, username, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      ['user@mediavault.io', 'demouser', hash, 'user']
    );
    userId = res.rows[0].id;
    await query(
      `INSERT INTO user_profiles (user_id, full_name, bio, storage_limit_bytes, theme_preference)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'Alex Vance', 'Lead Creative Technologist & Asset Specialist', 10737418240, 'light']
    );
    await query(`INSERT INTO storage_usage (user_id) VALUES ($1)`, [userId]);
    const f1 = await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, $2, $3) RETURNING id`, [userId, 'Photography 2026', '#0c87eb']);
    const f2 = await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, $2, $3) RETURNING id`, [userId, 'Documents & PDFs', '#9333ea']);
    console.log('✓ Auto-seeded Demo User: user@mediavault.io / UserPassword123!');

    // Auto-discover and register sample PDFs and photos from uploads/
    try {
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      if (fs.existsSync(uploadDir)) {
        const uploadFiles = fs.readdirSync(uploadDir);

        // Find PDFs
        const pdfFiles = uploadFiles.filter(f => f.endsWith('.pdf'));
        for (const pf of pdfFiles.slice(0, 15)) {
          const fullPath = path.join(uploadDir, pf);
          const stats = fs.statSync(fullPath);
          const cleanName = pf.includes('_') ? pf.substring(pf.indexOf('_', pf.indexOf('_') + 1) + 1) : pf;
          const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');

          await query(
            `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, is_favorite)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
            [userId, f2.rows[0].id, pf, cleanName || pf, fullPath, stats.size, 'application/pdf', 'pdfs', 'pdf', hash]
          );
        }

        // Find photos
        const photoFiles = uploadFiles.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        for (const imgF of photoFiles.slice(0, 10)) {
          const fullPath = path.join(uploadDir, imgF);
          const stats = fs.statSync(fullPath);
          const ext = path.extname(imgF).replace('.', '').toLowerCase();
          const cleanName = imgF.includes('_') ? imgF.substring(imgF.indexOf('_', imgF.indexOf('_') + 1) + 1) : imgF;
          const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');

          await query(
            `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, is_favorite)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
            [userId, f1.rows[0].id, imgF, cleanName || imgF, fullPath, stats.size, `image/${ext === 'jpg' ? 'jpeg' : ext}`, 'photos', ext, hash]
          );
        }
        console.log(`✓ Auto-seeded ${pdfFiles.length} PDFs and ${photoFiles.length} photos for demo user`);
      }
    } catch (assetErr) {
      console.warn('Could not auto-seed existing uploads:', assetErr.message);
    }
  }
}
