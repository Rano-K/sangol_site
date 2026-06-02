/**
 * GNB 「브랜드소개」 8개 CMS 페이지 초기 데이터를 DB에 반영합니다.
 *
 * npm run seed:brand-intro-cms          — 빈 필드만 채움
 * npm run seed:brand-intro-cms:restore  — 전체 복구 (MediaId 유지)
 */
import 'dotenv/config';
import pool from '../config/database.js';
import { PAGE_SECTION_SCHEMAS, CMS_PAGE_TITLES } from './cmsPageSchemas.js';
import {
  BRAND_INTRO_CMS_DEFAULTS,
  BRAND_INTRO_MEDIA_BINDINGS,
  BRAND_INTRO_PAGE_KEYS,
  type BrandIntroPageKey,
} from './brandIntroCmsDefaults.js';
import {
  mergeFillEmptyCms,
  preserveCmsMediaFields,
  type CmsJson,
} from './cmsSeedMerge.js';

async function getMediaIdByOriginalName(originalName: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1',
    [originalName]
  );
  if (rows.length === 0) return null;
  return Number(rows[0].id);
}

async function attachMediaIdsAsync(sections: CmsJson, pageKey: BrandIntroPageKey): Promise<CmsJson> {
  const bindings = BRAND_INTRO_MEDIA_BINDINGS[pageKey];
  const out = JSON.parse(JSON.stringify(sections)) as CmsJson;
  let certIds: Array<number | string> = Array.isArray(out.certMediaIds)
    ? [...(out.certMediaIds as Array<number | string>)]
    : ['', '', ''];

  for (const binding of bindings) {
    const id = await getMediaIdByOriginalName(binding.originalName);
    if (!id) continue;

    if (binding.field === 'certMediaIds' && binding.arrayIndex !== undefined) {
      while (certIds.length <= binding.arrayIndex) certIds.push('');
      certIds[binding.arrayIndex] = id;
      continue;
    }

    const current = out[binding.field];
    if (current === undefined || current === null || current === '') {
      out[binding.field] = id;
    }
  }

  if (bindings.some((b) => b.field === 'certMediaIds')) {
    out.certMediaIds = certIds;
  }

  return out;
}

async function main(): Promise<void> {
  const forceRestore = process.env.FORCE_BRAND_INTRO_CMS_RESTORE === 'true';
  const updated: Array<{ pageKey: string; hasHeader: boolean }> = [];
  const missingMedia: string[] = [];

  for (const pageKey of BRAND_INTRO_PAGE_KEYS) {
    const schema = PAGE_SECTION_SCHEMAS[pageKey] ?? {};
    const pageDefaults = mergeFillEmptyCms(
      schema,
      JSON.parse(JSON.stringify(BRAND_INTRO_CMS_DEFAULTS[pageKey]))
    ) as CmsJson;

    const { rows } = await pool.query<{ sections: CmsJson }>(
      'SELECT sections FROM cms_pages WHERE page_key = $1',
      [pageKey]
    );
    const existing = rows[0]?.sections ?? {};

    let sections = forceRestore
      ? (preserveCmsMediaFields(pageDefaults, existing) as CmsJson)
      : (mergeFillEmptyCms(pageDefaults, existing) as CmsJson);

    sections = await attachMediaIdsAsync(sections, pageKey);

    for (const binding of BRAND_INTRO_MEDIA_BINDINGS[pageKey]) {
      const id = await getMediaIdByOriginalName(binding.originalName);
      if (!id) missingMedia.push(binding.originalName);
    }

    const title = CMS_PAGE_TITLES[pageKey] || pageKey;
    await pool.query(
      `INSERT INTO cms_pages (page_key, title, sections, seo, published)
       VALUES ($1, $2, $3::jsonb, '{}'::jsonb, TRUE)
       ON CONFLICT (page_key)
       DO UPDATE SET
         title = EXCLUDED.title,
         sections = EXCLUDED.sections,
         published = TRUE,
         updated_at = NOW()`,
      [pageKey, title, JSON.stringify(sections)]
    );

    const header = (sections.header ?? {}) as CmsJson;
    const hasHeader = Boolean(
      sections.headerTitle ||
        sections.headerSubtitle ||
        header.title ||
        header.subtitle
    );
    updated.push({ pageKey, hasHeader });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: forceRestore ? 'force-restore' : 'fill-empty',
        pages: updated,
        missingMedia: [...new Set(missingMedia)],
        hint:
          missingMedia.length > 0
            ? 'npm run seed:init 실행 후 다시 seed:brand-intro-cms:restore 를 실행하세요.'
            : undefined,
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
