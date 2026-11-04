import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pgliteInstance = null;
let pgPoolInstance = null;
let activeMode = 'pglite';
let initialized = false;

export async function initDb() {
  if (initialized) return { activeMode };

  const uploadDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Attempt standard PostgreSQL if DATABASE_URL is present
  if (process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      // Test connection
      await pool.query('SELECT 1');
      pgPoolInstance = pool;
      activeMode = 'postgres';
      console.log(' Connected to PostgreSQL database at', process.env.DATABASE_URL.split('@')[1] || 'localhost');
    } catch (err) {
      console.warn('⚠️ Could not connect to PostgreSQL via DATABASE_URL:', err.message);
      console.log(' Falling back to embedded PGlite persistent PostgreSQL...');
    }
  }

  if (activeMode !== 'postgres') {
    const dataDir = path.resolve(__dirname, '../../data/pglite_db');
    let opened = false;
    try {
      if (fs.existsSync(dataDir)) {
        const pidFile = path.join(dataDir, 'postmaster.pid');
        const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
        if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
        if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
      } else {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      pgliteInstance = new PGlite(dataDir);
      await pgliteInstance.waitReady;
      activeMode = 'pglite';
      opened = true;
      console.log(' Embedded PostgreSQL (PGlite) active at:', dataDir);
    } catch (pgliteErr) {
      console.warn('⚠️ Could not open filesystem PGlite, activating resilient in-memory PostgreSQL engine:', pgliteErr.message);
      pgliteInstance = new PGlite();
      await pgliteInstance.waitReady;
      activeMode = 'pglite-memory';
      opened = true;
      console.log(' In-Memory PostgreSQL (PGlite) active with full schema.');
    }
  }

  // Execute schema creation
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await exec(schemaSql);
    console.log(' Database schema verified and initialized.');
  }

  // Ensure safe column types for existing tables
  try {
    await exec('ALTER TABLE file_versions ALTER COLUMN change_summary TYPE TEXT;');
    await exec('ALTER TABLE files ALTER COLUMN original_name TYPE TEXT;');
  } catch (migrationErr) {
    // Non-blocking if already altered
  }

  initialized = true;

  // Seed default templates if missing
  try {
    const { seedTemplates } = await import('./seedTemplates.js');
    await seedTemplates();
  } catch (seedErr) {
    console.warn('Template seed warning:', seedErr.message);
  }

  // If in-memory mode, auto-seed demo accounts and assets
  if (activeMode === 'pglite-memory') {
    try {
      const { seedUsers } = await import('./seedHelper.js');
      await seedUsers();
    } catch (e) {
      console.warn('Auto-seed notice:', e.message);
    }
  }

  return { activeMode };
}

export async function exec(sql) {
  if (activeMode === 'postgres' && pgPoolInstance) {
    return await pgPoolInstance.query(sql);
  } else {
    if (!pgliteInstance) {
      await initDb();
    }
    return await pgliteInstance.exec(sql);
  }
}

export async function query(text, params = []) {
  if (!initialized) {
    await initDb();
  }

  if (activeMode === 'postgres' && pgPoolInstance) {
    const res = await pgPoolInstance.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.rowCount || 0
    };
  } else {
    const res = await pgliteInstance.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: (res.rows && res.rows.length) || res.affectedRows || 0
    };
  }
}

export async function closeDb() {
  if (pgPoolInstance) {
    await pgPoolInstance.end();
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
  }
  initialized = false;
}

export default {
  query,
  exec,
  initDb,
  closeDb,
  getMode: () => activeMode
};
