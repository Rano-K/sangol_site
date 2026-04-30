import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

type CmsMediaNameRow = {
  id: number;
  original_name: string;
};

const hasLikelyMojibake = (value: string): boolean =>
  /[ÃÂÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(value);

const decodeLatin1ToUtf8 = (value: string): string => Buffer.from(value, 'latin1').toString('utf8');

const hasHangul = (value: string): boolean => /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(value);

const shouldFixName = (raw: string, decoded: string): boolean => {
  if (!raw || !decoded) return false;
  if (raw === decoded) return false;
  if (decoded.includes('�')) return false;
  if (!hasLikelyMojibake(raw)) return false;
  // 안전하게 한글 파일명만 대상으로 한다.
  return hasHangul(decoded);
};

const DRY_RUN = !process.argv.includes('--apply');

const main = async (): Promise<void> => {
  const { rows } = await pool.query<CmsMediaNameRow>(
    `SELECT id, original_name
     FROM cms_media
     ORDER BY id ASC`
  );

  const targets = rows
    .map((row) => {
      const decoded = decodeLatin1ToUtf8(row.original_name).trim();
      return {
        id: row.id,
        before: row.original_name,
        after: decoded,
        fixable: shouldFixName(row.original_name, decoded),
      };
    })
    .filter((item) => item.fixable);

  console.log(`총 조회: ${rows.length}건`);
  console.log(`복구 대상: ${targets.length}건`);
  console.log(`실행 모드: ${DRY_RUN ? 'DRY-RUN(미적용)' : 'APPLY(실적용)'}`);

  if (targets.length === 0) return;

  console.log('\n[복구 미리보기 최대 20건]');
  targets.slice(0, 20).forEach((item) => {
    console.log(`#${item.id}`);
    console.log(`  before: ${item.before}`);
    console.log(`  after : ${item.after}`);
  });

  if (DRY_RUN) {
    console.log('\n적용하려면 아래 명령을 실행하세요:');
    console.log('npm run fix:cms-media-names -- --apply');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of targets) {
      await client.query('UPDATE cms_media SET original_name = $1 WHERE id = $2', [item.after, item.id]);
    }
    await client.query('COMMIT');
    console.log(`\n✅ 복구 완료: ${targets.length}건`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

void main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ cms_media original_name 복구 실패:', error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  });

