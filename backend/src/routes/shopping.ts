import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { env } from '../config/env';

const router = express.Router();

type SummaryRow = {
  wishlist_count: string;
  cart_count: string;
};

type ShoppingOwner = {
  userId: number | null;
  clientKey: string | null;
};

let shoppingInitPromise: Promise<void> | null = null;

const ensureShoppingTablesReady = async (): Promise<void> => {
  if (!shoppingInitPromise) {
    shoppingInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wishlist_items (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
          client_key VARCHAR(120),
          product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (client_key, product_id)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
          client_key VARCHAR(120),
          product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (client_key, product_id)
        );
      `);

      await pool.query('ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users (id) ON DELETE CASCADE;');
      await pool.query('ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users (id) ON DELETE CASCADE;');
      await pool.query('ALTER TABLE wishlist_items ALTER COLUMN client_key DROP NOT NULL;');
      await pool.query('ALTER TABLE cart_items ALTER COLUMN client_key DROP NOT NULL;');
      await pool.query('ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_client_key_product_id_key;');
      await pool.query('ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_client_key_product_id_key;');
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'wishlist_items_owner_ck'
          ) THEN
            ALTER TABLE wishlist_items
            ADD CONSTRAINT wishlist_items_owner_ck CHECK (
              user_id IS NOT NULL OR client_key IS NOT NULL
            );
          END IF;
        END$$;
      `);
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'cart_items_owner_ck'
          ) THEN
            ALTER TABLE cart_items
            ADD CONSTRAINT cart_items_owner_ck CHECK (
              user_id IS NOT NULL OR client_key IS NOT NULL
            );
          END IF;
        END$$;
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_items_user_product
        ON wishlist_items (user_id, product_id)
        WHERE user_id IS NOT NULL;
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_items_client_product
        ON wishlist_items (client_key, product_id)
        WHERE user_id IS NULL AND client_key IS NOT NULL;
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_user_product
        ON cart_items (user_id, product_id)
        WHERE user_id IS NOT NULL;
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_client_product
        ON cart_items (client_key, product_id)
        WHERE user_id IS NULL AND client_key IS NOT NULL;
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_wishlist_items_client ON wishlist_items (client_key, created_at DESC);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items (user_id, created_at DESC);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cart_items_client ON cart_items (client_key, updated_at DESC);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items (user_id, updated_at DESC);
      `);
    })();
  }

  try {
    await shoppingInitPromise;
  } catch (error) {
    shoppingInitPromise = null;
    throw error;
  }
};

const getClientKey = (req: Request): string | null => {
  const rawValue = req.headers['x-client-key'];
  if (!rawValue) return null;
  const key = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const trimmed = key.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
};

const getUserIdFromToken = (req: Request): number | null => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id?: number | string };
    const parsedId = Number(decoded?.id);
    if (!Number.isInteger(parsedId) || parsedId < 1) return null;
    return parsedId;
  } catch (_error) {
    return null;
  }
};

const resolveOwner = (req: Request): ShoppingOwner => {
  const userId = getUserIdFromToken(req);
  if (userId) return { userId, clientKey: null };
  const clientKey = getClientKey(req);
  return { userId: null, clientKey };
};

const requireOwner = (req: Request, res: Response): ShoppingOwner | null => {
  const owner = resolveOwner(req);
  if (!owner.userId && !owner.clientKey) {
    res.status(400).json({ error: '로그인 또는 클라이언트 키(x-client-key)가 필요합니다.' });
    return null;
  }
  return owner;
};

const ownerWhere = (owner: ShoppingOwner): { clause: string; value: string | number } => {
  if (owner.userId) return { clause: 'user_id = $1', value: owner.userId };
  return { clause: 'user_id IS NULL AND client_key = $1', value: owner.clientKey as string };
};

router.get('/summary', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;
  const where = ownerWhere(owner);

  try {
    const { rows } = await pool.query<SummaryRow>(
      `SELECT
         (SELECT COUNT(*)::text FROM wishlist_items WHERE ${where.clause}) AS wishlist_count,
         (SELECT COALESCE(SUM(quantity), 0)::text FROM cart_items WHERE ${where.clause}) AS cart_count`,
      [where.value]
    );

    res.json({
      wishlistCount: Number(rows[0]?.wishlist_count ?? 0),
      cartCount: Number(rows[0]?.cart_count ?? 0),
    });
  } catch (error) {
    console.error('Get shopping summary error:', error);
    res.status(500).json({ error: '장바구니/관심 요약 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/wishlist', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;
  const where = ownerWhere(owner);

  try {
    const { rows } = await pool.query(
      `SELECT w.product_id, w.created_at, p.name, p.price, p.image_url
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       WHERE ${where.clause.replace('user_id', 'w.user_id').replace('client_key', 'w.client_key')}
       ORDER BY w.created_at DESC`,
      [where.value]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: '관심 상품 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/wishlist', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;

  const productId = Number(req.body?.productId);
  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({ error: '유효한 상품 ID가 필요합니다.' });
    return;
  }

  try {
    if (owner.userId) {
      await pool.query(
        `INSERT INTO wishlist_items (user_id, client_key, product_id)
         VALUES ($1, NULL, $2)
         ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL
         DO NOTHING`,
        [owner.userId, productId]
      );
    } else {
      await pool.query(
        `INSERT INTO wishlist_items (user_id, client_key, product_id)
         VALUES (NULL, $1, $2)
         ON CONFLICT (client_key, product_id) WHERE user_id IS NULL AND client_key IS NOT NULL
         DO NOTHING`,
        [owner.clientKey, productId]
      );
    }
    res.status(201).json({ message: '관심 상품에 추가되었습니다.' });
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ error: '관심 상품 추가 중 오류가 발생했습니다.' });
  }
});

router.delete('/wishlist/:productId', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;
  const where = ownerWhere(owner);

  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({ error: '유효한 상품 ID가 필요합니다.' });
    return;
  }

  try {
    await pool.query(
      `DELETE FROM wishlist_items WHERE ${where.clause} AND product_id = $2`,
      [where.value, productId]
    );
    res.json({ message: '관심 상품에서 제거되었습니다.' });
  } catch (error) {
    console.error('Remove wishlist error:', error);
    res.status(500).json({ error: '관심 상품 삭제 중 오류가 발생했습니다.' });
  }
});

router.get('/cart', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;
  const where = ownerWhere(owner);

  try {
    const { rows } = await pool.query(
      `SELECT c.product_id, c.quantity, c.updated_at, p.name, p.price, p.image_url
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       WHERE ${where.clause.replace('user_id', 'c.user_id').replace('client_key', 'c.client_key')}
       ORDER BY c.updated_at DESC`,
      [where.value]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: '장바구니 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/cart', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;

  const productId = Number(req.body?.productId);
  const quantity = Number(req.body?.quantity ?? 1);

  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({ error: '유효한 상품 ID가 필요합니다.' });
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    res.status(400).json({ error: '수량은 1 이상이어야 합니다.' });
    return;
  }

  try {
    if (owner.userId) {
      await pool.query(
        `INSERT INTO cart_items (user_id, client_key, product_id, quantity)
         VALUES ($1, NULL, $2, $3)
         ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL
         DO UPDATE SET
           quantity = cart_items.quantity + EXCLUDED.quantity,
           updated_at = NOW()`,
        [owner.userId, productId, quantity]
      );
    } else {
      await pool.query(
        `INSERT INTO cart_items (user_id, client_key, product_id, quantity)
         VALUES (NULL, $1, $2, $3)
         ON CONFLICT (client_key, product_id) WHERE user_id IS NULL AND client_key IS NOT NULL
         DO UPDATE SET
           quantity = cart_items.quantity + EXCLUDED.quantity,
           updated_at = NOW()`,
        [owner.clientKey, productId, quantity]
      );
    }
    res.status(201).json({ message: '장바구니에 담았습니다.' });
  } catch (error) {
    console.error('Add cart error:', error);
    res.status(500).json({ error: '장바구니 추가 중 오류가 발생했습니다.' });
  }
});

router.patch('/cart/:productId', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;
  const where = ownerWhere(owner);

  const productId = Number(req.params.productId);
  const quantity = Number(req.body?.quantity);

  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({ error: '유효한 상품 ID가 필요합니다.' });
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    res.status(400).json({ error: '수량은 1 이상이어야 합니다.' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE cart_items
       SET quantity = $1, updated_at = NOW()
       WHERE ${where.clause} AND product_id = $3`,
      [quantity, where.value, productId]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: '장바구니 항목을 찾을 수 없습니다.' });
      return;
    }
    res.json({ message: '장바구니 수량이 변경되었습니다.' });
  } catch (error) {
    console.error('Update cart quantity error:', error);
    res.status(500).json({ error: '장바구니 수량 변경 중 오류가 발생했습니다.' });
  }
});

