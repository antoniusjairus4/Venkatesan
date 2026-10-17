import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
  const rawSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip single-line comments so comments at the start of a block do not cause statement dropping
  const cleanSql = rawSql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  console.log('Running Neon PostgreSQL migration...');
  const sql = neon(dbUrl);

  try {
    const statements = cleanSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      const preview = stmt.split('\n')[0].substring(0, 70);
      console.log(`Executing: ${preview}...`);
      await sql.query(stmt);
    }

    console.log('\n Migration successfully executed!');
    
    // Verify tables created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('\n Current Tables in Neon neondb:');
    tables.forEach((t) => console.log(`  ✓ ${t.table_name}`));

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();

