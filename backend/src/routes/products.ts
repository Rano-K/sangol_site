import express, { Request, Response } from 'express';
import pool from '../config/database';
import { canViewWipProducts, optionalAuthenticateToken } from '../middleware/auth';
import { buildPublicApiUrl, publicApiBaseUrl } from '../utils/publicUrls';

const router = express.Router();
const WIP_CATEGORY_NAME = '재공품';

router.use(optionalAuthenticateToken);

const wipVisibilitySql = (tableAlias: string, paramIndex: number): string =>
  ` AND (${tableAlias}.category <> $${paramIndex} OR $${paramIndex + 1}::boolean IS TRUE)`;

const ensureProductColumnsReady = async (): Promise<void> => {
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS note TEXT;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_data BYTEA;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(120);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_original_name VARCHAR(255);');
};

const ensureProductImageTableReady = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      image_url TEXT,
      image_data BYTEA,
      image_mime_type VARCHAR(120),
      image_original_name VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, display_order ASC, id ASC);');
};

const buildProductImageUrl = (productId: number | string): string =>
  buildPublicApiUrl(`/products/${productId}/image-file`);

// 모든 상품 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureProductColumnsReady();
    await ensureProductImageTableReady();
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const searchQ = rawQ.length > 0 ? `%${rawQ}%` : null;
    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : null;
    const rawOffset = typeof req.query.offset === 'string' ? Number(req.query.offset) : null;
    const hasPagination = Number.isFinite(rawLimit) && Number.isFinite(rawOffset);
    const limit = hasPagination ? Math.max(1, Math.min(100, Number(rawLimit))) : null;
    const offset = hasPagination ? Math.max(0, Number(rawOffset)) : null;

    const includeWip = canViewWipProducts(req);

    if (hasPagination && limit !== null && offset !== null) {
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM products p
         WHERE p.is_active = TRUE
           ${wipVisibilitySql('p', 2)}
           AND (
             $1::text IS NULL
             OR p.product_code ILIKE $1
             OR p.name ILIKE $1
             OR p.category ILIKE $1
             OR COALESCE(p.description, '') ILIKE $1
           )`,
        [searchQ, WIP_CATEGORY_NAME, includeWip]
      );
      const total = Number(countResult.rows[0]?.total || 0);

      const { rows } = await pool.query(
        `SELECT
           p.*,
           p.image_data IS NOT NULL AS has_db_image,
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', pi.id,
                 'image_url', CASE
                   WHEN pi.image_data IS NOT NULL THEN CONCAT($4::text, '/products/images/', pi.id, '/file')
                   ELSE pi.image_url
                 END,
                 'is_primary', pi.is_primary,
                 'display_order', pi.display_order
               )
               ORDER BY pi.display_order ASC, pi.id ASC
             ) FILTER (WHERE pi.id IS NOT NULL),
             '[]'::json
           ) AS image_items
         FROM products p
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.is_active = TRUE
           ${wipVisibilitySql('p', 5)}
           AND (
             $1::text IS NULL
             OR p.product_code ILIKE $1
             OR p.name ILIKE $1
             OR p.category ILIKE $1
             OR COALESCE(p.description, '') ILIKE $1
           )
         GROUP BY p.id
         ORDER BY p.category, p.name
         LIMIT $2 OFFSET $3`,
        [searchQ, limit, offset, publicApiBaseUrl, WIP_CATEGORY_NAME, includeWip]
      );

      const items = rows.map((row: any) => ({
        ...row,
        image_items: Array.isArray(row.image_items) ? row.image_items : [],
        image_url: row.has_db_image ? buildProductImageUrl(row.id) : row.image_url,
      }));

      res.json({
        items,
        total,
        limit,
        offset,
        hasMore: offset + items.length < total,
      });
      return;
    }

    const { rows } = await pool.query(
      `SELECT
         p.*,
         p.image_data IS NOT NULL AS has_db_image,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id', pi.id,
               'image_url', CASE
                 WHEN pi.image_data IS NOT NULL THEN CONCAT($2::text, '/products/images/', pi.id, '/file')
                 ELSE pi.image_url
               END,
               'is_primary', pi.is_primary,
               'display_order', pi.display_order
             )
             ORDER BY pi.display_order ASC, pi.id ASC
           ) FILTER (WHERE pi.id IS NOT NULL),
           '[]'::json
         ) AS image_items
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.is_active = TRUE
         ${wipVisibilitySql('p', 3)}
         AND (
           $1::text IS NULL
           OR p.product_code ILIKE $1
           OR p.name ILIKE $1
           OR p.category ILIKE $1
           OR COALESCE(p.description, '') ILIKE $1
         )
       GROUP BY p.id
       ORDER BY p.category, p.name`,
      [searchQ, publicApiBaseUrl, WIP_CATEGORY_NAME, includeWip]
    );
    res.json(
      rows.map((row: any) => ({
        ...row,
        image_items: Array.isArray(row.image_items) ? row.image_items : [],
        image_url: row.has_db_image ? buildProductImageUrl(row.id) : row.image_url,
      }))
    );
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: '상품 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 카테고리별 상품 조회
router.get('/category/:category', async (req: Request, res: Response) => {
  const { category } = req.params;

  if (category === WIP_CATEGORY_NAME && !canViewWipProducts(req)) {
    res.json([]);
    return;
  }

  try {
    await ensureProductColumnsReady();
    await ensureProductImageTableReady();
    const { rows } = await pool.query(
      `SELECT
         p.*,
         p.image_data IS NOT NULL AS has_db_image,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id', pi.id,
               'image_url', CASE
                 WHEN pi.image_data IS NOT NULL THEN CONCAT($2::text, '/products/images/', pi.id, '/file')
                 ELSE pi.image_url
               END,
               'is_primary', pi.is_primary,
               'display_order', pi.display_order
             )
             ORDER BY pi.display_order ASC, pi.id ASC
           ) FILTER (WHERE pi.id IS NOT NULL),
           '[]'::json
         ) AS image_items
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.category = $1 AND p.is_active = TRUE
       GROUP BY p.id
       ORDER BY p.name`,
      [category, publicApiBaseUrl]
    );
    res.json(
      rows.map((row: any) => ({
        ...row,
        image_items: Array.isArray(row.image_items) ? row.image_items : [],
        image_url: row.has_db_image ? buildProductImageUrl(row.id) : row.image_url,
      }))
    );
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: '상품 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/images/:imageId/file', async (req: Request, res: Response) => {
  const imageId = Number(req.params.imageId);
  if (!Number.isInteger(imageId) || imageId < 1) {
    res.status(400).json({ error: '유효한 이미지 ID가 필요합니다.' });
    return;
  }
  try {
    await ensureProductImageTableReady();
    const { rows } = await pool.query<{ image_data: Buffer | null; image_mime_type: string | null }>(
      'SELECT image_data, image_mime_type FROM product_images WHERE id = $1',
      [imageId]
    );
    if (rows.length === 0 || !rows[0].image_data) {
      res.status(404).json({ error: '등록된 상품 이미지가 없습니다.' });
      return;
    }
    res.setHeader('Content-Type', rows[0].image_mime_type || 'application/octet-stream');
    res.send(rows[0].image_data);
  } catch (error) {
    console.error('Get product gallery image-file error:', error);
    res.status(500).json({ error: '상품 이미지를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 상품 이미지 파일 조회 (DB bytea)
router.get('/:id/image-file', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await ensureProductColumnsReady();
    const { rows } = await pool.query<{ image_data: Buffer | null; image_mime_type: string | null }>(
      'SELECT image_data, image_mime_type FROM products WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    const imageData = rows[0].image_data;
    if (!imageData) {
      res.status(404).json({ error: '등록된 상품 이미지가 없습니다.' });
      return;
    }

    res.setHeader('Content-Type', rows[0].image_mime_type || 'application/octet-stream');
    res.send(imageData);
  } catch (error) {
    console.error('Get product image-file error:', error);
    res.status(500).json({ error: '상품 이미지를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 단일 상품 조회
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await ensureProductColumnsReady();
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    if (rows[0].category === WIP_CATEGORY_NAME && !canViewWipProducts(req)) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: '상품 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

export default router;
