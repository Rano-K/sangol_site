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

const getMigrationsDirectory = async (): Promise<string> => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return findFirstExistingPath([
    path.resolve(process.cwd(), 'database/postgres/migrations'),
    path.resolve(process.cwd(), 'backend/database/postgres/migrations'),
    path.resolve(currentDir, '../../../../database/postgres/migrations'),
  ]);
};

const listSqlFileMigrations = async (): Promise<Migration[]> => {
  const migrationsDir = await getMigrationsDirectory();
  const entries = await fs.readdir(migrationsDir);
  return entries
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      id: name.replace(/\.sql$/i, ''),
      filePath: path.join(migrationsDir, name),
    }));
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

const hasAppliedMigration = async (
  client: PoolClient,
  migration: Migration,
  checksum: string,
  options?: { allowChecksumRefreshForBaseline?: boolean }
): Promise<boolean> => {
  const { rows } = await client.query<{ checksum: string }>(
    'SELECT checksum FROM schema_migrations WHERE id = $1',
    [migration.id]
  );

  if (rows.length === 0) return false;
  if (rows[0].checksum !== checksum) {
    if (options?.allowChecksumRefreshForBaseline && (await hasBaselineSchema(client))) {
      await client.query('UPDATE schema_migrations SET checksum = $1 WHERE id = $2', [checksum, migration.id]);
      console.log(`[MIGRATION] ${migration.id} checksum refreshed (init SQL changed, DB baseline kept).`);
      return true;
    }
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

const runInitialSchemaMigration = async (client: PoolClient, migration: Migration): Promise<void> => {
  const rawSql = await fs.readFile(migration.filePath, 'utf8');
  const checksum = sha256(rawSql);

  if (await hasAppliedMigration(client, migration, checksum, { allowChecksumRefreshForBaseline: true })) {
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

const runSqlFileMigration = async (client: PoolClient, migration: Migration): Promise<void> => {
  const rawSql = await fs.readFile(migration.filePath, 'utf8');
  const checksum = sha256(rawSql);

  if (await hasAppliedMigration(client, migration, checksum)) {
    console.log(`[MIGRATION] ${migration.id} already applied.`);
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
  const initialMigration: Migration = {
    id: '001_initial_postgres_schema',
    filePath: await getInitialSchemaPath(),
  };
  const sqlMigrations = await listSqlFileMigrations();

  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    await runInitialSchemaMigration(client, initialMigration);
    for (const migration of sqlMigrations) {
      await runSqlFileMigration(client, migration);
    }
    console.log('[MIGRATION] Complete.');
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error: Error) => {
  console.error('[MIGRATION] Failed:', error.message);
  process.exit(1);
});
