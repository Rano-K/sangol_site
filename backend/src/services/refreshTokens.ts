import crypto from 'node:crypto';
import pool from '../config/database';
import { env } from '../config/env';

export type RefreshTokenUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'franchise';
  franchise_id: number | null;
  franchise_key: string | null;
  is_active: boolean;
};

const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const ensureRefreshTokensTableReady = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_used_at ON refresh_tokens(last_used_at DESC);'
  );
};

export const revokeRefreshTokensForUser = async (userId: number): Promise<void> => {
  await ensureRefreshTokensTableReady();
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId]
  );
};

export const createRefreshToken = async (userId: number): Promise<string> => {
  await ensureRefreshTokensTableReady();
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashRefreshToken(refreshToken);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, last_used_at)
     VALUES ($1, $2, NOW())`,
    [userId, tokenHash]
  );
  return refreshToken;
};

const isIdleExpired = (lastUsedAt: Date): boolean => {
  const idleMs = env.JWT_REFRESH_IDLE_MS;
  return Date.now() - lastUsedAt.getTime() > idleMs;
};

export const rotateRefreshToken = async (
  refreshToken: string
): Promise<{ refreshToken: string; user: RefreshTokenUser }> => {
  await ensureRefreshTokensTableReady();
  const tokenHash = hashRefreshToken(refreshToken);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{
      id: string;
      user_id: string;
      last_used_at: Date;
      email: string;
      name: string;
      role: 'admin' | 'franchise';
      franchise_id: number | null;
      franchise_key: string | null;
      is_active: boolean;
    }>(
      `SELECT
         rt.id,
         rt.user_id,
         rt.last_used_at,
         u.email,
         u.name,
         u.role,
         u.franchise_id,
         f.franchise_key,
         u.is_active
       FROM refresh_tokens rt
       INNER JOIN users u ON u.id = rt.user_id
       LEFT JOIN franchises f ON f.id = u.franchise_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
       FOR UPDATE OF rt, u`,
      [tokenHash]
    );

    if (rows.length === 0) {
      throw Object.assign(new Error('INVALID_REFRESH_TOKEN'), { code: 'INVALID_REFRESH_TOKEN' });
    }

    const row = rows[0];
    if (!row.is_active) {
      throw Object.assign(new Error('INACTIVE_USER'), { code: 'INACTIVE_USER' });
    }
    if (isIdleExpired(new Date(row.last_used_at))) {
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
      await client.query('COMMIT');
      throw Object.assign(new Error('IDLE_TIMEOUT'), { code: 'IDLE_TIMEOUT' });
    }

    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1`,
      [row.id]
    );

    const nextRefreshToken = crypto.randomBytes(48).toString('base64url');
    const nextHash = hashRefreshToken(nextRefreshToken);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, last_used_at)
       VALUES ($1, $2, NOW())`,
      [row.user_id, nextHash]
    );
    await client.query('COMMIT');

    return {
      refreshToken: nextRefreshToken,
      user: {
        id: Number(row.user_id),
        email: row.email,
        name: row.name,
        role: row.role,
        franchise_id: row.franchise_id,
        franchise_key: row.franchise_key,
        is_active: row.is_active,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  await ensureRefreshTokensTableReady();
  const tokenHash = hashRefreshToken(refreshToken);
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [tokenHash]
  );
};
