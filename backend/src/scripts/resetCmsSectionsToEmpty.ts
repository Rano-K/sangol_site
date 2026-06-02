/**
 * cms_pages.sections 를 빈 골격(PAGE_SECTION_SCHEMAS)으로 맞춥니다.
 * *MediaId, certMediaIds 등 미디어 참조만 기존 값을 유지합니다.
 *
 * 실행: npm run seed:cms-reset && npm run seed:init
 */
import 'dotenv/config';
import pool from '../config/database.js';
import { CMS_PAGE_TITLES, PAGE_SECTION_SCHEMAS } from './cmsPageSchemas.js';

type Json = Record<string, unknown>;

const preserveMediaFields = (empty: unknown, current: unknown): unknown => {
  if (Array.isArray(empty)) {
    const curArr = Array.isArray(current) ? current : [];
    return empty.map((item, index) => preserveMediaFields(item, curArr[index]));
  }
  if (empty && typeof empty === 'object') {
    const base = empty as Json;
    const cur =
      current && typeof current === 'object' && !Array.isArray(current) ? (current as Json) : {};
    const out: Json = JSON.parse(JSON.stringify(base)) as Json;
    for (const [key, value] of Object.entries(out)) {
      if (key.endsWith('MediaId') || key === 'certMediaIds') {
        const curVal = cur[key];
        if (curVal !== undefined && curVal !== null && curVal !== '') {
          out[key] = curVal;
        }
        continue;
      }
      out[key] = preserveMediaFields(value, cur[key]);
    }
    return out;
  }
  return empty;
};

async function main(): Promise<void> {
  const updated: string[] = [];
  for (const [pageKey, schema] of Object.entries(PAGE_SECTION_SCHEMAS)) {
    const { rows } = await pool.query<{ sections: Json }>(
      'SELECT sections FROM cms_pages WHERE page_key = $1',
      [pageKey]
    );
    const existing = rows[0]?.sections ?? {};
    const sections = preserveMediaFields(schema, existing) as Json;
    const title = CMS_PAGE_TITLES[pageKey] || pageKey;

    await pool.query(
      `INSERT INTO cms_pages (page_key, title, sections, seo, published)
       VALUES ($1, $2, $3::jsonb, '{}'::jsonb, TRUE)
       ON CONFLICT (page_key)
       DO UPDATE SET title = EXCLUDED.title, sections = EXCLUDED.sections, updated_at = NOW()`,
      [pageKey, title, JSON.stringify(sections)]
    );
    updated.push(pageKey);
  }

  console.log(JSON.stringify({ ok: true, cmsPagesReset: updated }, null, 2));
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
