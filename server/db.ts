import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export async function ensureTablesExist(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS library_corpora (
        id serial PRIMARY KEY NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        origin text DEFAULT 'user' NOT NULL,
        source_track text,
        language_pair text,
        domain text,
        size_label text,
        license text,
        external_url text,
        sample_pairs jsonb,
        created_at timestamp DEFAULT now()
      )
    `);
  } finally {
    client.release();
  }
}
