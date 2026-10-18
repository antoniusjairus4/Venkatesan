import { neon, neonConfig } from '@neondatabase/serverless';
import 'dotenv/config';

// Disable stale connection caching to prevent 'TypeError: fetch failed' on idle timeouts
neonConfig.fetchConnectionCache = false;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️ DATABASE_URL is not defined in environment variables.');
}

const rawSql = neon(databaseUrl || '');

export const sql = async (strings, ...values) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await rawSql(strings, ...values);
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 600 * attempts));
    }
  }
};

