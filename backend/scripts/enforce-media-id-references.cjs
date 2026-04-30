const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "sangol",
  user: process.env.DB_USER || "sangol",
  password: process.env.DB_PASSWORD || "sangol_dev_change_me",
});

const getMediaId = async (originalName) => {
  const { rows } = await pool.query(
    "SELECT id FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1",
    [originalName]
  );
  if (rows.length === 0) return null;
  return Number(rows[0].id);
};

const getPageSections = async (pageKey) => {
  const { rows } = await pool.query("SELECT title, sections FROM cms_pages WHERE page_key = $1", [pageKey]);
  if (rows.length === 0) return { title: null, sections: {} };
  return { title: rows[0].title, sections: rows[0].sections || {} };
};

const upsertPage = async (pageKey, title, sections) => {
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
};

async function main() {
  const ids = {
    logo: await getMediaId("logo.png"),
    ftLogo: await getMediaId("ft_logo.png"),
    greeting: await getMediaId("sub1_1_img1.png"),
    history: await getMediaId("sub1_2_img1.png"),
    cert1: await getMediaId("sub1_3_img1.jpg"),
    cert2: await getMediaId("sub1_3_img2.jpg"),
    cert3: await getMediaId("sub1_3_img3.jpg"),
    vision: await getMediaId("sub2_2_img1.png"),
    farm: await getMediaId("sub2_4_img1.jpg"),
  };

  if (!ids.logo || !ids.ftLogo || !ids.greeting || !ids.history || !ids.cert1 || !ids.cert2 || !ids.cert3 || !ids.vision || !ids.farm) {
    throw new Error("필수 이미지 mediaId를 찾지 못했습니다. 먼저 migrate-front-images-to-db.cjs를 실행하세요.");
  }

  {
    const page = await getPageSections("site-layout");
    const sections = page.sections;
    sections.logo = sections.logo || {};
    sections.logo.headerLogoMediaId = ids.logo;
    sections.logo.footerLogoMediaId = ids.ftLogo;
    delete sections.logo.headerLogoUrl;
    delete sections.logo.footerLogoUrl;
    await upsertPage("site-layout", page.title || "사이트 공통", sections);
  }

  {
    const page = await getPageSections("company-greeting");
    const sections = page.sections;
    sections.mainImageMediaId = ids.greeting;
    delete sections.mainImageUrl;
    await upsertPage("company-greeting", page.title || "인사말", sections);
  }

  {
    const page = await getPageSections("company-history");
    const sections = page.sections;
    sections.historyImageMediaId = ids.history;
    delete sections.historyImageUrl;
    await upsertPage("company-history", page.title || "연혁", sections);
  }

  {
    const page = await getPageSections("company-awards");
    const sections = page.sections;
    sections.certMediaIds = [ids.cert1, ids.cert2, ids.cert3];
    sections.cert1MediaId = ids.cert1;
    sections.cert2MediaId = ids.cert2;
    sections.cert3MediaId = ids.cert3;
    delete sections.cert1ImageUrl;
    delete sections.cert2ImageUrl;
    delete sections.cert3ImageUrl;
    await upsertPage("company-awards", page.title || "수상 및 인증", sections);
  }

  {
    const page = await getPageSections("business-vision");
    const sections = page.sections;
    sections.visionImageMediaId = ids.vision;
    delete sections.visionImageUrl;
    await upsertPage("business-vision", page.title || "비전", sections);
  }

  {
    const page = await getPageSections("business-farm");
    const sections = page.sections;
    sections.farmImageMediaId = ids.farm;
    delete sections.farmImageUrl;
    await upsertPage("business-farm", page.title || "농장소개", sections);
  }

  {
    const page = await getPageSections("products");
    const sections = page.sections;
    sections.forestFallbackImageMediaId = ids.greeting;
    sections.agricultureFallbackImageMediaId = ids.vision;
    sections.manufacturedFallbackImageMediaId = ids.farm;
    delete sections.forestFallbackImageUrl;
    delete sections.agricultureFallbackImageUrl;
    delete sections.manufacturedFallbackImageUrl;
    await upsertPage("products", page.title || "상품소개", sections);
  }

  console.log(JSON.stringify(ids, null, 2));
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

