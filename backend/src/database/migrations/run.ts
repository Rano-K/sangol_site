import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, PoolClient } from 'pg';
import { env } from '../../config/env';

type Migration = {
  id: string;
  filePath: string;
};

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 1,
});

const findFirstExistingPath = async (candidates: string[]): Promise<string> => {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_error) {
      // Try the next candidate.
    }
  }

  throw new Error(`[MIGRATION] Could not find SQL file. checked=${candidates.join(', ')}`);
};

const getInitialSchemaPath = async (): Promise<string> => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return findFirstExistingPath([
    path.resolve(process.cwd(), 'database/postgres/init/01_schema.sql'),
    path.resolve(process.cwd(), 'backend/database/postgres/init/01_schema.sql'),
    path.resolve(currentDir, '../../../../database/postgres/init/01_schema.sql'),
  ]);
};

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const stripOuterTransaction = (sql: string): string =>
  sql
    .replace(/(^|\n)\s*BEGIN;\s*(?=\n)/i, '$1')
    .replace(/(^|\n)\s*COMMIT;\s*$/i, '$1')
    .trim();

const ensureMigrationTable = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const hasAppliedMigration = async (client: PoolClient, migration: Migration, checksum: string): Promise<boolean> => {
  const { rows } = await client.query<{ checksum: string }>(
    'SELECT checksum FROM schema_migrations WHERE id = $1',
    [migration.id]
  );

  if (rows.length === 0) return false;
  if (rows[0].checksum !== checksum) {
    throw new Error(`[MIGRATION] ${migration.id} checksum changed after it was applied.`);
  }
  return true;
};

const hasBaselineSchema = async (client: PoolClient): Promise<boolean> => {
  const { rows } = await client.query<{ is_ready: boolean }>(`
    SELECT
      to_regtype('public.user_role') IS NOT NULL
      AND to_regtype('public.order_status') IS NOT NULL
      AND to_regtype('public.stock_status') IS NOT NULL
      AND to_regclass('public.franchises') IS NOT NULL
      AND to_regclass('public.users') IS NOT NULL
      AND to_regclass('public.products') IS NOT NULL
      AND to_regclass('public.orders') IS NOT NULL
      AND to_regclass('public.notices') IS NOT NULL
      AND to_regclass('public.inquiries') IS NOT NULL
      AS is_ready;
  `);

  return rows[0]?.is_ready === true;
};

const markMigrationApplied = async (client: PoolClient, migration: Migration, checksum: string): Promise<void> => {
  await client.query(
    `INSERT INTO schema_migrations (id, checksum)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [migration.id, checksum]
  );
};

const runMigration = async (client: PoolClient, migration: Migration): Promise<void> => {
  const rawSql = await fs.readFile(migration.filePath, 'utf8');
  const checksum = sha256(rawSql);

  if (await hasAppliedMigration(client, migration, checksum)) {
    console.log(`[MIGRATION] ${migration.id} already applied.`);
    return;
  }

  if (await hasBaselineSchema(client)) {
    await markMigrationApplied(client, migration, checksum);
    console.log(`[MIGRATION] ${migration.id} marked as applied for existing baseline schema.`);
    return;
  }

  await client.query('BEGIN');
  try {
    await client.query(stripOuterTransaction(rawSql));
    await markMigrationApplied(client, migration, checksum);
    await client.query('COMMIT');
    console.log(`[MIGRATION] ${migration.id} applied.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const main = async (): Promise<void> => {
  const migrations: Migration[] = [
    {
      id: '001_initial_postgres_schema',
      filePath: await getInitialSchemaPath(),
    },
  ];

  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    for (const migration of migrations) {
      await runMigration(client, migration);
    }
    console.log('[MIGRATION] Complete.');
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch(async (error: Error) => {
  console.error('[MIGRATION] Failed:', error.message);
  await pool.end();
  process.exit(1);
});
