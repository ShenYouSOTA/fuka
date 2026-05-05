import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const migration = readFileSync(
    join(__dirname, '001_initial.sql'),
    'utf-8'
  );

  await pool.query(migration);
  console.log('Migration completed');
  await pool.end();
}

migrate().catch(console.error);
