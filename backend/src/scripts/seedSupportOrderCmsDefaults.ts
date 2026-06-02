/**
 * 고객센터(support)·주문(order) CMS 초기 데이터를 DB에 반영합니다.
 *
 * npm run seed:support-order-cms
 * npm run seed:support-order-cms:restore
 */
import 'dotenv/config';
import pool from '../config/database.js';
import { PAGE_SECTION_SCHEMAS, CMS_PAGE_TITLES } from './cmsPageSchemas.js';
import {
  ORDER_CMS_DEFAULT_SECTIONS,
  SUPPORT_CMS_DEFAULT_SECTIONS,
} from './supportOrderCmsDefaults.js';
import {
  mergeFillEmptyCms,
  preserveCmsMediaFields,
  type CmsJson,
} from './cmsSeedMerge.js';

const PAGE_CONFIGS = [
  { pageKey: 'support', defaults: SUPPORT_CMS_DEFAULT_SECTIONS },
  { pageKey: 'order', defaults: ORDER_CMS_DEFAULT_SECTIONS },
] as const;

async function upsertPage(
  pageKey: string,
  defaultSections: Record<string, unknown>,
  forceRestore: boolean
): Promise<CmsJson> {
  const schema = PAGE_SECTION_SCHEMAS[pageKey] ?? {};
  const defaults = mergeFillEmptyCms(
    schema,
    JSON.parse(JSON.stringify(defaultSections))
  ) as CmsJson;

  const { rows } = await pool.query<{ sections: CmsJson }>(
    'SELECT sections FROM cms_pages WHERE page_key = $1',
    [pageKey]
  );
  const existing = rows[0]?.sections ?? {};

  const sections = forceRestore
    ? (preserveCmsMediaFields(defaults, existing) as CmsJson)
    : (mergeFillEmptyCms(defaults, existing) as CmsJson);

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

  return sections;
}

async function main(): Promise<void> {
  const forceRestore = process.env.FORCE_SUPPORT_ORDER_CMS_RESTORE === 'true';
  const results: Record<string, unknown> = {};

  for (const { pageKey, defaults } of PAGE_CONFIGS) {
    const sections = await upsertPage(pageKey, defaults, forceRestore);
    if (pageKey === 'support') {
      const header = (sections.header ?? {}) as CmsJson;
      const consult = (sections.consult ?? {}) as CmsJson;
      const faqs = Array.isArray(sections.faqs) ? sections.faqs : [];
      results.support = {
        headerTitle: header.title,
        consultPhone: consult.phone,
        faqCount: faqs.length,
      };
    } else {
      const payment = (sections.payment ?? {}) as CmsJson;
      results.order = {
        accountName: payment.accountName,
        accountNumber: payment.accountNumber,
        requiredNotice: payment.requiredNotice,
      };
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: forceRestore ? 'force-restore' : 'fill-empty',
        ...results,
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
