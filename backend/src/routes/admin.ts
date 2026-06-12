import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { body, param, validationResult, ValidationChain } from 'express-validator';
import { ensureLocationFranchiseTableReady } from './franchises';
import { buildPublicApiUrl, publicApiBaseUrl } from '../utils/publicUrls';
import {
  inventoryNoteSuffix,
  syncOrderInventoryOnStatusChange,
} from '../services/orderInventory';
import {
  HOME_POPULAR_PRODUCT_LIMIT,
  ensureHomePopularProductsTableReady,
  listCuratedPopularProducts,
  reorderHomePopularProducts,
} from '../services/homePopularProducts';

const router = express.Router();
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const validate = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

const ensureNoticeColumnsReady = async (): Promise<void> => {
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;');
};

const ensureProductColumnsReady = async (): Promise<void> => {
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS note TEXT;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS spec VARCHAR(120);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS current_delivery VARCHAR(120);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS future_delivery VARCHAR(120);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS kg_unit_price NUMERIC(12, 2);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_data BYTEA;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(120);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_original_name VARCHAR(255);');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS expiration_date DATE;');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS stocked_at TIMESTAMPTZ;');
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
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_product_images_updated_at'
      ) THEN
        CREATE TRIGGER trg_product_images_updated_at
        BEFORE UPDATE ON product_images
        FOR EACH ROW
        EXECUTE FUNCTION sangol_set_updated_at();
      END IF;
    END $$;
  `);
};

const ensureProductCategoryTableReady = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      category_key VARCHAR(20) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_product_categories_updated_at'
      ) THEN
        CREATE TRIGGER trg_product_categories_updated_at
        BEFORE UPDATE ON product_categories
        FOR EACH ROW
        EXECUTE FUNCTION sangol_set_updated_at();
      END IF;
    END $$;
  `);
  await pool.query(`
    INSERT INTO product_categories (name, category_key, is_active)
    VALUES
      ('임산물', 'FP', TRUE),
      ('농산물', 'AG', TRUE),
      ('제품(가공식품)', 'PR', TRUE),
      ('재공품', 'WIP', TRUE)
    ON CONFLICT (name) DO NOTHING;
  `);
};

const normalizeCategoryKey = (raw: string): string => raw.trim().toUpperCase();
const buildCodeSuggestion = async (categoryKey: string): Promise<string> => {
  const normalized = normalizeCategoryKey(categoryKey);
  const pattern = `^${normalized}_(\\d+)$`;
  const { rows } = await pool.query<{ max_seq: number | null }>(
    `SELECT MAX((regexp_match(product_code, $1))[1]::int) AS max_seq
     FROM products
     WHERE product_code ~ $1`,
    [pattern]
  );
  const nextSeq = Number(rows[0]?.max_seq || 0) + 1;
  return `${normalized}_${String(nextSeq).padStart(2, '0')}`;
};

const ensureOrderColumnsReady = async (): Promise<void> => {
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(30);');
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120);');
};

const ensureFranchiseKeyColumnsReady = async (): Promise<void> => {
  await ensureLocationFranchiseTableReady();
  await pool.query('ALTER TABLE franchises ADD COLUMN IF NOT EXISTS franchise_key VARCHAR(32);');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_franchises_franchise_key ON franchises (franchise_key);');
  await pool.query('ALTER TABLE location_franchises ADD COLUMN IF NOT EXISTS franchise_key VARCHAR(32);');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_location_franchises_franchise_key ON location_franchises (franchise_key);');
  await pool.query(`
    UPDATE location_franchises
    SET franchise_key = CONCAT('FRA-', LPAD(id::text, 6, '0'))
    WHERE franchise_key IS NULL OR BTRIM(franchise_key) = '';
  `);
  await pool.query(`
    UPDATE franchises f
    SET franchise_key = lf.franchise_key
    FROM location_franchises lf
    WHERE f.id = lf.id
      AND (f.franchise_key IS NULL OR BTRIM(f.franchise_key) = '');
  `);
  await pool.query(`
    UPDATE franchises
    SET franchise_key = CONCAT('FRA-', LPAD(id::text, 6, '0'))
    WHERE franchise_key IS NULL OR BTRIM(franchise_key) = '';
  `);
};

const normalizeFranchiseKey = (value?: string | null): string | null => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized || null;
};

const buildProductImageUrl = (productId: number | string): string =>
  buildPublicApiUrl(`/products/${productId}/image-file`);
const getExtensionFromName = (filename: string): string | null => {
  const normalized = filename.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) return null;
  return normalized.slice(dotIndex);
};
const getExtensionFromImageUrl = (imageUrl: string): string | null => {
  try {
    const parsed = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
      ? new URL(imageUrl)
      : new URL(imageUrl, 'http://placeholder.local');
    return getExtensionFromName(parsed.pathname);
  } catch (_error) {
    return null;
  }
};
const isInternalProductImageUrl = (imageUrl: string): boolean => {
  const value = imageUrl.trim();
  if (!value) return false;
  if (/^\/api\/products\/\d+\/image-file$/i.test(value)) return true;
  if (/^\/api\/products\/images\/\d+\/file$/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return (
      /^\/api\/products\/\d+\/image-file$/i.test(parsed.pathname) ||
      /^\/api\/products\/images\/\d+\/file$/i.test(parsed.pathname)
    );
  } catch (_error) {
    return false;
  }
};

const getPathnameFromImageUrl = (imageUrl: string): string => {
  const value = imageUrl.trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      return new URL(value).pathname;
    } catch (_error) {
      return value;
    }
  }
  return value;
};

const parseGalleryImageIdFromUrl = (imageUrl: string): number | null => {
  const pathname = getPathnameFromImageUrl(imageUrl);
  const match = pathname.match(/^\/api\/products\/images\/(\d+)\/file$/i);
  return match ? Number(match[1]) : null;
};

const parseLegacyProductImageProductId = (imageUrl: string): number | null => {
  const pathname = getPathnameFromImageUrl(imageUrl);
  const match = pathname.match(/^\/api\/products\/(\d+)\/image-file$/i);
  return match ? Number(match[1]) : null;
};

type ExistingGalleryImage = {
  id: number;
  image_url: string | null;
  image_data: Buffer | null;
  image_mime_type: string | null;
  image_original_name: string | null;
};

type ResolvedProductImageInsert = {
  imageUrl: string | null;
  imageBuffer: Buffer | null;
  imageMimeType: string | null;
  imageOriginalName: string | null;
};

const resolveProductImageForInsert = (
  productId: number,
  item: ProductImageInput,
  existingGallery: ExistingGalleryImage[],
  legacyProduct: {
    image_data: Buffer | null;
    image_mime_type: string | null;
    image_original_name: string | null;
    image_url: string | null;
  } | null
): ResolvedProductImageInsert => {
  const uploadBuffer = validateAndBuildImageBuffer(item);
  if (uploadBuffer) {
    return {
      imageUrl: null,
      imageBuffer: uploadBuffer,
      imageMimeType: item.imageMimeType ?? null,
      imageOriginalName: item.imageOriginalName ?? null,
    };
  }

  const imageUrl = String(item.imageUrl ?? '').trim();
  if (!imageUrl) {
    return { imageUrl: null, imageBuffer: null, imageMimeType: null, imageOriginalName: null };
  }

  if (!isInternalProductImageUrl(imageUrl)) {
    return { imageUrl, imageBuffer: null, imageMimeType: null, imageOriginalName: null };
  }

  const galleryId = parseGalleryImageIdFromUrl(imageUrl);
  if (galleryId !== null) {
    const existing = existingGallery.find((row) => row.id === galleryId);
    if (existing?.image_data && existing.image_data.length > 0) {
      return {
        imageUrl: null,
        imageBuffer: existing.image_data,
        imageMimeType: existing.image_mime_type,
        imageOriginalName: existing.image_original_name,
      };
    }
    if (existing?.image_url && !isInternalProductImageUrl(existing.image_url)) {
      return {
        imageUrl: existing.image_url,
        imageBuffer: null,
        imageMimeType: null,
        imageOriginalName: null,
      };
    }
  }

  const legacyProductId = parseLegacyProductImageProductId(imageUrl);
  if (
    legacyProductId === productId &&
    legacyProduct?.image_data &&
    legacyProduct.image_data.length > 0
  ) {
    return {
      imageUrl: null,
      imageBuffer: legacyProduct.image_data,
      imageMimeType: legacyProduct.image_mime_type,
      imageOriginalName: legacyProduct.image_original_name,
    };
  }

  throw new Error('기존 이미지를 찾을 수 없습니다. 이미지를 다시 업로드해 주세요.');
};

type ProductImageInput = {
  imageUrl?: string | null;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  imageOriginalName?: string | null;
  isPrimary?: boolean;
};

const validateImageUrl = (imageUrl: string): void => {
  if (!imageUrl) return;
  if (isInternalProductImageUrl(imageUrl)) return;
  const ext = getExtensionFromImageUrl(imageUrl);
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('상품 이미지 URL은 jpg/jpeg/png/webp/gif 확장자만 허용됩니다.');
  }
};

