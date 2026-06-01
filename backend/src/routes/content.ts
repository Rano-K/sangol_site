import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { buildPublicApiUrl, buildPublicAssetUrl } from '../utils/publicUrls';

const router = express.Router();

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'cms');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  },
});

const ALLOWED_FONT_MIME_TYPES = new Set([
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
  'application/font-woff',
  'application/x-font-ttf',
  'application/x-font-opentype',
  'application/octet-stream',
]);
const ALLOWED_FONT_EXTENSIONS = new Set(['.woff2', '.woff', '.ttf', '.otf']);

const uploadFont = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_FONT_EXTENSIONS.has(ext) && ALLOWED_FONT_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new Error('폰트 파일(woff2, woff, ttf, otf)만 업로드할 수 있습니다.'));
  },
});

type CmsPageRow = {
  id: number;
  page_key: string;
  title: string | null;
  sections: Record<string, unknown>;
  seo: Record<string, unknown>;
  published: boolean;
  created_at: string;
  updated_at: string;
};

type CmsMediaRow = {
  id: number;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  file_path: string;
  public_url: string;
  created_by_user_id: number | null;
  created_at: string;
};

let cmsInitPromise: Promise<void> | null = null;

const ensureCmsTablesReady = async (): Promise<void> => {
  if (!cmsInitPromise) {
    cmsInitPromise = (async () => {
      await pool.query(`
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
      `);

      await pool.query(`
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
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cms_pages_key ON cms_pages (page_key);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cms_media_created_at ON cms_media (created_at DESC);
      `);
    })();
  }

  try {
    await cmsInitPromise;
  } catch (error) {
    // DB가 잠시 내려가 있을 수 있어, 다음 요청에서 재시도할 수 있도록 초기화한다.
    cmsInitPromise = null;
    throw error;
  }
};

const validate = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

const buildCmsMediaFileUrl = (mediaId: number | string): string =>
  buildPublicApiUrl(`/content/public/media/${mediaId}/file`);

const normalizeUploadedOriginalName = (rawName: string): string => {
  // 일부 브라우저/환경에서 multipart 파일명이 latin1로 해석되어 한글이 깨지는 경우를 복구한다.
  try {
    const recovered = Buffer.from(rawName, 'latin1').toString('utf8').trim();
    if (!recovered) return rawName;
    return recovered;
  } catch (_error) {
    return rawName;
  }
};

const mapPage = (row: CmsPageRow) => ({
  id: row.id,
  pageKey: row.page_key,
  title: row.title,
  sections: row.sections,
  seo: row.seo,
  published: row.published,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMedia = (row: CmsMediaRow) => ({
  id: row.id,
  fileName: row.file_name,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  filePath: row.file_path,
  publicUrl: row.public_url,
  fileUrl: buildCmsMediaFileUrl(row.id),
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at,
});

const mapPublicMedia = (row: CmsMediaRow) => ({
  id: row.id,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  fileUrl: buildCmsMediaFileUrl(row.id),
  createdAt: row.created_at,
});

// Public: 프론트 페이지 콘텐츠 조회
router.get(
  '/public/pages/:pageKey',
  param('pageKey').isLength({ min: 1, max: 120 }),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const { pageKey } = req.params;
    try {
      const { rows } = await pool.query<CmsPageRow>(
        'SELECT * FROM cms_pages WHERE page_key = $1 AND published = TRUE',
        [pageKey]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: '요청한 페이지 콘텐츠를 찾을 수 없습니다.' });
        return;
      }

      res.json(mapPage(rows[0]));
    } catch (error) {
      console.error('Get public CMS page error:', error);
      res.status(500).json({ error: '페이지 콘텐츠를 조회하는 중 오류가 발생했습니다.' });
    }
  }
);

