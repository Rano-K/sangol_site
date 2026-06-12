import pool from '../config/database';
import { buildPublicApiUrl } from '../utils/publicUrls';

export const HOME_POPULAR_PRODUCT_LIMIT = 16;
const WIP_CATEGORY_NAME = '재공품';

export type PopularProductRow = {
  id: number;
  product_id: number;
  display_order: number;
  product_code: string;
  name: string;
  category: string;
  image_url: string | null;
  is_active: boolean;
  has_db_image?: boolean;
};

export const ensureHomePopularProductsTableReady = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_popular_products (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_home_popular_products_product_id UNIQUE (product_id)
    );
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_home_popular_products_order ON home_popular_products (display_order ASC, id ASC);'
  );
};

const buildProductImageUrl = (productId: number | string): string =>
  buildPublicApiUrl(`/products/${productId}/image-file`);

export const mapPopularProductRows = (rows: Array<Record<string, unknown>>): PopularProductRow[] =>
  rows.map((row) => ({
    id: Number(row.id),
    product_id: Number(row.product_id),
    display_order: Number(row.display_order ?? 0),
    product_code: String(row.product_code ?? ''),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    image_url: row.has_db_image ? buildProductImageUrl(Number(row.product_id)) : (row.image_url as string | null),
    is_active: row.is_active !== false,
    has_db_image: Boolean(row.has_db_image),
  }));

const popularProductSelectSql = `
  SELECT
    hpp.id,
    hpp.product_id,
    hpp.display_order,
    p.product_code,
    p.name,
    p.category,
    p.image_url,
    p.is_active,
    p.image_data IS NOT NULL AS has_db_image
  FROM home_popular_products hpp
  INNER JOIN products p ON p.id = hpp.product_id
`;

export const listCuratedPopularProducts = async (): Promise<PopularProductRow[]> => {
  await ensureHomePopularProductsTableReady();
  const { rows } = await pool.query(
    `${popularProductSelectSql}
     ORDER BY hpp.display_order ASC, hpp.id ASC`
  );
  return mapPopularProductRows(rows);
};

export const pickDiversePopularProducts = <T extends { category?: string | null }>(
  rows: T[],
  limit: number
): T[] => {
  const buckets = new Map<string, T[]>();
  for (const row of rows) {
    const category = String(row.category || '').trim() || '기타';
    const list = buckets.get(category) ?? [];
    list.push(row);
    buckets.set(category, list);
  }
  const categories = [...buckets.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
  const picked: T[] = [];
  let round = 0;
  while (picked.length < limit) {
    let added = false;
    for (const category of categories) {
      const list = buckets.get(category) ?? [];
      if (round < list.length) {
        picked.push(list[round]);
        added = true;
        if (picked.length >= limit) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  return picked.length > 0 ? picked : rows.slice(0, limit);
};

type PublicPopularProduct = {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  is_active: boolean;
};

export const listPublicPopularProducts = async (
  includeWip: boolean,
  limit = HOME_POPULAR_PRODUCT_LIMIT
): Promise<PublicPopularProduct[]> => {
  await ensureHomePopularProductsTableReady();
  const safeLimit = Math.max(1, Math.min(HOME_POPULAR_PRODUCT_LIMIT, limit));

  const { rows: curatedRows } = await pool.query(
    `${popularProductSelectSql}
     WHERE p.is_active = TRUE
       AND (p.category <> $1 OR $2::boolean IS TRUE)
     ORDER BY hpp.display_order ASC, hpp.id ASC
     LIMIT $3`,
    [WIP_CATEGORY_NAME, includeWip, safeLimit]
  );

  if (curatedRows.length > 0) {
    return mapPopularProductRows(curatedRows).map((row) => ({
      id: row.product_id,
      name: row.name,
      category: row.category,
      image_url: row.image_url,
      is_active: row.is_active,
    }));
  }

  const { rows: fallbackRows } = await pool.query(
    `SELECT
       p.id,
       p.name,
       p.category,
       p.image_url,
       p.is_active,
       p.image_data IS NOT NULL AS has_db_image
     FROM products p
     WHERE p.is_active = TRUE
       AND (p.category <> $1 OR $2::boolean IS TRUE)
     ORDER BY p.category ASC, p.name ASC`,
    [WIP_CATEGORY_NAME, includeWip]
  );

  const mapped = fallbackRows.map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    image_url: row.has_db_image ? buildProductImageUrl(Number(row.id)) : (row.image_url as string | null),
    is_active: row.is_active !== false,
  }));

  return pickDiversePopularProducts(mapped, safeLimit);
};

export const reorderHomePopularProducts = async (productIds: number[]): Promise<void> => {
  await ensureHomePopularProductsTableReady();
  const uniqueIds = [...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ product_id: string }>(
      'SELECT product_id FROM home_popular_products ORDER BY display_order ASC, id ASC'
    );
    const existingIds = new Set(existing.rows.map((row) => Number(row.product_id)));
    for (const productId of uniqueIds) {
      if (!existingIds.has(productId)) {
        throw Object.assign(new Error('INVALID_PRODUCT_IDS'), { code: 'INVALID_PRODUCT_IDS' });
      }
    }
    if (uniqueIds.length !== existing.rows.length) {
      throw Object.assign(new Error('INVALID_PRODUCT_IDS'), { code: 'INVALID_PRODUCT_IDS' });
    }

    for (let index = 0; index < uniqueIds.length; index += 1) {
      await client.query(
        'UPDATE home_popular_products SET display_order = $1, updated_at = NOW() WHERE product_id = $2',
        [index, uniqueIds[index]]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
