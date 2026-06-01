-- 재공품 카테고리 신설 및 제품(가공식품) → 재공품 이관
-- 유지(제품(가공식품)): 산골 수정과, 산골 토종밤, 식혜, 모두부(심층해양수), 순두부, 연두부, 백태 콩물, 서리태 콩물, 청국장, 도토리묵

INSERT INTO product_categories (name, category_key, is_active)
VALUES ('재공품', 'WIP', TRUE)
ON CONFLICT (name) DO UPDATE
  SET category_key = EXCLUDED.category_key,
      is_active = TRUE,
      updated_at = NOW();

UPDATE products
SET category = '재공품',
    updated_at = NOW()
WHERE category = '제품(가공식품)'
  AND name NOT IN (
    '산골 수정과',
    '산골 토종밤',
    '식혜',
    '모두부(심층해양수)',
    '순두부',
    '연두부',
    '백태 콩물',
    '서리태 콩물',
    '청국장',
    '도토리묵'
  );
