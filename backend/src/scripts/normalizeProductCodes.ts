/**
 * 품목코드를 product_categories.category_key 기준으로 현행화합니다.
 * 형식: {KEY}_{01..} (admin buildCodeSuggestion 과 동일)
 *
 * 실행: cd backend && npx ts-node src/scripts/normalizeProductCodes.ts
 * DRY_RUN=true 로 미리보기 가능
 */
import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

const DRY_RUN = (process.env.DRY_RUN || 'false').toLowerCase() === 'true';

const main = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const { rows: preview } = await client.query<{
      id: number;
      old_code: string;
      new_code: string;
      category: string;
    }>(
      `WITH numbered AS (
         SELECT
           p.id,
           p.product_code AS old_code,
           p.category,
           pc.category_key || '_' || LPAD(
             ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.id)::text,
             2,
             '0'
           ) AS new_code
         FROM products p
         INNER JOIN product_categories pc ON pc.name = p.category
       )
       SELECT id, old_code, new_code, category
       FROM numbered
       ORDER BY category, id`
    );

    const changes = preview.filter((row) => row.old_code !== row.new_code);
    console.log(`총 ${preview.length}건, 변경 예정 ${changes.length}건`);
    changes.slice(0, 20).forEach((row) => {
      console.log(`  #${row.id} [${row.category}] ${row.old_code} -> ${row.new_code}`);
    });
    if (changes.length > 20) {
      console.log(`  ... 외 ${changes.length - 20}건`);
    }

    if (DRY_RUN) {
      console.log('DRY_RUN=true — DB 변경 없음');
      return;
    }

    await client.query('BEGIN');
    await client.query(`UPDATE products SET product_code = 'TMP_' || id::text, updated_at = NOW()`);
    await client.query(
      `WITH numbered AS (
         SELECT
           p.id,
           pc.category_key || '_' || LPAD(
             ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.id)::text,
             2,
             '0'
           ) AS new_code
         FROM products p
         INNER JOIN product_categories pc ON pc.name = p.category
       )
       UPDATE products p
       SET product_code = n.new_code,
           updated_at = NOW()
       FROM numbered n
       WHERE p.id = n.id`
    );
    await client.query('COMMIT');
    console.log('품목코드 현행화 완료');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
