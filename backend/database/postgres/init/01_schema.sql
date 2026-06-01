-- sangol DB에 연결한 상태에서 실행 (Docker 초기화 시 자동 실행됨)
-- 제안서 기준: B2B/B2C 통합 회원, 품목 마스터(코드·단위·과세·매입/판매가), 주문·상세·상태 이력

BEGIN;

-- ---------------------------------------------------------------------------
-- ENUM 타입
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'franchise', 'customer');
CREATE TYPE order_channel AS ENUM ('b2b', 'b2c');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
CREATE TYPE inquiry_status AS ENUM ('pending', 'answered');

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sangol_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 가맹점 (B2B)
-- ---------------------------------------------------------------------------
CREATE TABLE franchises (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  business_number VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) NOT NULL,
  email       VARCHAR(255),
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_franchises_updated_at
  BEFORE UPDATE ON franchises
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

CREATE INDEX idx_franchises_active ON franchises (is_active);

-- ---------------------------------------------------------------------------
-- 사용자 (admin / franchise 스태프 / 일반 고객 B2C)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          user_role NOT NULL,
  franchise_id  BIGINT REFERENCES franchises (id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_franchise_role_ck CHECK (
    (role = 'franchise' AND franchise_id IS NOT NULL)
    OR (role <> 'franchise')
  )
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_franchise ON users (franchise_id);

-- ---------------------------------------------------------------------------
-- 상품 카테고리 마스터 (카테고리명/카테고리 키)
-- ---------------------------------------------------------------------------
CREATE TABLE product_categories (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  category_key  VARCHAR(20) NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

INSERT INTO product_categories (name, category_key, is_active)
VALUES
  ('임산물', 'FP', TRUE),
  ('농산물', 'AG', TRUE),
  ('제품(가공식품)', 'PR', TRUE),
  ('재공품', 'WIP', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 품목 마스터 (품목코드, 단위, 과세, 매입가·판매가)
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  product_code  VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100) NOT NULL,
  description   TEXT,
  unit          VARCHAR(50) NOT NULL DEFAULT '1kg',
  tax_type      VARCHAR(20) NOT NULL DEFAULT 'taxable'
    CHECK (tax_type IN ('taxable', 'tax_exempt', 'zero_rated')),
  cost_price    NUMERIC(12, 2),
  price         NUMERIC(12, 2) NOT NULL,
  image_url     VARCHAR(500),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  stock_status  stock_status NOT NULL DEFAULT 'in_stock',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_active ON products (is_active);

-- ---------------------------------------------------------------------------
-- 주문 (B2B/B2C 구분, 가맹점·주문자 연결)
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                 BIGSERIAL PRIMARY KEY,
  order_channel      order_channel NOT NULL DEFAULT 'b2b',
  franchise_id       BIGINT REFERENCES franchises (id) ON DELETE SET NULL,
  placed_by_user_id  BIGINT REFERENCES users (id) ON DELETE SET NULL,
  delivery_address   TEXT,
  delivery_request   TEXT,
  status             order_status NOT NULL DEFAULT 'pending',
  total_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_channel_franchise_ck CHECK (
    (order_channel = 'b2b' AND franchise_id IS NOT NULL)
    OR (order_channel = 'b2c')
  )
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

CREATE INDEX idx_orders_franchise ON orders (franchise_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);
CREATE INDEX idx_orders_channel ON orders (order_channel);

-- ---------------------------------------------------------------------------
-- 주문 상세 (영수증·합산 근거)
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- 주문 상태 이력 (감사·통계·이슈 추적)
-- ---------------------------------------------------------------------------
CREATE TABLE order_status_logs (
  id                 BIGSERIAL PRIMARY KEY,
  order_id           BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status        order_status,
  to_status          order_status NOT NULL,
  changed_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_logs_order ON order_status_logs (order_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 공지사항 (커뮤니티/고객센터 확장 대비)
-- ---------------------------------------------------------------------------
CREATE TABLE notices (
  id         BIGSERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  content    TEXT NOT NULL,
  author     VARCHAR(100),
  views      INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

CREATE INDEX idx_notices_active ON notices (is_active);

-- ---------------------------------------------------------------------------
-- 문의 (B2C 고객센터)
-- ---------------------------------------------------------------------------
CREATE TABLE inquiries (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(20) NOT NULL,
  subject    VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  status     inquiry_status NOT NULL DEFAULT 'pending',
  response   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION sangol_set_updated_at();

CREATE INDEX idx_inquiries_status ON inquiries (status);

COMMIT;
