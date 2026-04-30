const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "sangol",
  user: process.env.DB_USER || "sangol",
  password: process.env.DB_PASSWORD || "sangol_dev_change_me",
});

const getLatestMediaByOriginalName = async (originalName) => {
  const { rows } = await pool.query(
    `SELECT id, public_url
     FROM cms_media
     WHERE original_name = $1
     ORDER BY id DESC
     LIMIT 1`,
    [originalName]
  );
  return rows[0] || null;
};

const getPageSections = async (pageKey) => {
  const { rows } = await pool.query("SELECT title, sections FROM cms_pages WHERE page_key = $1", [pageKey]);
  if (rows.length === 0) return { title: null, sections: {} };
  return { title: rows[0].title, sections: rows[0].sections || {} };
};

const upsertPageSections = async (pageKey, title, sections) => {
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
  const greeting = await getLatestMediaByOriginalName("sub1_1_img1.png");
  const history = await getLatestMediaByOriginalName("sub1_2_img1.png");
  const cert1 = await getLatestMediaByOriginalName("sub1_3_img1.jpg");
  const cert2 = await getLatestMediaByOriginalName("sub1_3_img2.jpg");
  const cert3 = await getLatestMediaByOriginalName("sub1_3_img3.jpg");

  if (!greeting || !history || !cert1 || !cert2 || !cert3) {
    throw new Error("회사소개 이미지 일부가 cms_media에 없습니다. 먼저 마이그레이션을 다시 실행하세요.");
  }

  {
    const page = await getPageSections("company-greeting");
    const sections = page.sections;
    sections.mainImageMediaId = Number(greeting.id);
    sections.mainImageUrl = greeting.public_url;
    await upsertPageSections("company-greeting", page.title || "인사말", sections);
  }

  {
    const page = await getPageSections("company-history");
    const sections = page.sections;
    sections.historyImageMediaId = Number(history.id);
    sections.historyImageUrl = history.public_url;
    await upsertPageSections("company-history", page.title || "연혁", sections);
  }

  {
    const page = await getPageSections("company-awards");
    const sections = page.sections;
    sections.certMediaIds = [Number(cert1.id), Number(cert2.id), Number(cert3.id)];
    sections.cert1MediaId = Number(cert1.id);
    sections.cert2MediaId = Number(cert2.id);
    sections.cert3MediaId = Number(cert3.id);
    sections.cert1ImageUrl = cert1.public_url;
    sections.cert2ImageUrl = cert2.public_url;
    sections.cert3ImageUrl = cert3.public_url;
    await upsertPageSections("company-awards", page.title || "수상 및 인증", sections);
  }

  console.log(
    JSON.stringify(
      {
        companyGreeting: greeting.public_url,
        companyHistory: history.public_url,
        companyAwards: [cert1.public_url, cert2.public_url, cert3.public_url],
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

