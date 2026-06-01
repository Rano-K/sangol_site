-- 농산물 백태·서리태 및 재공품 일부 → 제품(가공식품) 이관
-- 이관 후 품목코드 카테고리별 재부여 (PR_xx, AG_xx, WIP_xx)

BEGIN;

-- 1) 농산물 → 제품(가공식품)
UPDATE products
SET category = '제품(가공식품)',
    updated_at = NOW()
WHERE category = '농산물'
  AND name IN ('백태(40kg)', '서리태(40kg)');

-- 2) 재공품 → 제품(가공식품)
UPDATE products
SET category = '제품(가공식품)',
    updated_at = NOW()
WHERE category = '재공품'
  AND (
    name ILIKE '메밀국수%'
    OR name ILIKE '수정과%'
    OR name = '산골 수정과'
    OR name ILIKE '식혜%'
    OR name ILIKE '우무묵%'
    OR name ILIKE '자른김%'
    OR name ILIKE '진도곱창김%'
    OR name ILIKE '산골청국장%'
    OR name ILIKE '콩국수%'
    OR name ILIKE '천일염%'
  );

-- 3) 품목코드 현행화 (유니크 충돌 방지 → 카테고리별 순번)
UPDATE products
SET product_code = 'TMP_' || id::text,
    updated_at = NOW();

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