const validateAndBuildImageBuffer = (input: ProductImageInput): Buffer | null => {
  const imageBase64 = String(input.imageBase64 ?? '').trim();
  const imageMimeType = String(input.imageMimeType ?? '').trim().toLowerCase();
  const imageOriginalName = String(input.imageOriginalName ?? '').trim();
  const imageUrl = String(input.imageUrl ?? '').trim();
  if (!imageBase64) return null;
  if (imageUrl) {
    throw new Error('이미지 URL과 로컬 파일 업로드는 동시에 사용할 수 없습니다.');
  }
  if (!imageMimeType) {
    throw new Error('이미지 업로드 시 MIME 타입(imageMimeType)은 필수입니다.');
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(imageMimeType)) {
    throw new Error('이미지 MIME 타입이 허용되지 않습니다.');
  }
  if (!imageOriginalName) {
    throw new Error('이미지 업로드 시 원본 파일명(imageOriginalName)은 필수입니다.');
  }
  const ext = getExtensionFromName(imageOriginalName);
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('업로드 파일 확장자가 허용되지 않습니다.');
  }
  const sanitized = imageBase64.replace(/^data:.*;base64,/, '').replace(/\s+/g, '');
  const imageBuffer = Buffer.from(sanitized, 'base64');
  if (imageBuffer.length === 0) {
    throw new Error('빈 이미지 데이터입니다.');
  }
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`이미지 용량은 최대 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB까지 허용됩니다.`);
  }
  return imageBuffer;
};

const buildLegacyImageItems = (payload: {
  imageUrl?: string | null;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  imageOriginalName?: string | null;
}): ProductImageInput[] => {
  const imageUrl = String(payload.imageUrl ?? '').trim();
  const imageBase64 = String(payload.imageBase64 ?? '').trim();
  if (!imageUrl && !imageBase64) return [];
  return [
    {
      imageUrl: imageUrl || null,
      imageBase64: imageBase64 || null,
      imageMimeType: payload.imageMimeType ?? null,
      imageOriginalName: payload.imageOriginalName ?? null,
      isPrimary: true,
    },
  ];
};

const normalizeIncomingImageItems = (req: Request): ProductImageInput[] => {
  const incoming = Array.isArray(req.body?.imageItems) ? (req.body.imageItems as ProductImageInput[]) : null;
  const items = incoming ?? buildLegacyImageItems(req.body ?? {});
  if (items.length > 5) {
    throw new Error('상품 이미지는 최대 5개까지 등록할 수 있습니다.');
  }
  const normalized = items
    .map((item) => ({
      imageUrl: String(item?.imageUrl ?? '').trim() || null,
      imageBase64: String(item?.imageBase64 ?? '').trim() || null,
      imageMimeType: String(item?.imageMimeType ?? '').trim().toLowerCase() || null,
      imageOriginalName: String(item?.imageOriginalName ?? '').trim() || null,
      isPrimary: Boolean(item?.isPrimary),
    }))
    .filter((item) => item.imageUrl || item.imageBase64);
  if (normalized.length > 5) {
    throw new Error('상품 이미지는 최대 5개까지 등록할 수 있습니다.');
  }
  normalized.forEach((item) => {
    if (item.imageUrl) validateImageUrl(item.imageUrl);
    validateAndBuildImageBuffer(item);
  });
  if (normalized.length === 0) return normalized;
  const primaryCount = normalized.filter((item) => item.isPrimary).length;
  if (primaryCount > 1) {
    throw new Error('대표 이미지는 1개만 지정할 수 있습니다.');
  }
  if (primaryCount === 0) {
    normalized[0].isPrimary = true;
  }
  return normalized;
};

const replaceProductImages = async (productId: number, imageItems: ProductImageInput[]): Promise<void> => {
  await ensureProductImageTableReady();
  const client = await pool.connect();
  try {
    const { rows: existingGallery } = await client.query<ExistingGalleryImage>(
      `SELECT id, image_url, image_data, image_mime_type, image_original_name
       FROM product_images
       WHERE product_id = $1
       ORDER BY display_order ASC, id ASC`,
      [productId]
    );
    const { rows: legacyRows } = await client.query<{
      image_data: Buffer | null;
      image_mime_type: string | null;
      image_original_name: string | null;
      image_url: string | null;
    }>(
      `SELECT image_data, image_mime_type, image_original_name, image_url
       FROM products
       WHERE id = $1`,
      [productId]
    );
    const legacyProduct = legacyRows[0] ?? null;
    const resolvedItems = imageItems.map((item) =>
      resolveProductImageForInsert(productId, item, existingGallery, legacyProduct)
    );

    await client.query('BEGIN');
    await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
    for (let i = 0; i < imageItems.length; i += 1) {
      const item = imageItems[i];
      const resolved = resolvedItems[i];
      await client.query(
        `INSERT INTO product_images (
           product_id, display_order, is_primary, image_url, image_data, image_mime_type, image_original_name
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productId,
          i,
          Boolean(item.isPrimary),
          resolved.imageUrl,
          resolved.imageBuffer,
          resolved.imageBuffer ? resolved.imageMimeType : null,
          resolved.imageBuffer ? resolved.imageOriginalName : null,
        ]
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

const syncLegacyPrimaryImageOnProduct = async (productId: number): Promise<void> => {
  const { rows } = await pool.query<{
    id: number;
    image_url: string | null;
    has_db_image: boolean;
  }>(
    `SELECT
       p.id,
       p.image_url,
       p.image_data IS NOT NULL AS has_db_image
     FROM products p
     WHERE p.id = $1`,
    [productId]
  );
  if (rows.length === 0) return;
  const { rows: imageRows } = await pool.query<{
    image_url: string | null;
    has_db_image: boolean;
  }>(
    `SELECT
       image_url,
       image_data IS NOT NULL AS has_db_image
     FROM product_images
     WHERE product_id = $1
     ORDER BY is_primary DESC, display_order ASC, id ASC
     LIMIT 1`,
    [productId]
  );
  if (imageRows.length === 0) return;
  const primary = imageRows[0];
  await pool.query(
    `UPDATE products
     SET
       image_url = $1,
       image_data = CASE WHEN $2 THEN NULL ELSE image_data END,
       image_mime_type = CASE WHEN $2 THEN NULL ELSE image_mime_type END,
       image_original_name = CASE WHEN $2 THEN NULL ELSE image_original_name END,
       updated_at = NOW()
     WHERE id = $3`,
    [primary.image_url, primary.has_db_image, productId]
  );
};
const productImageValidationRules: ValidationChain[] = [
  body('imageItems')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Array.isArray(value)) {
        throw new Error('imageItems는 배열이어야 합니다.');
      }
      if (value.length > 5) {
        throw new Error('상품 이미지는 최대 5개까지 등록할 수 있습니다.');
      }
      return true;
    }),
  body('imageUrl')
    .optional({ nullable: true })
    .isString()
    .bail()
    .custom((value) => {
      const imageUrl = String(value ?? '').trim();
      if (!imageUrl) return true;
      if (isInternalProductImageUrl(imageUrl)) return true;
      const ext = getExtensionFromImageUrl(imageUrl);
      if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        throw new Error('상품 이미지 URL은 jpg/jpeg/png/webp/gif 확장자만 허용됩니다.');
      }
      return true;
    }),
  body('imageMimeType')
    .optional({ nullable: true })
    .isString()
    .bail()
    .custom((value) => {
      const mime = String(value ?? '').trim().toLowerCase();
      if (!mime) return true;
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
        throw new Error('이미지 MIME 타입은 image/jpeg, image/png, image/webp, image/gif만 허용됩니다.');
      }
      return true;
    }),
  body('imageOriginalName')
    .optional({ nullable: true })
    .isString()
    .bail()
    .custom((value) => {
      const fileName = String(value ?? '').trim();
      if (!fileName) return true;
      const ext = getExtensionFromName(fileName);
      if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        throw new Error('업로드 파일명 확장자는 jpg/jpeg/png/webp/gif만 허용됩니다.');
      }
      return true;
    }),
  body('imageBase64')
    .optional({ nullable: true })
    .isString()
    .bail()
    .custom((value, { req }) => {
      const imageBase64 = String(value ?? '').trim();
      const imageMimeType = String(req.body?.imageMimeType ?? '').trim().toLowerCase();
      const imageOriginalName = String(req.body?.imageOriginalName ?? '').trim();
      const imageUrl = String(req.body?.imageUrl ?? '').trim();

      if (!imageBase64) return true;
      if (imageUrl) {
        throw new Error('이미지 URL과 로컬 파일 업로드는 동시에 사용할 수 없습니다.');
      }
      if (!imageMimeType) {
        throw new Error('이미지 업로드 시 MIME 타입(imageMimeType)은 필수입니다.');
      }
      if (!ALLOWED_IMAGE_MIME_TYPES.has(imageMimeType)) {
        throw new Error('이미지 MIME 타입이 허용되지 않습니다.');
      }
      if (!imageOriginalName) {
        throw new Error('이미지 업로드 시 원본 파일명(imageOriginalName)은 필수입니다.');
      }
      const ext = getExtensionFromName(imageOriginalName);
      if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        throw new Error('업로드 파일 확장자가 허용되지 않습니다.');
      }
      try {
        const sanitized = imageBase64.replace(/^data:.*;base64,/, '').replace(/\s+/g, '');
        const imageBuffer = Buffer.from(sanitized, 'base64');
        if (imageBuffer.length === 0) {
          throw new Error('빈 이미지 데이터입니다.');
        }
        if (imageBuffer.length > MAX_IMAGE_BYTES) {
          throw new Error(`이미지 용량은 최대 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB까지 허용됩니다.`);
        }
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('이미지 base64 데이터가 유효하지 않습니다.');
      }
      return true;
    }),
];

const LOCATION_FRANCHISE_SELECT = `
  SELECT
    l.id,
    l.franchise_key,
    l.store_type,
    l.name,
    l.store_phone,
    l.owner_name,
    l.owner_phone,
    l.address,
    l.display_order,
    l.is_active,
    l.created_at,
    l.updated_at,
    l.franchise_key AS member_link_key,
    COALESCE(COUNT(u.id), 0)::int AS linked_member_count,
    COALESCE(COUNT(u.id) FILTER (WHERE u.is_active = TRUE), 0)::int AS linked_active_member_count,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', u.id,
          'email', u.email,
          'name', u.name,
          'isActive', u.is_active
        )
      ) FILTER (WHERE u.id IS NOT NULL),
      '[]'::json
    ) AS linked_members
  FROM location_franchises l
  LEFT JOIN users u
    ON u.franchise_id = l.id
   AND u.role = 'franchise'
`;

const locationFranchiseListQuery = (): string =>
  `${LOCATION_FRANCHISE_SELECT}
  GROUP BY l.id
  ORDER BY display_order ASC, id ASC`;

const locationFranchiseByIdQuery = (): string =>
  `${LOCATION_FRANCHISE_SELECT}
  WHERE l.id = $1
  GROUP BY l.id`;

const syncSingleLocationFranchiseToFranchise = async (locationId: number): Promise<void> => {
  await ensureFranchiseKeyColumnsReady();
  const { rows } = await pool.query<{
    id: string;
    franchise_key: string;
    name: string;
    owner_name: string | null;
    owner_phone: string | null;
    address: string;
    is_active: boolean;
  }>(
    `SELECT id, franchise_key, name, owner_name, owner_phone, address, is_active
     FROM location_franchises
     WHERE id = $1`,
    [locationId]
  );
  if (rows.length === 0) return;

  const row = rows[0];
  const normalizedId = Number(row.id);
  await pool.query(
    `INSERT INTO franchises (id, franchise_key, name, contact_person, phone, email, address, is_active)
     VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
     ON CONFLICT (id)
     DO UPDATE SET
       franchise_key = EXCLUDED.franchise_key,
       name = EXCLUDED.name,
       contact_person = EXCLUDED.contact_person,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [
      normalizedId,
      row.franchise_key,
      row.name,
      row.owner_name?.trim() || row.name,
      row.owner_phone?.trim() || '010-0000-0000',
      row.address,
      row.is_active,
    ]
  );
};

