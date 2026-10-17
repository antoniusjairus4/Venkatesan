import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  console.log('Connecting to Neon PostgreSQL database...');
  try {
    const sql = neon(dbUrl);
    const rows = await sql`SELECT NOW() as current_time, current_database() as db_name, version() as pg_version;`;
    console.log(' Successfully connected to Neon:');
    console.log('Database:', rows[0].db_name);
    console.log('Server Time:', rows[0].current_time);
    console.log('PostgreSQL Version:', rows[0].pg_version);
  } catch (err) {
    console.error('❌ Neon connection failed:', err);
    process.exit(1);
  }
}

testConnection();

