import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../shared/schema';

const { Pool } = pg;

function createDb() {
  if (!process.env.DATABASE_URL) {
    return new Proxy({} as import('drizzle-orm/node-postgres').NodePgDatabase<typeof schema>, {
      get(_, prop) {
        throw new Error('DATABASE_URL environment variable is not set. Set it to use database features.');
      },
    });
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema });
}

export const db = createDb();
  