const syncAllLocationFranchisesToFranchises = async (): Promise<void> => {
  await ensureFranchiseKeyColumnsReady();
  const { rows } = await pool.query<{
    id: string;
    franchise_key: string;
    name: string;
    owner_name: string | null;
    owner_phone: string | null;
    address: string;
    is_active: boolean;
  }>(
    `SELECT id, franchise_key, name, owner_name, owner_phone, address, is_active
     FROM location_franchises`
  );

  for (const row of rows) {
    const normalizedId = Number(row.id);
    await pool.query(
      `INSERT INTO franchises (id, franchise_key, name, contact_person, phone, email, address, is_active)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
       ON CONFLICT (id)
       DO UPDATE SET
         franchise_key = EXCLUDED.franchise_key,
         name = EXCLUDED.name,
         contact_person = EXCLUDED.contact_person,
         phone = EXCLUDED.phone,
         address = EXCLUDED.address,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [
        normalizedId,
        row.franchise_key,
        row.name,
        row.owner_name?.trim() || row.name,
        row.owner_phone?.trim() || '010-0000-0000',
        row.address,
        row.is_active,
      ]
    );
  }

  await pool.query(
    `SELECT setval(
      pg_get_serial_sequence('franchises', 'id'),
      COALESCE((SELECT MAX(id) FROM franchises), 1),
      true
    )`
  );
};

// 모든 라우트에 관리자 인증 적용
router.use(authenticateToken);
router.use(requireAdmin);

// 오시는 길 > 가맹점 현황 관리
router.get('/location-franchises', async (_req: Request, res: Response) => {
  try {
    await ensureFranchiseKeyColumnsReady();
    await syncAllLocationFranchisesToFranchises();
    const { rows } = await pool.query(locationFranchiseListQuery());
    res.json(rows);
  } catch (error) {
    console.error('Get admin location franchises error:', error);
    res.status(500).json({ error: '가맹점 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

router.post(
  '/location-franchises',
  body('franchiseKey')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 32 })
    .matches(/^[A-Z0-9_-]+$/i)
    .withMessage('가맹점 키는 영문/숫자/-/_ 조합만 허용됩니다.'),
  body('storeType').isString().trim().isLength({ min: 1, max: 20 }),
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('storePhone').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body('ownerName').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('ownerPhone').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body('address').isString().trim().isLength({ min: 1 }),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const {
      franchiseKey = null,
      storeType,
      name,
      storePhone = null,
      ownerName = null,
      ownerPhone = null,
      address,
      displayOrder = 0,
      isActive = true,
    } = req.body as {
      franchiseKey?: string | null;
      storeType: string;
      name: string;
      storePhone?: string | null;
      ownerName?: string | null;
      ownerPhone?: string | null;
      address: string;
      displayOrder?: number;
      isActive?: boolean;
    };

    const normalizedFranchiseKey = normalizeFranchiseKey(franchiseKey);

    try {
      await ensureFranchiseKeyColumnsReady();
      const { rows } = await pool.query<{ id: number }>(
        `INSERT INTO location_franchises (
          franchise_key, store_type, name, store_phone, owner_name, owner_phone, address, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [normalizedFranchiseKey, storeType.trim(), name.trim(), storePhone, ownerName, ownerPhone, address.trim(), displayOrder, isActive]
      );
      const locationId = Number(rows[0].id);
      await pool.query(
        `UPDATE location_franchises
         SET franchise_key = CONCAT('FRA-', LPAD(id::text, 6, '0'))
         WHERE id = $1
           AND (franchise_key IS NULL OR BTRIM(franchise_key) = '')`,
        [locationId]
      );
      await syncSingleLocationFranchiseToFranchise(locationId);
      const { rows: syncedRows } = await pool.query(locationFranchiseByIdQuery(), [locationId]);
      res.status(201).json({ message: '가맹점이 등록되었습니다.', franchise: syncedRows[0] ?? null });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 가맹점 키입니다.' });
        return;
      }
      console.error('Create admin location franchise error:', error);
      res.status(500).json({ error: '가맹점 등록 중 오류가 발생했습니다.' });
    }
  }
);

router.patch(
  '/location-franchises/:id',
  param('id').isInt({ min: 1 }),
  body('franchiseKey')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 32 })
    .matches(/^[A-Z0-9_-]+$/i)
    .withMessage('가맹점 키는 영문/숫자/-/_ 조합만 허용됩니다.'),
  body('storeType').optional().isString().trim().isLength({ min: 1, max: 20 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('storePhone').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body('ownerName').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('ownerPhone').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body('address').optional().isString().trim().isLength({ min: 1 }),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const id = Number(req.params.id);
    const { franchiseKey, storeType, name, storePhone, ownerName, ownerPhone, address, displayOrder, isActive } = req.body as {
      franchiseKey?: string | null;
      storeType?: string;
      name?: string;
      storePhone?: string | null;
      ownerName?: string | null;
      ownerPhone?: string | null;
      address?: string;
      displayOrder?: number;
      isActive?: boolean;
    };
    const normalizedFranchiseKey = normalizeFranchiseKey(franchiseKey);

    try {
      await ensureFranchiseKeyColumnsReady();
      const { rows } = await pool.query<{ id: number }>(
        `UPDATE location_franchises
         SET
           franchise_key = COALESCE($1, franchise_key),
           store_type = COALESCE($2, store_type),
           name = COALESCE($3, name),
           store_phone = COALESCE($4, store_phone),
           owner_name = COALESCE($5, owner_name),
           owner_phone = COALESCE($6, owner_phone),
           address = COALESCE($7, address),
           display_order = COALESCE($8, display_order),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
         WHERE id = $10
         RETURNING id`,
        [
          normalizedFranchiseKey,
          storeType?.trim() ?? null,
          name?.trim() ?? null,
          storePhone ?? null,
          ownerName ?? null,
          ownerPhone ?? null,
          address?.trim() ?? null,
          displayOrder ?? null,
          isActive ?? null,
          id,
        ]
      );
      if (rows.length === 0) {
        res.status(404).json({ error: '수정할 가맹점을 찾을 수 없습니다.' });
        return;
      }
      const locationId = Number(rows[0].id);
      await syncSingleLocationFranchiseToFranchise(locationId);
      const { rows: syncedRows } = await pool.query(locationFranchiseByIdQuery(), [locationId]);
      res.json({ message: '가맹점이 수정되었습니다.', franchise: syncedRows[0] ?? null });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 가맹점 키입니다.' });
        return;
      }
      console.error('Update admin location franchise error:', error);
      res.status(500).json({ error: '가맹점 수정 중 오류가 발생했습니다.' });
    }
  }
);

