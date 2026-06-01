-- 품목코드 현행화: {category_key}_{순번(2자리)} (예: FP_01, WIP_34)
-- product_categories.name 과 products.category 를 기준으로 재부여

BEGIN;

-- 1) 유니크 충돌 방지용 임시 코드
UPDATE products
SET product_code = 'TMP_' || id::text,
    updated_at = NOW();

-- 2) 카테고리별 순번 부여 (id 오름차순)
WITH numbered AS (
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
WHERE p.id = n.id;

COMMIT;