// Public: 이미지 메타 조회
router.get(
  '/public/media/:id',
  param('id').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const mediaId = Number(req.params.id);
    try {
      const { rows } = await pool.query<CmsMediaRow>('SELECT * FROM cms_media WHERE id = $1', [mediaId]);
      if (rows.length === 0) {
        res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
        return;
      }
      res.json(mapPublicMedia(rows[0]));
    } catch (error) {
      console.error('Get public media meta error:', error);
      res.status(500).json({ error: '이미지 메타 조회 중 오류가 발생했습니다.' });
    }
  }
);

// Public: 이미지 파일 조회
router.get(
  '/public/media/:id/file',
  param('id').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const mediaId = Number(req.params.id);
    try {
      const { rows } = await pool.query<CmsMediaRow>('SELECT * FROM cms_media WHERE id = $1', [mediaId]);
      if (rows.length === 0) {
        res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
        return;
      }

      const media = rows[0];
      if (!fs.existsSync(media.file_path)) {
        res.status(404).json({ error: '이미지 파일이 존재하지 않습니다.' });
        return;
      }

      res.setHeader('Content-Type', media.mime_type);
      res.sendFile(path.resolve(media.file_path));
    } catch (error) {
      console.error('Get public media file error:', error);
      res.status(500).json({ error: '이미지 파일 조회 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 페이지 목록 조회
router.get('/admin/pages', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  await ensureCmsTablesReady();
  try {
    const { rows } = await pool.query<CmsPageRow>(
      'SELECT * FROM cms_pages ORDER BY updated_at DESC'
    );
    res.json(rows.map(mapPage));
  } catch (error) {
    console.error('Get CMS pages error:', error);
    res.status(500).json({ error: '페이지 목록을 조회하는 중 오류가 발생했습니다.' });
  }
});

// Admin: 단일 페이지 조회
router.get(
  '/admin/pages/:pageKey',
  authenticateToken,
  requireAdmin,
  param('pageKey').isLength({ min: 1, max: 120 }),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const { pageKey } = req.params;
    try {
      const { rows } = await pool.query<CmsPageRow>(
        'SELECT * FROM cms_pages WHERE page_key = $1',
        [pageKey]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: '페이지 콘텐츠가 없습니다.' });
        return;
      }

      res.json(mapPage(rows[0]));
    } catch (error) {
      console.error('Get CMS page error:', error);
      res.status(500).json({ error: '페이지 콘텐츠를 조회하는 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 페이지 생성/수정 (upsert)
router.put(
  '/admin/pages/:pageKey',
  authenticateToken,
  requireAdmin,
  param('pageKey').isLength({ min: 1, max: 120 }),
  body('title').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('sections').optional().isObject(),
  body('seo').optional().isObject(),
  body('published').optional().isBoolean(),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const { pageKey } = req.params;
    const {
      title = null,
      sections = {},
      seo = {},
      published = true,
    } = req.body as {
      title?: string | null;
      sections?: Record<string, unknown>;
      seo?: Record<string, unknown>;
      published?: boolean;
    };

    try {
      const { rows } = await pool.query<CmsPageRow>(
        `INSERT INTO cms_pages (page_key, title, sections, seo, published)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
         ON CONFLICT (page_key)
         DO UPDATE SET
           title = EXCLUDED.title,
           sections = EXCLUDED.sections,
           seo = EXCLUDED.seo,
           published = EXCLUDED.published,
           updated_at = NOW()
         RETURNING *`,
        [pageKey, title, JSON.stringify(sections), JSON.stringify(seo), published]
      );

      res.json({
        message: '페이지 콘텐츠가 저장되었습니다.',
        page: mapPage(rows[0]),
      });
    } catch (error) {
      console.error('Upsert CMS page error:', error);
      res.status(500).json({ error: '페이지 콘텐츠 저장 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 페이지 삭제
router.delete(
  '/admin/pages/:pageKey',
  authenticateToken,
  requireAdmin,
  param('pageKey').isLength({ min: 1, max: 120 }),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const { pageKey } = req.params;
    try {
      const result = await pool.query('DELETE FROM cms_pages WHERE page_key = $1', [pageKey]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: '삭제할 페이지 콘텐츠가 없습니다.' });
        return;
      }
      res.json({ message: '페이지 콘텐츠가 삭제되었습니다.' });
    } catch (error) {
      console.error('Delete CMS page error:', error);
      res.status(500).json({ error: '페이지 콘텐츠 삭제 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 이미지 업로드
router.post(
  '/admin/media/upload',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!req.file) {
      res.status(400).json({ error: '업로드할 이미지 파일(image)이 필요합니다.' });
      return;
    }

    const publicPath = `/uploads/cms/${req.file.filename}`;
    const publicUrl = buildPublicAssetUrl(publicPath);
    const originalName = normalizeUploadedOriginalName(req.file.originalname);
    try {
      const { rows } = await pool.query<CmsMediaRow>(
        `INSERT INTO cms_media (
          file_name, original_name, mime_type, size_bytes, file_path, public_url, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          req.file.filename,
          originalName,
          req.file.mimetype,
          req.file.size,
          req.file.path,
          publicUrl,
          req.user?.id ?? null,
        ]
      );

      res.status(201).json({
        message: '이미지가 업로드되었습니다.',
        media: mapMedia(rows[0]),
      });
    } catch (error) {
      console.error('Upload CMS media error:', error);
      res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 폰트 업로드
router.post(
  '/admin/media/upload-font',
  authenticateToken,
  requireAdmin,
  uploadFont.single('font'),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!req.file) {
      res.status(400).json({ error: '업로드할 폰트 파일(font)이 필요합니다.' });
      return;
    }

    const publicPath = `/uploads/cms/${req.file.filename}`;
    const publicUrl = buildPublicAssetUrl(publicPath);
    const originalName = normalizeUploadedOriginalName(req.file.originalname);
    try {
      const { rows } = await pool.query<CmsMediaRow>(
        `INSERT INTO cms_media (
          file_name, original_name, mime_type, size_bytes, file_path, public_url, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          req.file.filename,
          originalName,
          req.file.mimetype,
          req.file.size,
          req.file.path,
          publicUrl,
          req.user?.id ?? null,
        ]
      );

      res.status(201).json({
        message: '폰트가 업로드되었습니다.',
        media: mapMedia(rows[0]),
      });
    } catch (error) {
      console.error('Upload CMS font error:', error);
      res.status(500).json({ error: '폰트 업로드 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 이미지 목록 조회
router.get('/admin/media', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  await ensureCmsTablesReady();
  try {
    const { rows } = await pool.query<CmsMediaRow>(
      'SELECT * FROM cms_media ORDER BY created_at DESC'
    );
    res.json(rows.map(mapMedia));
  } catch (error) {
    console.error('Get CMS media error:', error);
    res.status(500).json({ error: '이미지 목록 조회 중 오류가 발생했습니다.' });
  }
});

// Admin: 이미지 삭제
router.delete(
  '/admin/media/:id',
  authenticateToken,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    await ensureCmsTablesReady();
    if (!validate(req, res)) return;

    const mediaId = Number(req.params.id);
    try {
      const { rows } = await pool.query<CmsMediaRow>(
        'DELETE FROM cms_media WHERE id = $1 RETURNING *',
        [mediaId]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: '삭제할 이미지가 없습니다.' });
        return;
      }

      const deleted = rows[0];
      if (fs.existsSync(deleted.file_path)) {
        fs.unlinkSync(deleted.file_path);
      }

      res.json({ message: '이미지가 삭제되었습니다.', media: mapMedia(deleted) });
    } catch (error) {
      console.error('Delete CMS media error:', error);
      res.status(500).json({ error: '이미지 삭제 중 오류가 발생했습니다.' });
    }
  }
);

export default router;
