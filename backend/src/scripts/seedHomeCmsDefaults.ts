/**
 * 메인 홈 CMS 초기 데이터를 cms_pages(home)에 반영합니다.
 *
 * 기본: 빈 필드만 기본값으로 채움 (admin에서 수정한 값은 유지)
 * FORCE_HOME_CMS_RESTORE=true: home sections 전체를 기본값으로 교체 (MediaId만 유지)
 *
 * 실행: npm run seed:home-cms
 */
import 'dotenv/config';
import pool from '../config/database.js';
import { PAGE_SECTION_SCHEMAS } from './cmsPageSchemas.js';
import { HOME_CMS_DEFAULT_SECTIONS } from './homeCmsDefaults.js';

type Json = Record<string, unknown>;

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const preserveMediaFields = (target: unknown, source: unknown): unknown => {
  if (Array.isArray(target)) {
    const srcArr = Array.isArray(source) ? source : [];
    return target.map((item, index) => preserveMediaFields(item, srcArr[index]));
  }
  if (target && typeof target === 'object') {
    const out = JSON.parse(JSON.stringify(target)) as Json;
    const src =
      source && typeof source === 'object' && !Array.isArray(source) ? (source as Json) : {};
    for (const [key, value] of Object.entries(out)) {
      if (key.endsWith('MediaId') || key === 'certMediaIds') {
        const srcVal = src[key];
        if (srcVal !== undefined && srcVal !== null && srcVal !== '') {
          out[key] = srcVal;
        }
        continue;
      }
      out[key] = preserveMediaFields(value, src[key]);
    }
    return out;
  }
  return target;
};

/** defaults 구조 기준, current에 값이 있으면 current 우선 */
const mergeFillEmpty = (defaults: unknown, current: unknown): unknown => {
  if (Array.isArray(defaults)) {
    const currentArr = Array.isArray(current) ? current : [];
    return defaults.map((item, index) => mergeFillEmpty(item, currentArr[index]));
  }
  if (defaults && typeof defaults === 'object') {
    const base = defaults as Json;
    const cur =
      current && typeof current === 'object' && !Array.isArray(current) ? (current as Json) : {};
    const merged: Json = { ...cur };
    for (const [key, value] of Object.entries(base)) {
      if (key.endsWith('MediaId') && cur[key] !== undefined && cur[key] !== null && cur[key] !== '') {
        merged[key] = cur[key];
        continue;
      }
      merged[key] = mergeFillEmpty(value, cur[key]);
    }
    return merged;
  }
  if (isEmpty(current)) return defaults;
  return current;
};

async function main(): Promise<void> {
  const forceRestore = process.env.FORCE_HOME_CMS_RESTORE === 'true';
  const schema = PAGE_SECTION_SCHEMAS.home ?? {};
  const defaults = mergeFillEmpty(
    schema,
    JSON.parse(JSON.stringify(HOME_CMS_DEFAULT_SECTIONS))
  ) as Json;

  const { rows } = await pool.query<{ sections: Json }>(
    'SELECT sections FROM cms_pages WHERE page_key = $1',
    ['home']
  );
  const existing = rows[0]?.sections ?? {};

  const sections = forceRestore
    ? (preserveMediaFields(defaults, existing) as Json)
    : (mergeFillEmpty(defaults, existing) as Json);

  await pool.query(
    `INSERT INTO cms_pages (page_key, title, sections, seo, published)
     VALUES ('home', '메인 홈', $1::jsonb, '{}'::jsonb, TRUE)
     ON CONFLICT (page_key)
     DO UPDATE SET
       title = EXCLUDED.title,
       sections = EXCLUDED.sections,
       published = TRUE,
       updated_at = NOW()`,
    [JSON.stringify(sections)]
  );

  const check = await pool.query<{ hero_title: string; feature_count: string; hero_image_count: string }>(
    `SELECT
       COALESCE(sections #>> '{hero,title}', '') AS hero_title,
       jsonb_array_length(COALESCE(sections #> '{features}', '[]'::jsonb))::text AS feature_count,
       (
         SELECT COUNT(*)::text
         FROM jsonb_array_elements_text(COALESCE(sections #> '{heroImages}', '[]'::jsonb)) AS img(url)
         WHERE trim(url) <> ''
       ) AS hero_image_count
     FROM cms_pages WHERE page_key = 'home'`,
    []
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: forceRestore ? 'force-restore' : 'fill-empty',
        home: check.rows[0],
      },
      null,
      2
    )
  );
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
