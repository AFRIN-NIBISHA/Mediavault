import { initDb, query, closeDb } from './db.js';

async function main() {
  try {
    console.log('Initializing database...');
    await initDb();
    const result = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('Tables initialized successfully:', result.rows.map(r => r.table_name));
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();

