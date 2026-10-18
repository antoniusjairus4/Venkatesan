import { neon, neonConfig } from '@neondatabase/serverless';
import 'dotenv/config';

// Disable stale connection caching to prevent 'TypeError: fetch failed' on idle timeouts
neonConfig.fetchConnectionCache = false;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️ DATABASE_URL is not defined in environment variables.');
}

export const sql = neon(databaseUrl || '');

