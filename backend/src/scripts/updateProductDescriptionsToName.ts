import dotenv from "dotenv";
import pool from "../config/database";

dotenv.config();

const main = async (): Promise<void> => {
  const NODE_ENV = process.env.NODE_ENV || "development";
  const DRY_RUN = (process.env.DRY_RUN || "true").toLowerCase() === "true";

  const ALLOW_PROD =
    (process.env.ALLOW_PROD_PRODUCT_DESC_UPDATE || "").toLowerCase() === "true" ||
    (process.env.ALLOW_PROD_PRODUCT_DESC_UPDATE || "").toLowerCase() === "1";

  if (NODE_ENV === "production" && !ALLOW_PROD) {
    throw new Error(
      "production 환경에서는 기본적으로 description 일괄 업데이트를 실행하지 않습니다. " +
        "정말 실행하려면 ALLOW_PROD_PRODUCT_DESC_UPDATE=true 로 명시하세요."
    );
  }

  const whereClause = "WHERE is_active = TRUE";

  const { rows: countRows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM products ${whereClause};`
  );
  const total = Number(countRows[0]?.count || 0);

  // eslint-disable-next-line no-console
  console.log("=== updateProductDescriptionsToName ===");
  // eslint-disable-next-line no-console
  console.log({ NODE_ENV, DRY_RUN, targetRows: total });

  if (DRY_RUN) {
    // eslint-disable-next-line no-console
    console.log("DRY_RUN=true 이므로 실제 UPDATE는 수행하지 않았습니다.");
    return;
  }

  await pool.query(
    `
      UPDATE products
      SET description = (COALESCE(name, '') || '입니다'),
          updated_at = NOW()
      ${whereClause};
    `
  );

  // eslint-disable-next-line no-console
  console.log("✅ 완료: products.description 을 name+\"입니다\"로 일괄 업데이트했습니다.");
};

void main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("updateProductDescriptionsToName error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });

