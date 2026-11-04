import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query, closeDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  await initDb();
  console.log('Seeding initial users and demo content...');

  const uploadDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 1. Check if admin exists
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
      [adminId, 'Platform Administrator', 'System operations and asset security manager', 53687091200, 'dark']
    );
    await query(`INSERT INTO storage_usage (user_id) VALUES ($1)`, [adminId]);
    console.log('✓ Created Admin: admin@mediavault.io / AdminPassword123!');
  } else {
    adminId = checkAdmin.rows[0].id;
  }

  // 2. Check if regular user exists
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
    console.log('✓ Created Demo User: user@mediavault.io / UserPassword123!');

    // Create default folders for demo user
    const f1 = await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, $2, $3) RETURNING id`, [userId, 'Photography 2026', '#0c87eb']);
    const f2 = await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, $2, $3) RETURNING id`, [userId, 'Financial Documents', '#10b981']);
    const f3 = await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, $2, $3) RETURNING id`, [userId, 'Project Blueprints', '#8b5cf6']);

    // Create default collections
    await query(`INSERT INTO collections (user_id, name, description, color) VALUES ($1, $2, $3, $4)`, [
      userId,
      'Key Assets Q1',
      'High priority deliverables and presentations',
      '#0c87eb'
    ]);

    // Create default album
    await query(`INSERT INTO albums (user_id, name, description) VALUES ($1, $2, $3)`, [
      userId,
      'Portfolio Highlights',
      'Selected photography for showcase'
    ]);

    // Generate sample files
    // 1. Sample text document
    const docName = `Project_Architecture_Overview_${Date.now()}.txt`;
    const docPath = path.join(uploadDir, docName);
    const docContent = `MediaVault Platform Architecture\n===============================\nVersion: 1.0.0\nGenerated: ${new Date().toISOString()}\n\nMediaVault provides enterprise-grade digital asset management with advanced image editing, PDF manipulation, cryptographic and perceptual duplicate detection, and secure time-limited sharing.\n`;
    fs.writeFileSync(docPath, docContent, 'utf8');
    const docSize = Buffer.byteLength(docContent);
    const docHash = crypto.createHash('sha256').update(docContent).digest('hex');

    const fileDocRes = await query(
      `INSERT INTO files (user_id, folder_id, filename, original_name, file_path, file_size, mime_type, file_category, extension, file_hash, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING id`,
      [userId, f3.rows[0].id, docName, 'Project_Architecture_Overview.txt', docPath, docSize, 'text/plain', 'documents', 'txt', docHash]
    );

    // Initial version
    await query(
      `INSERT INTO file_versions (file_id, version_number, file_path, file_size, change_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fileDocRes.rows[0].id, 1, docPath, docSize, 'Initial document creation', userId]
    );

    // Activity log
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'upload', 'file', fileDocRes.rows[0].id, JSON.stringify({ filename: 'Project_Architecture_Overview.txt', size: docSize })]
    );

    // Update storage usage
    await query(
      `UPDATE storage_usage SET total_bytes = $1, documents_bytes = $1, last_calculated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [docSize, userId]
    );

    console.log('✓ Created initial folders, collections, and sample assets for demouser');
  }

  console.log('Database seeding complete!');
  await closeDb();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});

