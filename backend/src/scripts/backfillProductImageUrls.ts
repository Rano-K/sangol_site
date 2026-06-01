import dotenv from "dotenv";
import pool from "../config/database";

dotenv.config();

type CategorySlug = "forest" | "agriculture" | "manufactured" | "wip";

const extractFirstImgSrc = (html: unknown): string | null => {
  if (typeof html !== "string" || !html) return null;

  const match =
    html.match(/<img[^>]+src=\\"([^\\"]+)\\"/i) ||
    html.match(/<img[^>]+src=\\?"([^"\\]+)\\?"/i) ||
    html.match(/<img[^>]+src="([^"]+)"/i) ||
    html.match(/<img[^>]+src='([^']+)'/i);

  if (!match) return null;

  const src = String(match[1] ?? "").trim();
  if (!src) return null;
  if (src.startsWith("//")) return `https:${src}`;
  // data: URL 등은 그대로 넣지 않도록 제외
  if (src.startsWith("data:")) return null;
  return src;
};

const getCategorySlug = (product: { category: string | null; product_code: string | null }): CategorySlug => {
  const normalizedCategory = String(product.category || "").trim();
  if (normalizedCategory === "임산물") return "forest";
  if (normalizedCategory === "농산물") return "agriculture";
  if (normalizedCategory === "제품(가공식품)") return "manufactured";
  if (normalizedCategory === "재공품") return "wip";

  const code = String(product.product_code || "").toUpperCase();
  if (/^FP_/.test(code) || code.startsWith("SG-IM-")) return "forest";
  if (/^AG_/.test(code) || code.startsWith("SG-AG-")) return "agriculture";
  if (/^PR_/.test(code) || code.startsWith("SG-PR-")) return "manufactured";
  if (/^WIP_/.test(code) || code.startsWith("SG-WIP-")) return "wip";

  if (["임산물", "산양삼", "산더덕", "산두룹", "공지"].includes(normalizedCategory)) return "forest";
  if (["농산물", "고추", "마늘", "양파", "토마토"].includes(normalizedCategory)) return "agriculture";

  return "manufactured";
};

const main = async (): Promise<void> => {
  const NODE_ENV = process.env.NODE_ENV || "development";
  const DRY_RUN = (process.env.DRY_RUN || "true").toLowerCase() === "true";

  const ALLOW_PROD =
    (process.env.ALLOW_PROD_IMAGE_BACKFILL || "").toLowerCase() === "true" ||
    (process.env.ALLOW_PROD_IMAGE_BACKFILL || "").toLowerCase() === "1";

  if (NODE_ENV === "production" && !ALLOW_PROD) {
    throw new Error("production 환경에서는 기본적으로 이미지 백필을 실행하지 않습니다. ALLOW_PROD_IMAGE_BACKFILL=true 로 명시하세요.");
  }

  // products CMS page 의존 제거:
  // 우선순위 1) description 내부 이미지 추출
  // 우선순위 2) 환경변수 기반 카테고리 fallback(선택)
  const fallbackBySlug: Partial<Record<CategorySlug, string>> = {
    forest: process.env.FALLBACK_IMAGE_FOREST || "",
    agriculture: process.env.FALLBACK_IMAGE_AGRICULTURE || "",
    manufactured: process.env.FALLBACK_IMAGE_MANUFACTURED || "",
    wip: process.env.FALLBACK_IMAGE_WIP || process.env.FALLBACK_IMAGE_MANUFACTURED || "",
  };

  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : null;
  const limitSql = limit && Number.isFinite(limit) && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : "";

  const { rows: productRows } = await pool.query<{
    id: number;
    product_code: string | null;
    name: string | null;
    category: string | null;
    description: string | null;
    image_url: string | null;
  }>(
    `
      SELECT id, product_code, name, category, description, image_url
      FROM products
      WHERE is_active = TRUE
        AND (image_url IS NULL OR image_url = '')
      ORDER BY id DESC
    ${limitSql}
    `
  );

  let updatedFromDescription = 0;
  let updatedFromFallback = 0;
  let skipped = 0;

  // eslint-disable-next-line no-console
  console.log(`=== backfillProductImageUrls ===`);
  // eslint-disable-next-line no-console
  console.log({ NODE_ENV, DRY_RUN, totalToProcess: productRows.length });

  for (let i = 0; i < productRows.length; i += 1) {
    const p = productRows[i];
    const extracted = extractFirstImgSrc(p.description);
    const slug = getCategorySlug({ category: p.category, product_code: p.product_code });
    const fallback = fallbackBySlug[slug] || "";

    const nextImageUrl = extracted || fallback;
    if (!nextImageUrl) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      if (extracted) updatedFromDescription += 1;
      else updatedFromFallback += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await pool.query(`UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2`, [
      nextImageUrl,
      p.id,
    ]);

    if (extracted) updatedFromDescription += 1;
    else updatedFromFallback += 1;
  }

  // eslint-disable-next-line no-console
  console.log("=== result ===");
  // eslint-disable-next-line no-console
  console.log({
    updatedFromDescription,
    updatedFromFallback,
    skipped,
    DRY_RUN,
  });
};

void main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("backfillProductImageUrls error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });

