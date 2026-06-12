-- 메인 홈 인기 상품 지정 (admin 관리)

CREATE TABLE IF NOT EXISTS home_popular_products (
  id            BIGSERIAL PRIMARY KEY,
  product_id    BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_home_popular_products_product_id UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_home_popular_products_order
  ON home_popular_products (display_order ASC, id ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_home_popular_products_updated_at'
  ) THEN
    CREATE TRIGGER trg_home_popular_products_updated_at
      BEFORE UPDATE ON home_popular_products
      FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();
  END IF;
END $$;
