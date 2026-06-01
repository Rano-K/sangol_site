const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env") });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "sangol",
  user: process.env.DB_USER || "sangol",
  password: process.env.DB_PASSWORD || "sangol_dev_change_me",
});

const publicApiBaseUrl = String(process.env.PUBLIC_API_BASE_URL || "http://localhost:5101/api").replace(
  /\/+$/,
  ""
);
const publicOriginUrl = publicApiBaseUrl.replace(/\/api$/, "");
const buildPublicAssetUrl = (assetPath) => `${publicOriginUrl}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
const buildCmsMediaFileUrl = (mediaId) => `${publicApiBaseUrl}/content/public/media/${mediaId}/file`;

const resolveSourceDir = () => {
  const fromEnv = process.env.CMS_ASSETS_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const seedAssets = path.resolve(process.cwd(), "seed/cms-assets");
  if (fs.existsSync(seedAssets)) return seedAssets;

  const repoAssets = path.resolve(process.cwd(), "../assets");
  if (fs.existsSync(repoAssets)) return repoAssets;

  throw new Error(
    "[migrate-front-images] CMS_ASSETS_DIR is not set and ../assets was not found.\n" +
      "Example (Mac):\n" +
      '  CMS_ASSETS_DIR="/path/to/assets_for_front" node scripts/migrate-front-images-to-db.cjs\n' +
      "Ubuntu server: use uploads rsync + npm run fix:cms-media-urls instead (see scripts/README.md)."
  );
};

const sourceDir = resolveSourceDir();
const uploadDir = path.resolve(process.cwd(), "uploads", "cms");
const files = [
  "logo.png",
  "ft_logo.png",
  "sub1_1_img1.png",
  "sub1_2_img1.png",
  "sub1_3_img1.jpg",
  "sub1_3_img2.jpg",
  "sub1_3_img3.jpg",
  "sub2_2_img1.png",
  "sub2_4_img1.jpg",
];

const mimeByExt = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const upsertPage = async (pageKey, title, sections) => {
  await pool.query(
    `INSERT INTO cms_pages (page_key, title, sections, seo, published)
     VALUES ($1, $2, $3::jsonb, '{}'::jsonb, TRUE)
     ON CONFLICT(page_key)
     DO UPDATE SET
       title = EXCLUDED.title,
       sections = EXCLUDED.sections,
       published = TRUE,
       updated_at = NOW()`,
    [pageKey, title, JSON.stringify(sections)]
  );
};

const getPage = async (pageKey) => {
  const result = await pool.query("SELECT title, sections FROM cms_pages WHERE page_key = $1", [pageKey]);
  if (result.rows.length === 0) return { title: null, sections: {} };
  return { title: result.rows[0].title, sections: result.rows[0].sections || {} };
};

const uploadOrReuse = async (fileName) => {
  const existing = await pool.query(
    "SELECT id, public_url FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1",
    [fileName]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].public_url;
  }

  const sourcePath = path.join(sourceDir, fileName);
  if (!fs.existsSync(sourcePath)) return "";

  const ext = path.extname(fileName).toLowerCase();
  const safeBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 50);
  const storedName = `${Date.now()}-${safeBase}${ext}`;
  const destinationPath = path.join(uploadDir, storedName);
  fs.copyFileSync(sourcePath, destinationPath);

  const publicUrl = buildPublicAssetUrl(`/uploads/cms/${storedName}`);
  const stat = fs.statSync(destinationPath);
  const insert = await pool.query(
    `INSERT INTO cms_media (
      file_name, original_name, mime_type, size_bytes, file_path, public_url, created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, NULL)
    RETURNING id`,
    [storedName, fileName, mimeByExt[ext] || "application/octet-stream", stat.size, destinationPath, publicUrl]
  );
  return buildCmsMediaFileUrl(insert.rows[0].id);
};

const main = async () => {
  fs.mkdirSync(uploadDir, { recursive: true });
  const media = {};
  for (const fileName of files) {
    media[fileName] = await uploadOrReuse(fileName);
  }

  {
    const current = await getPage("site-layout");
    const sections = current.sections;
    sections.logo = sections.logo || {};
    sections.logo.headerLogoUrl = media["logo.png"] || sections.logo.headerLogoUrl || "";
    sections.logo.footerLogoUrl = media["ft_logo.png"] || sections.logo.footerLogoUrl || "";
    await upsertPage("site-layout", current.title || "사이트 공통", sections);
  }
  {
    const current = await getPage("company-greeting");
    const sections = current.sections;
    sections.mainImageUrl = media["sub1_1_img1.png"] || sections.mainImageUrl || "";
    await upsertPage("company-greeting", current.title || "인사말", sections);
  }
  {
    const current = await getPage("company-history");
    const sections = current.sections;
    sections.historyImageUrl = media["sub1_2_img1.png"] || sections.historyImageUrl || "";
    await upsertPage("company-history", current.title || "연혁", sections);
  }
  {
    const current = await getPage("company-awards");
    const sections = current.sections;
    sections.cert1ImageUrl = media["sub1_3_img1.jpg"] || sections.cert1ImageUrl || "";
    sections.cert2ImageUrl = media["sub1_3_img2.jpg"] || sections.cert2ImageUrl || "";
    sections.cert3ImageUrl = media["sub1_3_img3.jpg"] || sections.cert3ImageUrl || "";
    await upsertPage("company-awards", current.title || "수상 및 인증", sections);
  }
  {
    const current = await getPage("business-vision");
    const sections = current.sections;
    sections.visionImageUrl = media["sub2_2_img1.png"] || sections.visionImageUrl || "";
    await upsertPage("business-vision", current.title || "비전", sections);
  }
  {
    const current = await getPage("business-farm");
    const sections = current.sections;
    sections.farmImageUrl = media["sub2_4_img1.jpg"] || sections.farmImageUrl || "";
    await upsertPage("business-farm", current.title || "농장소개", sections);
  }
  {
    const current = await getPage("products");
    const sections = current.sections;
    sections.forestFallbackImageUrl = media["sub1_1_img1.png"] || sections.forestFallbackImageUrl || "";
    sections.agricultureFallbackImageUrl = media["sub2_2_img1.png"] || sections.agricultureFallbackImageUrl || "";
    sections.manufacturedFallbackImageUrl = media["sub2_4_img1.jpg"] || sections.manufacturedFallbackImageUrl || "";
    await upsertPage("products", current.title || "상품소개", sections);
  }

  console.log(JSON.stringify(media, null, 2));
};

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });

