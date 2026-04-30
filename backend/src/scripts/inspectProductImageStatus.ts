import dotenv from "dotenv";
import pool from "../config/database";

dotenv.config();

const extractFirstImgSrc = (html: unknown): string | null => {
  if (typeof html !== "string" || !html) return null;
  // description에 backslash가 섞여 들어가는 케이스(escaped quotes)까지 최대한 대응
  const match =
    html.match(/<img[^>]+src=\\"([^\\"]+)\\"/i) ||
    html.match(/<img[^>]+src=\\?"([^"\\]+)\\?"/i) ||
    html.match(/<img[^>]+src="([^"]+)"/i) ||
    html.match(/<img[^>]+src='([^']+)'/i);
  if (!match) return null;

  const src = String(match[1]).trim();
  if (!src) return null;
  // protocol-relative -> https://...
  if (src.startsWith("//")) return `https:${src}`;
  return src;
};

const main = async (): Promise<void> => {
  const { rows } = await pool.query<{
    total: string;
    missing_image_url: string;
    missing_image_data: string;
    missing_both: string;
    missing_url_but_has_img_in_description: string;
  }>(`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '')::text AS missing_image_url,
      COUNT(*) FILTER (WHERE image_data IS NULL)::text AS missing_image_data,
      COUNT(*) FILTER (
        WHERE (image_url IS NULL OR image_url = '')
          AND image_data IS NULL
      )::text AS missing_both
      ,
      COUNT(*) FILTER (
        WHERE (image_url IS NULL OR image_url = '')
          AND description ILIKE '%<img%'
          AND description ILIKE '%src=%'
      )::text AS missing_url_but_has_img_in_description
    FROM products
    WHERE is_active = TRUE;
  `);

  const stats = rows[0];
  // eslint-disable-next-line no-console
  console.log("=== products image stats (active only) ===");
  // eslint-disable-next-line no-console
  console.log({
    total: Number(stats.total),
    missing_image_url: Number(stats.missing_image_url),
    missing_image_data: Number(stats.missing_image_data),
    missing_both: Number(stats.missing_both),
    missing_url_but_has_img_in_description: Number(stats.missing_url_but_has_img_in_description),
  });

  const { rows: sampleRows } = await pool.query<{
    id: number;
    product_code: string | null;
    name: string | null;
    image_url: string | null;
    description: string | null;
  }>(`
    SELECT
      id,
      product_code,
      name,
      image_url,
      description
    FROM products
    WHERE is_active = TRUE
      AND (image_url IS NULL OR image_url = '')
      AND description ILIKE '%<img%'
      AND description ILIKE '%src=%'
    ORDER BY id DESC
    LIMIT 10;
  `);

  const enriched = sampleRows.map((r) => ({
    id: r.id,
    product_code: r.product_code,
    name: r.name,
    image_url: r.image_url,
    extracted_src: extractFirstImgSrc(r.description),
  }));

  // eslint-disable-next-line no-console
  console.log("=== sample (missing image_url) ===");
  // eslint-disable-next-line no-console
  console.dir(enriched, { depth: null });
};

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("inspectProductImageStatus error:", err);
    process.exit(1);
  });

