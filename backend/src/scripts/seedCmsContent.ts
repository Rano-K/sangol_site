/**
 * CMS 페이지 골격(빈 sections)을 DB에 반영합니다.
 * 마케팅 문구는 넣지 않습니다 — admin에서 편집한 값만 front에 노출됩니다.
 * 기존 cms_pages에 이미 값이 있으면 유지합니다.
 *
 * 실행: npm run seed:cms-content
 */
import 'dotenv/config';
import pool from '../config/database.js';
import { CMS_PAGE_TITLES, PAGE_SECTION_SCHEMAS } from './cmsPageSchemas.js';

type Json = Record<string, unknown>;

const CMS_PAGES: Record<string, { title: string; sections: Json }> = Object.fromEntries(
  Object.entries(PAGE_SECTION_SCHEMAS).map(([pageKey, sections]) => [
    pageKey,
    { title: CMS_PAGE_TITLES[pageKey] || pageKey, sections: JSON.parse(JSON.stringify(sections)) as Json },
  ])
);

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const mergeSections = (defaults: unknown, current: unknown): unknown => {
  if (Array.isArray(defaults)) {
    const currentArr = Array.isArray(current) ? current : [];
    return defaults.map((item, index) => mergeSections(item, currentArr[index]));
  }
  if (defaults && typeof defaults === 'object') {
    const base = defaults as Json;
    const cur = current && typeof current === 'object' && !Array.isArray(current) ? (current as Json) : {};
    const merged: Json = { ...cur };
    for (const [key, value] of Object.entries(base)) {
      if (key.endsWith('MediaId') && cur[key] !== undefined && cur[key] !== null && cur[key] !== '') {
        merged[key] = cur[key];
        continue;
      }
      if (key === 'certMediaIds' && Array.isArray(cur[key]) && (cur[key] as unknown[]).length > 0) {
        merged[key] = cur[key];
        continue;
      }
      merged[key] = mergeSections(value, cur[key]);
    }
    return merged;
  }
  if (isEmpty(current)) return defaults;
  return current;
};

async function getPageSections(pageKey: string): Promise<Json> {
  const { rows } = await pool.query<{ sections: Json }>(
    'SELECT sections FROM cms_pages WHERE page_key = $1',
    [pageKey]
  );
  return rows[0]?.sections ?? {};
}

async function upsertPage(pageKey: string, title: string, sections: Json): Promise<void> {
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
}

async function getCmsMediaIdByFileName(originalName: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1',
    [originalName]
  );
  if (rows.length === 0) return null;
  return Number(rows[0].id);
}

async function attachSiteLayoutLogoMediaIds(sections: Json): Promise<Json> {
  const logo = (sections.logo && typeof sections.logo === 'object' ? sections.logo : {}) as Json;
  const existingHeader = logo.headerLogoMediaId;
  const existingFooter = logo.footerLogoMediaId;
  const headerFromDb = await getCmsMediaIdByFileName('logo.png');
  const footerFromDb = await getCmsMediaIdByFileName('ft_logo.png');

  return {
    ...sections,
    logo: {
      headerLogoMediaId:
        existingHeader !== undefined && existingHeader !== null && existingHeader !== ''
          ? existingHeader
          : headerFromDb ?? '',
      footerLogoMediaId:
        existingFooter !== undefined && existingFooter !== null && existingFooter !== ''
          ? existingFooter
          : footerFromDb ?? '',
    },
  };
}

async function seedCmsPages(): Promise<string[]> {
  const updated: string[] = [];
  for (const [pageKey, payload] of Object.entries(CMS_PAGES)) {
    const existing = await getPageSections(pageKey);
    let merged = mergeSections(payload.sections, existing) as Json;
    if (pageKey === 'site-layout') {
      merged = await attachSiteLayoutLogoMediaIds(merged);
      const logo = merged.logo as Json;
      delete logo.headerLogoUrl;
      delete logo.footerLogoUrl;
    }
    await upsertPage(pageKey, payload.title, merged);
    updated.push(pageKey);
  }
  return updated;
}

async function seedNotices(): Promise<number> {
  return 0;
}

async function seedLocationFranchises(): Promise<number> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_franchises (
      id BIGSERIAL PRIMARY KEY,
      franchise_key VARCHAR(32),
      store_type VARCHAR(40) NOT NULL DEFAULT '',
      name VARCHAR(120) NOT NULL,
      store_phone VARCHAR(40),
      owner_name VARCHAR(80),
      owner_phone VARCHAR(40),
      address TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM location_franchises WHERE is_active = TRUE'
  );
  return 0;
}

async function main(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id BIGSERIAL PRIMARY KEY,
      page_key VARCHAR(120) UNIQUE NOT NULL,
      title VARCHAR(255),
      sections JSONB NOT NULL DEFAULT '{}'::jsonb,
      seo JSONB NOT NULL DEFAULT '{}'::jsonb,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const pages = await seedCmsPages();
  const noticeCount = await seedNotices();
  const locationCount = await seedLocationFranchises();

  console.log(
    JSON.stringify(
      {
        ok: true,
        cmsPagesUpdated: pages,
        noticesInserted: noticeCount,
        locationFranchisesInserted: locationCount,
        hint: '이미지(mediaId) 연결은 npm run migrate:front-images 후 enforce-media-id 스크립트를 추가 실행하세요.',
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