router.delete('/cart/:productId', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const owner = requireOwner(req, res);
  if (!owner) return;
  const where = ownerWhere(owner);

  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({ error: '유효한 상품 ID가 필요합니다.' });
    return;
  }

  try {
    await pool.query(
      `DELETE FROM cart_items WHERE ${where.clause} AND product_id = $2`,
      [where.value, productId]
    );
    res.json({ message: '장바구니 항목이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ error: '장바구니 항목 삭제 중 오류가 발생했습니다.' });
  }
});

router.post('/sync-guest', async (req: Request, res: Response) => {
  await ensureShoppingTablesReady();
  const userId = getUserIdFromToken(req);
  const guestKey = getClientKey(req);

  if (!userId) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return;
  }
  if (!guestKey) {
    res.status(400).json({ error: '동기화할 클라이언트 키(x-client-key)가 필요합니다.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO wishlist_items (user_id, client_key, product_id)
       SELECT $1, NULL, product_id
       FROM wishlist_items
       WHERE user_id IS NULL AND client_key = $2
       ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL
       DO NOTHING`,
      [userId, guestKey]
    );
    await client.query(
      'DELETE FROM wishlist_items WHERE user_id IS NULL AND client_key = $1',
      [guestKey]
    );

    await client.query(
      `INSERT INTO cart_items (user_id, client_key, product_id, quantity)
       SELECT $1, NULL, product_id, quantity
       FROM cart_items
       WHERE user_id IS NULL AND client_key = $2
       ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL
       DO UPDATE SET
         quantity = cart_items.quantity + EXCLUDED.quantity,
         updated_at = NOW()`,
      [userId, guestKey]
    );
    await client.query(
      'DELETE FROM cart_items WHERE user_id IS NULL AND client_key = $1',
      [guestKey]
    );

    await client.query('COMMIT');
    res.json({ message: '비로그인 데이터를 계정으로 동기화했습니다.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sync guest shopping error:', error);
    res.status(500).json({ error: '비로그인 데이터 동기화 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

export default router;