router.delete('/location-franchises/:id', param('id').isInt({ min: 1 }), async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await ensureFranchiseKeyColumnsReady();
    const { rows: linkedMemberRows } = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE franchise_id = $1
         AND role = 'franchise'`,
      [id]
    );
    const linkedMemberCount = Number(linkedMemberRows[0]?.count ?? 0);
    if (linkedMemberCount > 0) {
      res.status(409).json({
        error:
          '연결된 가맹점 회원이 있어 삭제할 수 없습니다. 회원 관리에서 가맹점 연결을 해제한 후 다시 시도하세요.',
      });
      return;
    }

    await client.query('BEGIN');
    const locationResult = await client.query('SELECT id FROM location_franchises WHERE id = $1', [id]);
    if ((locationResult.rowCount || 0) === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: '삭제할 가맹점을 찾을 수 없습니다.' });
      return;
    }

    await client.query('DELETE FROM franchises WHERE id = $1', [id]);
    await client.query('DELETE FROM location_franchises WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ message: '가맹점이 삭제되었습니다.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete admin location franchise error:', error);
    res.status(500).json({ error: '가맹점 삭제 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// 메인 홈 인기 상품 지정
router.get('/home-popular-products', async (_req: Request, res: Response) => {
  try {
    const items = await listCuratedPopularProducts();
    res.json(items);
  } catch (error) {
    console.error('Get admin home popular products error:', error);
    res.status(500).json({ error: '인기 상품 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

router.post(
  '/home-popular-products',
  body('productId').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const productId = Number(req.body.productId);
    try {
      await ensureHomePopularProductsTableReady();
      const { rows: productRows } = await pool.query<{ id: number }>(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );
      if (productRows.length === 0) {
        res.status(404).json({ error: '추가할 상품을 찾을 수 없습니다.' });
        return;
      }

      const { rows: countRows } = await pool.query<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM home_popular_products'
      );
      if (Number(countRows[0]?.count ?? 0) >= HOME_POPULAR_PRODUCT_LIMIT) {
        res.status(409).json({
          error: `인기 상품은 최대 ${HOME_POPULAR_PRODUCT_LIMIT}개까지 지정할 수 있습니다.`,
        });
        return;
      }

      const { rows: orderRows } = await pool.query<{ next_order: number }>(
        'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM home_popular_products'
      );
      const displayOrder = Number(orderRows[0]?.next_order ?? 0);

      await pool.query(
        `INSERT INTO home_popular_products (product_id, display_order)
         VALUES ($1, $2)`,
        [productId, displayOrder]
      );

      const items = await listCuratedPopularProducts();
      res.status(201).json({ message: '인기 상품에 추가되었습니다.', items });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 인기 상품으로 지정된 상품입니다.' });
        return;
      }
      console.error('Create admin home popular product error:', error);
      res.status(500).json({ error: '인기 상품 추가 중 오류가 발생했습니다.' });
    }
  }
);

router.put(
  '/home-popular-products/order',
  body('productIds').isArray({ min: 0, max: HOME_POPULAR_PRODUCT_LIMIT }),
  body('productIds.*').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const productIds = (req.body.productIds as number[]).map((id) => Number(id));
    try {
      await reorderHomePopularProducts(productIds);
      const items = await listCuratedPopularProducts();
      res.json({ message: '인기 상품 순서가 저장되었습니다.', items });
    } catch (error) {
      if ((error as { code?: string }).code === 'INVALID_PRODUCT_IDS') {
        res.status(400).json({ error: '저장할 인기 상품 목록이 올바르지 않습니다. 새로고침 후 다시 시도하세요.' });
        return;
      }
      console.error('Reorder admin home popular products error:', error);
      res.status(500).json({ error: '인기 상품 순서 저장 중 오류가 발생했습니다.' });
    }
  }
);

router.delete('/home-popular-products/:id', param('id').isInt({ min: 1 }), async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const id = Number(req.params.id);
  try {
    await ensureHomePopularProductsTableReady();
    const result = await pool.query('DELETE FROM home_popular_products WHERE id = $1', [id]);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ error: '삭제할 인기 상품 항목을 찾을 수 없습니다.' });
      return;
    }
    const items = await listCuratedPopularProducts();
    res.json({ message: '인기 상품에서 제거되었습니다.', items });
  } catch (error) {
    console.error('Delete admin home popular product error:', error);
    res.status(500).json({ error: '인기 상품 제거 중 오류가 발생했습니다.' });
  }
});

// 대시보드 통계
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    await ensureLocationFranchiseTableReady();
    await ensureProductColumnsReady();
    await ensureNoticeColumnsReady();

    const { rows: ordersTodayRows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM orders WHERE created_at::date = CURRENT_DATE"
    );

    const { rows: ordersTotalRows } = await pool.query<{ count: string; total: string | null }>(
      'SELECT COUNT(*)::text as count, COALESCE(SUM(total_amount), 0)::text as total FROM orders'
    );

    const { rows: ordersPendingRows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM orders WHERE status = 'pending'"
    );

    const { rows: revenueTodayRows } = await pool.query<{ total: string | null }>(
      "SELECT COALESCE(SUM(total_amount), 0)::text as total FROM orders WHERE created_at::date = CURRENT_DATE"
    );

    const { rows: franchisesRows } = await pool.query<{ active: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active,
         COUNT(*)::text AS total
       FROM location_franchises`
    );

    const { rows: inquiriesPendingRows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM inquiries WHERE status = 'pending'"
    );

    const { rows: productsRows } = await pool.query<{ active: string; total: string; low_stock: string; out_of_stock: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active,
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE is_active = TRUE AND stock_quantity <= 10)::text AS low_stock,
         COUNT(*) FILTER (WHERE is_active = TRUE AND stock_status = 'out_of_stock')::text AS out_of_stock
       FROM products`
    );

    const { rows: noticesRows } = await pool.query<{ active: string; important: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active,
         COUNT(*) FILTER (WHERE is_active = TRUE AND is_important = TRUE)::text AS important
       FROM notices`
    );

    const { rows: recentOrders } = await pool.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at, COALESCE(f.name, '미지정 가맹점') AS franchise_name
       FROM orders o
       LEFT JOIN franchises f ON o.franchise_id = f.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );

    const { rows: lowStockProducts } = await pool.query(
      `SELECT id, product_code, name, stock_quantity, stock_status
       FROM products
       WHERE is_active = TRUE AND stock_quantity <= 10
       ORDER BY stock_quantity ASC, name ASC
       LIMIT 5`
    );

    const { rows: recentInquiries } = await pool.query(
      `SELECT id, name, subject, status, created_at
       FROM inquiries
       ORDER BY created_at DESC
       LIMIT 5`
    );

    res.json({
      ordersToday: Number(ordersTodayRows[0].count),
      ordersTotal: Number(ordersTotalRows[0].count),
      revenueTotal: Number(ordersTotalRows[0].total ?? 0),
      revenueToday: Number(revenueTodayRows[0].total ?? 0),
      ordersPending: Number(ordersPendingRows[0].count),
      franchisesActive: Number(franchisesRows[0].active),
      franchisesTotal: Number(franchisesRows[0].total),
      inquiriesPending: Number(inquiriesPendingRows[0].count),
      productsActive: Number(productsRows[0].active),
      productsTotal: Number(productsRows[0].total),
      lowStockProducts: Number(productsRows[0].low_stock),
      outOfStockProducts: Number(productsRows[0].out_of_stock),
      noticesActive: Number(noticesRows[0].active),
      importantNotices: Number(noticesRows[0].important),
      recentOrders,
      lowStockProductList: lowStockProducts,
      recentInquiries,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: '통계 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 모든 주문 조회
router.get('/orders', async (req: Request, res: Response) => {
  try {
    await ensureOrderColumnsReady();
    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.order_channel,
         o.franchise_id,
         f.franchise_key,
         COALESCE(f.name, CASE WHEN o.order_channel = 'b2c' THEN '프론트 주문' ELSE '미지정 가맹점' END) AS franchise_name,
         f.contact_person AS franchise_contact_person,
         f.phone AS franchise_phone,
         f.address AS franchise_address,
         f.business_number AS franchise_business_number,
         o.delivery_address,
         o.delivery_phone,
         o.recipient_name,
         o.delivery_request,
         o.status,
         o.total_amount,
         o.created_at,
         o.updated_at,
         (
           SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
             'id', oi.id,
             'productId', p.id,
             'productCode', p.product_code,
             'productName', p.name,
             'unit', p.unit,
             'taxType', p.tax_type,
             'quantity', oi.quantity,
             'unitPrice', oi.unit_price,
             'totalPrice', oi.total_price
           ) ORDER BY oi.id ASC), '[]'::json)
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = o.id
         ) AS items
       FROM orders o
       LEFT JOIN franchises f ON o.franchise_id = f.id
       ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: '주문 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 주문 상태 업데이트
router.patch(
  '/orders/:id/status',
  param('id').isInt({ min: 1 }),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { id } = req.params;
  const { status } = req.body;
  const adminUserId = req.user?.id ?? null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureProductColumnsReady();

    const { rows: currentRows } = await client.query<{ status: string }>(
      'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (currentRows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
      return;
    }

    const previousStatus = currentRows[0].status;
    if (previousStatus === status) {
      await client.query('ROLLBACK');
      res.json({ message: '주문 상태가 이미 동일합니다.' });
      return;
    }

    const inventoryAction = await syncOrderInventoryOnStatusChange(
      client,
      Number(id),
      previousStatus,
      status
    );

    await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, id]
    );

    await client.query(
      `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by_user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        previousStatus,
        status,
        adminUserId,
        `관리자 상태 변경${inventoryNoteSuffix(inventoryAction)}`,
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: '주문 상태가 업데이트되었습니다.',
      inventoryAction,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', error);
    const message =
      error instanceof Error ? error.message : '주문 상태 업데이트 중 오류가 발생했습니다.';
    const isStockError = error instanceof Error && error.message.includes('재고');
    res.status(isStockError ? 409 : 500).json({ error: message });
  } finally {
    client.release();
  }
});

// 주문 수정 (관리자)
router.patch(
  '/orders/:id',
  param('id').isInt({ min: 1 }),
  body('items').optional().isArray({ min: 1 }),
  body('items.*.productId').optional().isInt({ min: 1 }),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('deliveryAddress').optional({ nullable: true }).isString(),
  body('deliveryPhone').optional({ nullable: true }).isString(),
  body('recipientName').optional({ nullable: true }).isString(),
  body('deliveryRequest').optional({ nullable: true }).isString(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const orderId = Number(req.params.id);
    const { items, deliveryAddress, deliveryPhone, recipientName, deliveryRequest } = req.body as {
      items?: Array<{ productId: number; quantity: number }>;
      deliveryAddress?: string | null;
      deliveryPhone?: string | null;
      recipientName?: string | null;
      deliveryRequest?: string | null;
    };
    const adminUserId = req.user?.id ?? null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureOrderColumnsReady();

      const orderRows = await client.query<{ status: string; order_channel: string }>(
        'SELECT status, order_channel FROM orders WHERE id = $1 LIMIT 1',
        [orderId]
      );
      if (orderRows.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: '수정할 주문을 찾을 수 없습니다.' });
        return;
      }
      if (orderRows.rows[0].order_channel !== 'b2b') {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'B2B 주문만 수정할 수 있습니다.' });
        return;
      }
      if (orderRows.rows[0].status !== 'pending') {
        await client.query('ROLLBACK');
        res.status(409).json({ error: '대기(pending) 상태의 주문만 수정할 수 있습니다.' });
        return;
      }

      let computedTotal = Number(
        (
          await client.query<{ total: string }>(
            `SELECT COALESCE(SUM(total_price), 0)::text AS total
             FROM order_items
             WHERE order_id = $1`,
            [orderId]
          )
        ).rows[0].total
      );

      if (Array.isArray(items)) {
        await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
        let nextTotal = 0;
        for (const item of items) {
          const productRows = await client.query<{ price: string; stock_status: string }>(
            'SELECT price, stock_status FROM products WHERE id = $1 AND is_active = TRUE',
            [item.productId]
          );
          if (productRows.rows.length === 0) throw new Error('주문 가능한 상품을 찾을 수 없습니다.');
          if (productRows.rows[0].stock_status === 'out_of_stock') throw new Error('품절 상품은 주문할 수 없습니다.');
          const unitPrice = Number(productRows.rows[0].price);
          const itemTotal = unitPrice * item.quantity;
          nextTotal += itemTotal;
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, item.productId, item.quantity, unitPrice, itemTotal]
          );
        }
        computedTotal = nextTotal;
      }

      await client.query(
        `UPDATE orders
         SET delivery_address = COALESCE($1, delivery_address),
             delivery_phone = COALESCE($2, delivery_phone),
             recipient_name = COALESCE($3, recipient_name),
             delivery_request = COALESCE($4, delivery_request),
             total_amount = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          deliveryAddress ?? null,
          deliveryPhone ?? null,
          recipientName ?? null,
          deliveryRequest ?? null,
          computedTotal,
          orderId,
        ]
      );

      await client.query(
        `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by_user_id, note)
         VALUES ($1, 'pending', 'pending', $2, '관리자 주문 수정')`,
        [orderId, adminUserId]
      );

      await client.query('COMMIT');
      res.json({ message: '주문이 수정되었습니다.', orderId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Admin update order error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '주문 수정 중 오류가 발생했습니다.' });
    } finally {
      client.release();
    }
  }
);

