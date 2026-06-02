-- CMS pages/media (required before seed:init)

CREATE TABLE IF NOT EXISTS cms_pages (
  id BIGSERIAL PRIMARY KEY,
  page_key VARCHAR(120) UNIQUE NOT NULL,
  title VARCHAR(255),
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_media (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_key ON cms_pages (page_key);
CREATE INDEX IF NOT EXISTS idx_cms_media_created_at ON cms_media (created_at DESC);
