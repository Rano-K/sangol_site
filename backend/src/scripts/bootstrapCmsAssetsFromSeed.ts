import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import { buildPublicAssetUrl } from '../utils/publicUrls';

dotenv.config();

const SEED_DIR = path.resolve(process.cwd(), 'seed', 'cms-assets');
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'cms');

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const listSeedFiles = (): string[] => {
  if (!fs.existsSync(SEED_DIR)) {
    throw new Error(
      `[seed] Directory not found: ${SEED_DIR}\n` +
        'Git clone 후 backend/seed/cms-assets 가 있어야 합니다.'
    );
  }

  return fs
    .readdirSync(SEED_DIR)
    .filter((name) => {
      const full = path.join(SEED_DIR, name);
      return fs.statSync(full).isFile() && !name.startsWith('.');
    })
    .sort();
};

const upsertMediaFromSeedFile = async (originalName: string): Promise<number> => {
  const sourcePath = path.join(SEED_DIR, originalName);
  const ext = path.extname(originalName).toLowerCase();
  const storedName = originalName;
  const destinationPath = path.join(UPLOAD_DIR, storedName);
  const publicUrl = buildPublicAssetUrl(`/uploads/cms/${storedName}`);
  const stat = fs.statSync(sourcePath);
  const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);

  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1',
    [originalName]
  );

  if (existing.rows.length > 0) {
    const id = Number(existing.rows[0].id);
    await pool.query(
      `UPDATE cms_media
       SET file_name = $1,
           mime_type = $2,
           size_bytes = $3,
           file_path = $4,
           public_url = $5
       WHERE id = $6`,
      [storedName, mimeType, stat.size, destinationPath, publicUrl, id]
    );
    return id;
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO cms_media (
      file_name, original_name, mime_type, size_bytes, file_path, public_url, created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, NULL)
    RETURNING id`,
    [storedName, originalName, mimeType, stat.size, destinationPath, publicUrl]
  );

  return Number(inserted.rows[0].id);
};

const main = async (): Promise<void> => {
  const files = listSeedFiles();
  if (files.length === 0) {
    throw new Error(`[seed] No files in ${SEED_DIR}`);
  }

  console.log(`[seed] CMS assets from ${SEED_DIR} (${files.length} files)`);
  const ids: Record<string, number> = {};

  for (const fileName of files) {
    const id = await upsertMediaFromSeedFile(fileName);
    ids[fileName] = id;
    console.log(`  ✓ ${fileName} → media id ${id}`);
  }

  console.log('[seed] CMS media bootstrap complete.');
  console.log(JSON.stringify({ count: files.length, ids }, null, 2));
};

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ CMS seed bootstrap failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