// 주문 삭제 (관리자)
router.delete('/orders/:id', param('id').isInt({ min: 1 }), async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const orderId = Number(req.params.id);
  const adminUserId = req.user?.id ?? null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const orderRows = await client.query<{ status: string; order_channel: string }>(
      'SELECT status, order_channel FROM orders WHERE id = $1 LIMIT 1',
      [orderId]
    );
    if (orderRows.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: '삭제할 주문을 찾을 수 없습니다.' });
      return;
    }
    if (orderRows.rows[0].order_channel !== 'b2b') {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'B2B 주문만 삭제할 수 있습니다.' });
      return;
    }
    if (orderRows.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(409).json({ error: '대기(pending) 상태의 주문만 삭제할 수 있습니다.' });
      return;
    }

    await client.query(
      `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by_user_id, note)
       VALUES ($1, 'pending', 'cancelled', $2, '관리자 주문 삭제')`,
      [orderId, adminUserId]
    );
    await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
    await client.query('COMMIT');
    res.json({ message: '주문이 삭제되었습니다.', orderId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin delete order error:', error);
    res.status(500).json({ error: '주문 삭제 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// 상품 카테고리 목록
router.get('/product-categories', async (_req: Request, res: Response) => {
  try {
    await ensureProductCategoryTableReady();
    const { rows } = await pool.query(
      `SELECT id, name, category_key, is_active, created_at, updated_at
       FROM product_categories
       ORDER BY is_active DESC, name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get product categories error:', error);
    res.status(500).json({ error: '상품 카테고리를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 상품 카테고리 등록
router.post(
  '/product-categories',
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('categoryKey')
    .isString()
    .trim()
    .isLength({ min: 2, max: 20 })
    .matches(/^[A-Za-z0-9]+$/),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    try {
      await ensureProductCategoryTableReady();
      const { name, categoryKey, isActive = true } = req.body as {
        name: string;
        categoryKey: string;
        isActive?: boolean;
      };
      const normalizedKey = normalizeCategoryKey(categoryKey);
      const { rows } = await pool.query(
        `INSERT INTO product_categories (name, category_key, is_active)
         VALUES ($1, $2, $3)
         RETURNING id, name, category_key, is_active, created_at, updated_at`,
        [name.trim(), normalizedKey, isActive]
      );
      res.status(201).json({ message: '카테고리가 등록되었습니다.', category: rows[0] });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 카테고리명 또는 카테고리 키입니다.' });
        return;
      }
      console.error('Create product category error:', error);
      res.status(500).json({ error: '카테고리 등록 중 오류가 발생했습니다.' });
    }
  }
);

// 상품 카테고리 수정
router.patch(
  '/product-categories/:id',
  param('id').isInt({ min: 1 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('categoryKey')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 20 })
    .matches(/^[A-Za-z0-9]+$/),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const id = Number(req.params.id);
    const { name, categoryKey, isActive } = req.body as {
      name?: string;
      categoryKey?: string;
      isActive?: boolean;
    };
    try {
      await ensureProductCategoryTableReady();
      const normalizedKey = categoryKey ? normalizeCategoryKey(categoryKey) : null;
      const { rows } = await pool.query(
        `UPDATE product_categories
         SET name = COALESCE($1, name),
             category_key = COALESCE($2, category_key),
             is_active = COALESCE($3, is_active),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, category_key, is_active, created_at, updated_at`,
        [name?.trim() || null, normalizedKey, isActive ?? null, id]
      );
      if (rows.length === 0) {
        res.status(404).json({ error: '수정할 카테고리를 찾을 수 없습니다.' });
        return;
      }
      res.json({ message: '카테고리가 수정되었습니다.', category: rows[0] });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 카테고리명 또는 카테고리 키입니다.' });
        return;
      }
      console.error('Update product category error:', error);
      res.status(500).json({ error: '카테고리 수정 중 오류가 발생했습니다.' });
    }
  }
);

// 카테고리별 다음 품목코드 제안
router.get('/product-categories/:id/next-code', param('id').isInt({ min: 1 }), async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const id = Number(req.params.id);
  try {
    await ensureProductCategoryTableReady();
    const { rows } = await pool.query<{ id: number; name: string; category_key: string; is_active: boolean }>(
      `SELECT id, name, category_key, is_active
       FROM product_categories
       WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
      return;
    }
    const category = rows[0];
    const nextProductCode = await buildCodeSuggestion(category.category_key);
    res.json({
      categoryId: category.id,
      categoryName: category.name,
      categoryKey: category.category_key,
      nextProductCode,
    });
  } catch (error) {
    console.error('Get next product code error:', error);
    res.status(500).json({ error: '다음 품목코드 조회 중 오류가 발생했습니다.' });
  }
});

// 모든 상품 조회 (관리자)
router.get('/products', async (_req: Request, res: Response) => {
  try {
    await ensureProductColumnsReady();
    await ensureProductImageTableReady();
    const { rows } = await pool.query(
      `SELECT
         p.id,
         p.product_code,
         p.name,
         p.category,
         p.description,
         p.unit,
         p.tax_type,
         p.cost_price,
         p.price,
         p.stock_quantity,
         p.amount,
         p.note,
         p.spec,
         p.current_delivery,
         p.future_delivery,
         p.kg_unit_price,
         p.image_url,
         p.image_data IS NOT NULL AS has_db_image,
         p.is_active,
         p.stock_status,
         p.expiration_date,
         p.stocked_at,
         p.created_at,
         p.updated_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id', pi.id,
               'image_url', CASE
                 WHEN pi.image_data IS NOT NULL THEN CONCAT($1::text, '/products/images/', pi.id, '/file')
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
       GROUP BY p.id
       ORDER BY p.category ASC, p.name ASC`,
      [publicApiBaseUrl]
    );
    res.json(
      rows.map((row: any) => ({
        ...row,
        image_items: Array.isArray(row.image_items) ? row.image_items : [],
        image_url: row.has_db_image ? buildProductImageUrl(row.id) : row.image_url,
      }))
    );
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ error: '상품 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 상품 등록
router.post(
  '/products',
  body('productCode').isString().trim().isLength({ min: 1, max: 100 }),
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('category').isString().trim().isLength({ min: 1, max: 100 }),
  body('price').isFloat({ min: 0 }),
  body('taxType').optional().isIn(['taxable', 'tax_exempt']),
  body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('unit').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('stockStatus').optional().isIn(['in_stock', 'low_stock', 'out_of_stock']),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('amount').optional().isFloat({ min: 0 }),
  body('note').optional({ nullable: true }).isString(),
  body('spec').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('currentDelivery').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('futureDelivery').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('kgUnitPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('expirationDate').optional({ nullable: true }).isISO8601(),
  body('stockedAt').optional({ nullable: true }).isISO8601(),
  body('description').optional({ nullable: true }).isString(),
  ...productImageValidationRules,
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const {
      productCode,
      name,
      category,
      price,
      taxType = 'taxable',
      costPrice = null,
      unit = '1kg',
      stockStatus = 'in_stock',
      stockQuantity = 0,
      amount = 0,
      note = null,
      spec = null,
      currentDelivery = null,
      futureDelivery = null,
      kgUnitPrice = null,
      expirationDate = null,
      stockedAt = null,
      description = null,
      imageUrl = null,
      imageBase64 = null,
      imageMimeType = null,
      imageOriginalName = null,
      isActive = true,
    } = req.body as {
      productCode: string;
      name: string;
      category: string;
      price: number;
      taxType?: 'taxable' | 'tax_exempt';
      costPrice?: number | null;
      unit?: string;
      stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
      stockQuantity?: number;
      amount?: number;
      note?: string | null;
      spec?: string | null;
      currentDelivery?: string | null;
      futureDelivery?: string | null;
      kgUnitPrice?: number | null;
      expirationDate?: string | null;
      stockedAt?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      imageBase64?: string | null;
      imageMimeType?: string | null;
      imageOriginalName?: string | null;
      isActive?: boolean;
    };

    try {
      await ensureProductColumnsReady();
      await ensureProductImageTableReady();
      await ensureProductCategoryTableReady();
      const normalizedImageItems = normalizeIncomingImageItems(req);
      const normalizedProductCode = productCode.trim().toUpperCase();
      const categoryName = category.trim();
      const categoryRow = await pool.query<{ id: number }>(
        `SELECT id FROM product_categories WHERE name = $1 AND is_active = TRUE`,
        [categoryName]
      );
      if (categoryRow.rows.length === 0) {
        res.status(400).json({ error: '유효한 카테고리를 선택해 주세요.' });
        return;
      }
      const duplicated = await pool.query<{ id: number }>(
        `SELECT id FROM products WHERE UPPER(product_code) = UPPER($1) LIMIT 1`,
        [normalizedProductCode]
      );
      if (duplicated.rows.length > 0) {
        res.status(409).json({ error: '이미 사용 중인 품목코드입니다.' });
        return;
      }

      const imageBuffer =
        imageBase64 && imageMimeType
          ? Buffer.from(imageBase64.replace(/^data:.*;base64,/, ''), 'base64')
          : null;

      const { rows } = await pool.query(
        `INSERT INTO products (
           product_code, name, category, description, unit, tax_type, cost_price, price, stock_quantity, amount, note, spec, current_delivery, future_delivery, kg_unit_price, expiration_date, stocked_at, image_url, image_data, image_mime_type, image_original_name, is_active, stock_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         RETURNING id, product_code, name, category, description, unit, tax_type, cost_price, price, stock_quantity, amount, note, spec, current_delivery, future_delivery, kg_unit_price, expiration_date, stocked_at, image_url, image_data IS NOT NULL AS has_db_image, is_active, stock_status, created_at, updated_at`,
        [
          normalizedProductCode,
          name,
          categoryName,
          description,
          unit,
          taxType,
          costPrice,
          price,
          stockQuantity,
          amount,
          note,
          spec,
          currentDelivery,
          futureDelivery,
          kgUnitPrice,
          expirationDate,
          stockedAt,
          imageUrl,
          imageBuffer,
          imageBuffer ? imageMimeType : null,
          imageBuffer ? imageOriginalName : null,
          isActive,
          stockQuantity <= 0 ? 'out_of_stock' : stockStatus,
        ]
      );
      const created = rows[0] as any;
      if (normalizedImageItems.length > 0) {
        await replaceProductImages(Number(created.id), normalizedImageItems);
        await syncLegacyPrimaryImageOnProduct(Number(created.id));
      }
      res.status(201).json({
        message: '상품이 등록되었습니다.',
        product: {
          ...created,
          image_url: created.has_db_image ? buildProductImageUrl(created.id) : created.image_url,
        },
      });
    } catch (error) {
      console.error('Create admin product error:', error);
      res.status(500).json({ error: '상품 등록 중 오류가 발생했습니다.' });
    }
  }
);

// 상품 수정
router.patch(
  '/products/:id',
  param('id').isInt({ min: 1 }),
  body('productCode').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('category').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('price').optional().isFloat({ min: 0 }),
  body('taxType').optional().isIn(['taxable', 'tax_exempt']),
  body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('unit').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('stockStatus').optional().isIn(['in_stock', 'low_stock', 'out_of_stock']),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('amount').optional().isFloat({ min: 0 }),
  body('note').optional({ nullable: true }).isString(),
  body('spec').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('currentDelivery').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('futureDelivery').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('kgUnitPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('expirationDate').optional({ nullable: true }).isISO8601(),
  body('stockedAt').optional({ nullable: true }).isISO8601(),
  body('description').optional({ nullable: true }).isString(),
  ...productImageValidationRules,
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const productId = Number(req.params.id);
    const { productCode, name, category, price, taxType, costPrice, unit, stockStatus, stockQuantity, amount, note, spec, currentDelivery, futureDelivery, kgUnitPrice, expirationDate, stockedAt, description, imageUrl, imageBase64, imageMimeType, imageOriginalName, isActive } = req.body as {
      productCode?: string;
      name?: string;
      category?: string;
      price?: number;
      taxType?: 'taxable' | 'tax_exempt';
      costPrice?: number | null;
      unit?: string;
      stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
      stockQuantity?: number;
      amount?: number;
      note?: string | null;
      spec?: string | null;
      currentDelivery?: string | null;
      futureDelivery?: string | null;
      kgUnitPrice?: number | null;
      expirationDate?: string | null;
      stockedAt?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      imageBase64?: string | null;
      imageMimeType?: string | null;
      imageOriginalName?: string | null;
      isActive?: boolean;
    };

    try {
      await ensureProductColumnsReady();
      await ensureProductImageTableReady();
      await ensureProductCategoryTableReady();
      const hasImageItemsPayload = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'imageItems');
      const normalizedImageItems = normalizeIncomingImageItems(req);
      const normalizedProductCode = productCode?.trim().toUpperCase() || null;
      const normalizedCategoryName = category?.trim() || null;

      if (normalizedCategoryName) {
        const categoryRow = await pool.query<{ id: number }>(
          `SELECT id FROM product_categories WHERE name = $1 AND is_active = TRUE`,
          [normalizedCategoryName]
        );
        if (categoryRow.rows.length === 0) {
          res.status(400).json({ error: '유효한 카테고리를 선택해 주세요.' });
          return;
        }
      }

      if (normalizedProductCode) {
        const duplicated = await pool.query<{ id: number }>(
          `SELECT id FROM products WHERE UPPER(product_code) = UPPER($1) AND id <> $2 LIMIT 1`,
          [normalizedProductCode, productId]
        );
        if (duplicated.rows.length > 0) {
          res.status(409).json({ error: '이미 사용 중인 품목코드입니다.' });
          return;
        }
      }
      const imageBuffer =
        imageBase64 && imageMimeType
          ? Buffer.from(imageBase64.replace(/^data:.*;base64,/, ''), 'base64')
          : null;
      const { rows } = await pool.query(
        `UPDATE products
         SET
          product_code = COALESCE($1, product_code),
          name = COALESCE($2, name),
          category = COALESCE($3, category),
          price = COALESCE($4, price),
          tax_type = COALESCE($5, tax_type),
          cost_price = COALESCE($6, cost_price),
          unit = COALESCE($7, unit),
          stock_quantity = COALESCE($9, stock_quantity),
          amount = COALESCE($10, amount),
          note = COALESCE($11, note),
          spec = COALESCE($12, spec),
          current_delivery = COALESCE($13, current_delivery),
          future_delivery = COALESCE($14, future_delivery),
          kg_unit_price = COALESCE($15, kg_unit_price),
          expiration_date = COALESCE($16, expiration_date),
          stocked_at = COALESCE($17, stocked_at),
          description = COALESCE($18, description),
          image_url = COALESCE($19, image_url),
          image_data = COALESCE($20, image_data),
          image_mime_type = CASE WHEN $20 IS NOT NULL THEN $21 ELSE image_mime_type END,
          image_original_name = CASE WHEN $20 IS NOT NULL THEN $22 ELSE image_original_name END,
          is_active = COALESCE($23, is_active),
          stock_status = CASE
            WHEN COALESCE($9, stock_quantity) <= 0 THEN 'out_of_stock'::stock_status
            WHEN COALESCE($8, stock_status) = 'low_stock' THEN 'low_stock'::stock_status
            ELSE 'in_stock'::stock_status
          END,
           updated_at = NOW()
         WHERE id = $24
         RETURNING id, product_code, name, category, description, unit, tax_type, cost_price, price, stock_quantity, amount, note, spec, current_delivery, future_delivery, kg_unit_price, expiration_date, stocked_at, image_url, image_data IS NOT NULL AS has_db_image, is_active, stock_status, created_at, updated_at`,
        [
          normalizedProductCode,
          name ?? null,
          normalizedCategoryName,
          price ?? null,
          taxType ?? null,
          costPrice ?? null,
          unit ?? null,
          stockStatus ?? null,
          stockQuantity ?? null,
          amount ?? null,
          note ?? null,
          spec ?? null,
          currentDelivery ?? null,
          futureDelivery ?? null,
          kgUnitPrice ?? null,
          expirationDate ?? null,
          stockedAt ?? null,
          description ?? null,
          imageUrl ?? null,
          imageBuffer,
          imageBuffer ? imageMimeType : null,
          imageBuffer ? imageOriginalName : null,
          isActive ?? null,
          productId,
        ]
      );
      if (rows.length === 0) {
        res.status(404).json({ error: '수정할 상품을 찾을 수 없습니다.' });
        return;
      }
      const updated = rows[0] as any;
      if (hasImageItemsPayload) {
        await replaceProductImages(productId, normalizedImageItems);
        await syncLegacyPrimaryImageOnProduct(productId);
      }
      res.json({
        message: '상품이 수정되었습니다.',
        product: {
          ...updated,
          image_url: updated.has_db_image ? buildProductImageUrl(updated.id) : updated.image_url,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 품목코드입니다.' });
        return;
      }
      if (error instanceof Error && error.message) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Update admin product error:', error);
      res.status(500).json({ error: '상품 수정 중 오류가 발생했습니다.' });
    }
  }
);

router.patch(
  '/products/bulk-status',
  body('ids').isArray({ min: 1 }),
  body('ids.*').isInt({ min: 1 }),
  body('isActive').isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { ids, isActive } = req.body as { ids: number[]; isActive: boolean };
    try {
      await ensureProductColumnsReady();
      const { rowCount } = await pool.query(
        `UPDATE products
         SET is_active = $1, updated_at = NOW()
         WHERE id = ANY($2::BIGINT[])`,
        [isActive, ids]
      );
      res.json({
        message: isActive ? '선택한 상품이 노출 처리되었습니다.' : '선택한 상품이 비노출 처리되었습니다.',
        updatedCount: Number(rowCount || 0),
      });
    } catch (error) {
      console.error('Bulk update product visibility error:', error);
      res.status(500).json({ error: '상품 일괄 노출 상태 변경 중 오류가 발생했습니다.' });
    }
  }
);

router.patch(
  '/products/bulk-delete',
  body('ids').isArray({ min: 1 }),
  body('ids.*').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { ids } = req.body as { ids: number[] };
    try {
      await ensureProductColumnsReady();
      const { rowCount } = await pool.query(
        `UPDATE products
         SET is_active = FALSE, updated_at = NOW()
         WHERE id = ANY($1::BIGINT[])`,
        [ids]
      );
      res.json({
        message: '선택한 상품이 삭제 처리(비노출)되었습니다.',
        updatedCount: Number(rowCount || 0),
      });
    } catch (error) {
      console.error('Bulk delete products error:', error);
      res.status(500).json({ error: '상품 일괄 삭제 처리 중 오류가 발생했습니다.' });
    }
  }
);

// 모든 문의 조회
router.get('/inquiries', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM inquiries ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ error: '문의 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 모든 공지 조회 (관리자)
router.get('/notices', async (_req: Request, res: Response) => {
  try {
    await ensureNoticeColumnsReady();
    const { rows } = await pool.query(
      `SELECT id, title, content, author, views, is_active, is_important, created_at, updated_at
       FROM notices
       ORDER BY is_important DESC, created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get admin notices error:', error);
    res.status(500).json({ error: '공지사항 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 공지 등록
router.post(
  '/notices',
  body('title').isString().trim().isLength({ min: 1, max: 255 }),
  body('content').isString().trim().isLength({ min: 1 }),
  body('author').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('isImportant').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const { title, content, author, isImportant = false, isActive = true } = req.body as {
      title: string;
      content: string;
      author?: string;
      isImportant?: boolean;
      isActive?: boolean;
    };

    try {
      await ensureNoticeColumnsReady();
      const { rows } = await pool.query(
        `INSERT INTO notices (title, content, author, is_important, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, content, author, views, is_active, is_important, created_at, updated_at`,
        [title, content, author ?? null, isImportant, isActive]
      );
      res.status(201).json({ message: '공지사항이 등록되었습니다.', notice: rows[0] });
    } catch (error) {
      console.error('Create notice error:', error);
      res.status(500).json({ error: '공지사항 등록 중 오류가 발생했습니다.' });
    }
  }
);

// 공지 수정
router.patch(
  '/notices/:id',
  param('id').isInt({ min: 1 }),
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('content').optional().isString().trim().isLength({ min: 1 }),
  body('author').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 100 }),
  body('isImportant').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const noticeId = Number(req.params.id);
    const { title, content, author, isImportant, isActive } = req.body as {
      title?: string;
      content?: string;
      author?: string | null;
      isImportant?: boolean;
      isActive?: boolean;
    };

    try {
      await ensureNoticeColumnsReady();
      const { rows } = await pool.query(
        `UPDATE notices
         SET
           title = COALESCE($1, title),
           content = COALESCE($2, content),
           author = COALESCE($3, author),
           is_important = COALESCE($4, is_important),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
         WHERE id = $6
         RETURNING id, title, content, author, views, is_active, is_important, created_at, updated_at`,
        [title ?? null, content ?? null, author ?? null, isImportant ?? null, isActive ?? null, noticeId]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: '수정할 공지사항을 찾을 수 없습니다.' });
        return;
      }

      res.json({ message: '공지사항이 수정되었습니다.', notice: rows[0] });
    } catch (error) {
      console.error('Update notice error:', error);
      res.status(500).json({ error: '공지사항 수정 중 오류가 발생했습니다.' });
    }
  }
);

// 공지 완전 삭제
router.delete('/notices/:id', param('id').isInt({ min: 1 }), async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const noticeId = Number(req.params.id);
  try {
    await ensureNoticeColumnsReady();
    const result = await pool.query('DELETE FROM notices WHERE id = $1', [noticeId]);
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: '삭제할 공지사항을 찾을 수 없습니다.' });
      return;
    }
    res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: '공지사항 삭제 중 오류가 발생했습니다.' });
  }
});

// 문의 상태 업데이트
router.patch('/inquiries/:id/status', async (req: Request, res: Response) => {
  const inquiryId = Number(req.params.id);
  const { status } = req.body as { status?: string };

  if (!Number.isInteger(inquiryId) || inquiryId < 1) {
    res.status(400).json({ error: '유효한 문의 ID가 필요합니다.' });
    return;
  }

  if (status !== 'pending' && status !== 'answered') {
    res.status(400).json({ error: '유효한 상태값이 아닙니다.' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE inquiries SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, inquiryId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      return;
    }

    res.json({ message: '문의 상태가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({ error: '문의 상태 업데이트 중 오류가 발생했습니다.' });
  }
});

// 회원 목록 조회
router.get('/members', async (_req: Request, res: Response) => {
  try {
    await ensureFranchiseKeyColumnsReady();
    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.role,
         u.franchise_id,
         COALESCE(f.franchise_key, lf.franchise_key) AS franchise_key,
         COALESCE(f.franchise_key, lf.franchise_key) AS member_link_key,
         COALESCE(f.name, '-') AS franchise_name,
         COALESCE(lf.name, '-') AS location_franchise_name,
         u.is_active,
         u.created_at,
         u.updated_at
       FROM users u
       LEFT JOIN franchises f ON f.id = u.franchise_id
       LEFT JOIN location_franchises lf ON lf.id = u.franchise_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get admin members error:', error);
    res.status(500).json({ error: '회원 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 회원 생성/수정용 가맹점 목록 조회
router.get('/members/franchises', async (_req: Request, res: Response) => {
  try {
    await syncAllLocationFranchisesToFranchises();
    const { rows } = await pool.query(
      `SELECT id, franchise_key, name
       FROM franchises
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get member franchise list error:', error);
    res.status(500).json({ error: '가맹점 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 회원 생성
router.post(
  '/members',
  body('email').isEmail(),
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('password').isString().isLength({ min: 6, max: 255 }),
  body('role').isIn(['admin', 'franchise']),
  body('franchiseId').optional({ nullable: true }).isInt({ min: 1 }),
  body('franchiseKey').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 32 }),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const { email, name, password, role, franchiseId = null, franchiseKey = null, isActive = true } = req.body as {
      email: string;
      name: string;
      password: string;
      role: 'admin' | 'franchise';
      franchiseId?: number | null;
      franchiseKey?: string | null;
      isActive?: boolean;
    };

    if (role === 'franchise' && !franchiseId && !franchiseKey) {
      res.status(400).json({ error: '가맹점 회원은 franchiseKey(또는 franchiseId)가 필요합니다.' });
      return;
    }

    try {
      await ensureFranchiseKeyColumnsReady();
      let resolvedFranchiseId: number | null = null;
      if (role === 'franchise') {
        if (franchiseKey) {
          const matched = await pool.query<{ id: number }>(
            'SELECT id FROM franchises WHERE franchise_key = $1 AND is_active = TRUE',
            [franchiseKey.trim()]
          );
          if (matched.rows.length === 0) {
            res.status(400).json({ error: '유효한 franchiseKey가 아닙니다.' });
            return;
          }
          resolvedFranchiseId = Number(matched.rows[0].id);
        } else if (franchiseId) {
          resolvedFranchiseId = Number(franchiseId);
        }
      }
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password, name, role, franchise_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, role, franchise_id, is_active, created_at, updated_at`,
        [
          email.trim().toLowerCase(),
          hashed,
          name.trim(),
          role,
          role === 'franchise' ? resolvedFranchiseId : null,
          isActive,
        ]
      );
      res.status(201).json({ message: '회원이 생성되었습니다.', member: rows[0] });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
        return;
      }
      console.error('Create admin member error:', error);
      res.status(500).json({ error: '회원 생성 중 오류가 발생했습니다.' });
    }
  }
);

// 회원 수정
router.patch(
  '/members/:id',
  param('id').isInt({ min: 1 }),
  body('email').optional().isEmail(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('password').optional().isString().isLength({ min: 6, max: 255 }),
  body('role').optional().isIn(['admin', 'franchise']),
  body('franchiseId').optional({ nullable: true }).isInt({ min: 1 }),
  body('franchiseKey').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 32 }),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const memberId = Number(req.params.id);
    const { email, name, password, role, franchiseId, franchiseKey, isActive } = req.body as {
      email?: string;
      name?: string;
      password?: string;
      role?: 'admin' | 'franchise';
      franchiseId?: number | null;
      franchiseKey?: string | null;
      isActive?: boolean;
    };

    try {
      await ensureFranchiseKeyColumnsReady();
      const current = await pool.query<{ role: 'admin' | 'franchise'; franchise_id: number | null }>(
        'SELECT role, franchise_id FROM users WHERE id = $1',
        [memberId]
      );
      if (current.rows.length === 0) {
        res.status(404).json({ error: '수정할 회원을 찾을 수 없습니다.' });
        return;
      }

      const nextRole = role ?? current.rows[0].role;
      let nextFranchiseId =
        nextRole === 'franchise'
          ? (franchiseId ?? current.rows[0].franchise_id ?? null)
          : null;
      if (nextRole === 'franchise' && franchiseKey) {
        const matched = await pool.query<{ id: number }>(
          'SELECT id FROM franchises WHERE franchise_key = $1 AND is_active = TRUE',
          [franchiseKey.trim()]
        );
        if (matched.rows.length === 0) {
          res.status(400).json({ error: '유효한 franchiseKey가 아닙니다.' });
          return;
        }
        nextFranchiseId = Number(matched.rows[0].id);
      }
      if (nextRole === 'franchise' && !nextFranchiseId) {
        res.status(400).json({ error: '가맹점 회원은 franchiseKey(또는 franchiseId)가 필요합니다.' });
        return;
      }

      let hashedPassword: string | null = null;
      if (password) {
        const bcrypt = await import('bcryptjs');
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const { rows } = await pool.query(
        `UPDATE users
         SET
           email = COALESCE($1, email),
           name = COALESCE($2, name),
           password = COALESCE($3, password),
           role = COALESCE($4, role),
           franchise_id = CASE
             WHEN COALESCE($4, role) = 'franchise' THEN $5::BIGINT
             ELSE NULL::BIGINT
           END,
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
         WHERE id = $7
         RETURNING id, email, name, role, franchise_id, is_active, created_at, updated_at`,
        [
          email?.trim().toLowerCase() ?? null,
          name?.trim() ?? null,
          hashedPassword,
          role ?? null,
          nextFranchiseId === null ? null : Number(nextFranchiseId),
          isActive ?? null,
          memberId,
        ]
      );

      res.json({ message: '회원 정보가 수정되었습니다.', member: rows[0] });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
        return;
      }
      console.error('Update admin member error:', error);
      res.status(500).json({ error: '회원 수정 중 오류가 발생했습니다.' });
    }
  }
);

// 회원 완전 삭제
router.delete('/members/:id', param('id').isInt({ min: 1 }), async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const memberId = Number(req.params.id);
  const requesterId = Number(req.user?.id ?? 0);
  try {
    if (requesterId > 0 && requesterId === memberId) {
      res.status(409).json({ error: '현재 로그인한 관리자 계정은 삭제할 수 없습니다.' });
      return;
    }

    const { rows: targetRows } = await pool.query<{ role: 'admin' | 'franchise' }>(
      'SELECT role FROM users WHERE id = $1',
      [memberId]
    );
    if (targetRows.length === 0) {
      res.status(404).json({ error: '삭제할 회원을 찾을 수 없습니다.' });
      return;
    }

    if (targetRows[0].role === 'admin') {
      const { rows: adminCountRows } = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE role = 'admin'`
      );
      if (Number(adminCountRows[0]?.count ?? 0) <= 1) {
        res.status(409).json({ error: '마지막 관리자 계정은 삭제할 수 없습니다.' });
        return;
      }
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1', [memberId]);
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: '삭제할 회원을 찾을 수 없습니다.' });
      return;
    }
    res.json({ message: '회원이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete admin member error:', error);
    res.status(500).json({ error: '회원 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
