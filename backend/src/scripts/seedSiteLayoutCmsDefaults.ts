/**
 * site-layout(헤더·푸터·로고) CMS 초기 데이터를 DB에 반영합니다.
 *
 * npm run seed:site-layout-cms
 * npm run seed:site-layout-cms:restore
 */
import 'dotenv/config';
import pool from '../config/database.js';
import { PAGE_SECTION_SCHEMAS, CMS_PAGE_TITLES } from './cmsPageSchemas.js';
import {
  SITE_LAYOUT_CMS_DEFAULT_SECTIONS,
  SITE_LAYOUT_MEDIA_BINDINGS,
} from './siteLayoutCmsDefaults.js';
import {
  mergeFillEmptyCms,
  preserveCmsMediaFields,
  type CmsJson,
} from './cmsSeedMerge.js';

const PAGE_KEY = 'site-layout';

async function getMediaIdByOriginalName(originalName: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1',
    [originalName]
  );
  if (rows.length === 0) return null;
  return Number(rows[0].id);
}

async function attachLogoMediaIds(sections: CmsJson): Promise<{ sections: CmsJson; missingMedia: string[] }> {
  const out = JSON.parse(JSON.stringify(sections)) as CmsJson;
  const logo = (out.logo && typeof out.logo === 'object' ? out.logo : {}) as CmsJson;
  const missingMedia: string[] = [];

  for (const binding of SITE_LAYOUT_MEDIA_BINDINGS) {
    const id = await getMediaIdByOriginalName(binding.originalName);
    if (!id) {
      missingMedia.push(binding.originalName);
      continue;
    }
    const current = logo[binding.field];
    if (current === undefined || current === null || current === '') {
      logo[binding.field] = id;
    }
  }

  out.logo = logo;
  return { sections: out, missingMedia };
}

async function main(): Promise<void> {
  const forceRestore = process.env.FORCE_SITE_LAYOUT_CMS_RESTORE === 'true';
  const schema = PAGE_SECTION_SCHEMAS[PAGE_KEY] ?? {};
  const defaults = mergeFillEmptyCms(
    schema,
    JSON.parse(JSON.stringify(SITE_LAYOUT_CMS_DEFAULT_SECTIONS))
  ) as CmsJson;

  const { rows } = await pool.query<{ sections: CmsJson }>(
    'SELECT sections FROM cms_pages WHERE page_key = $1',
    [PAGE_KEY]
  );
  const existing = rows[0]?.sections ?? {};

  let sections = forceRestore
    ? (preserveCmsMediaFields(defaults, existing) as CmsJson)
    : (mergeFillEmptyCms(defaults, existing) as CmsJson);

  const attached = await attachLogoMediaIds(sections);
  sections = attached.sections;

  const title = CMS_PAGE_TITLES[PAGE_KEY] || PAGE_KEY;
  await pool.query(
    `INSERT INTO cms_pages (page_key, title, sections, seo, published)
     VALUES ($1, $2, $3::jsonb, '{}'::jsonb, TRUE)
     ON CONFLICT (page_key)
     DO UPDATE SET
       title = EXCLUDED.title,
       sections = EXCLUDED.sections,
       published = TRUE,
       updated_at = NOW()`,
    [PAGE_KEY, title, JSON.stringify(sections)]
  );

  const footer = (sections.footer ?? {}) as CmsJson;
  const topMenu = (sections.topMenu ?? {}) as CmsJson;
  const logo = (sections.logo ?? {}) as CmsJson;

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: forceRestore ? 'force-restore' : 'fill-empty',
        footer: {
          ownerName: footer.ownerName,
          csPhone: footer.csPhone,
          email: footer.email,
        },
        topMenu: {
          noticeText: topMenu.noticeText,
          loginLabel: topMenu.loginLabel,
        },
        logo: {
          headerLogoMediaId: logo.headerLogoMediaId,
          footerLogoMediaId: logo.footerLogoMediaId,
        },
        missingMedia: [...new Set(attached.missingMedia)],
        hint:
          attached.missingMedia.length > 0
            ? 'npm run seed:init 실행 후 seed:site-layout-cms:restore 를 다시 실행하세요.'
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
