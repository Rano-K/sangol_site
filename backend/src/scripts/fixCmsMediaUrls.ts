import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import { buildPublicAssetUrl, buildPublicApiUrl } from '../utils/publicUrls';

dotenv.config();

type CmsMediaRow = {
  id: number;
  file_name: string;
  file_path: string;
  public_url: string;
};

const DRY_RUN = !process.argv.includes('--apply');
const uploadRoot = path.resolve(process.cwd(), 'uploads', 'cms');

const buildCmsMediaFileUrl = (mediaId: number): string =>
  buildPublicApiUrl(`/content/public/media/${mediaId}/file`);

const ensureFileInUploadRoot = (row: CmsMediaRow): string => {
  const destinationPath = path.join(uploadRoot, row.file_name);
  if (fs.existsSync(destinationPath)) {
    return destinationPath;
  }

  if (fs.existsSync(row.file_path)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
    fs.copyFileSync(row.file_path, destinationPath);
    return destinationPath;
  }

  return row.file_path;
};

const main = async (): Promise<void> => {
  fs.mkdirSync(uploadRoot, { recursive: true });

  const { rows } = await pool.query<CmsMediaRow>(
    `SELECT id, file_name, file_path, public_url
     FROM cms_media
     ORDER BY id ASC`
  );

  const updates: Array<{
    id: number;
    filePath: string;
    publicUrl: string;
    fileUrl: string;
    copied: boolean;
  }> = [];

  for (const row of rows) {
    const beforeExists = fs.existsSync(row.file_path);
    const filePath = ensureFileInUploadRoot(row);
    const afterExists = fs.existsSync(filePath);
    const publicUrl = buildPublicAssetUrl(`/uploads/cms/${row.file_name}`);
    const fileUrl = buildCmsMediaFileUrl(row.id);

    updates.push({
      id: row.id,
      filePath,
      publicUrl,
      fileUrl,
      copied: !beforeExists && afterExists,
    });

    if (!afterExists) {
      console.warn(`⚠️  id=${row.id} 파일 없음: ${row.file_path}`);
    }
  }

  console.log(`대상 ${updates.length}건 (${DRY_RUN ? 'DRY-RUN' : 'APPLY'})`);
  for (const item of updates) {
    console.log(
      `- id=${item.id} file=${item.copied ? 'copied' : 'ok'} public=${item.publicUrl} api=${item.fileUrl}`
    );
  }

  if (DRY_RUN) {
    console.log('\n적용하려면: npm run fix:cms-media-urls -- --apply');
    return;
  }

  for (const item of updates) {
    if (!fs.existsSync(item.filePath)) continue;
    await pool.query('UPDATE cms_media SET file_path = $1, public_url = $2 WHERE id = $3', [
      item.filePath,
      item.publicUrl,
      item.id,
    ]);
  }

  console.log('✅ cms_media URL/경로 정리 완료');
};

main()
  .catch((error) => {
    console.error('❌ cms_media URL 정리 실패:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
