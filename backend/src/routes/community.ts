import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env';

const router = express.Router();

type CommunityPostRow = {
  id: number;
  title: string;
  content: string;
  author_name: string;
  views: number;
  is_secret: boolean;
  post_password_hash?: string | null;
  created_at: string;
  updated_at: string;
};

type CommunityCommentRow = {
  id: number;
  post_id: number;
  author_name: string;
  content: string;
  created_at: string;
};

type CommunityConcertVideoRow = {
  id: number;
  title: string;
  youtube_url: string;
  description: string | null;
  hashtags: string | null;
  source_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

let communityInitPromise: Promise<void> | null = null;
const DEFAULT_CONCERT_VIDEOS = [
  {
    title: '산골 찬가',
    youtubeUrl: 'https://www.youtube.com/watch?v=Eo1E1hyYDO8&feature=youtu.be',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 1,
  },
  {
    title: '산골마늘 파종',
    youtubeUrl: 'https://www.youtube.com/watch?v=V2sLNTR5IG8',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 2,
  },
  {
    title: '산골 토종밤 이야기',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZTdXm8Y7Cj8&feature=youtu.be',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 3,
  },
  {
    title: '명품 생표고 버섯 이야기',
    youtubeUrl: 'https://youtu.be/SkYq7kPpD14?si=J8U1vEnVJIApQRom',
    description: '산골이야기 게시글 관련 링크 영상',
    hashtags: '#산골 #산골이야기 #명품생표고버섯',
    sourceUrl: 'https://xn--bb0b388a.com/bbs/board.php?bo_table=comu2&wr_id=10',
    sortOrder: 4,
  },
  {
    title: '산골 식혜',
    youtubeUrl: 'https://www.youtube.com/watch?v=Qb7c__TbTQ0&feature=youtu.be',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 5,
  },
  {
    title: '명품농부 산양삼 이야기',
    youtubeUrl: 'https://www.youtube.com/watch?v=UEuXbdRTmN8&feature=youtu.be',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 6,
  },
  {
    title: '산골 작은음악회',
    youtubeUrl: 'https://www.youtube.com/watch?v=72Lz9jTbSiM',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 7,
  },
  {
    title: '청정의힘 산골 임산물 국가통합브랜드',
    youtubeUrl: 'https://www.youtube.com/watch?v=NlhnX1o8_Ck',
    description: '산골 작은음악회 영상',
    hashtags: '#산골 #작은음악회',
    sourceUrl: null,
    sortOrder: 8,
  },
] as const;

const ensureCommunityTablesReady = async (): Promise<void> => {
  if (!communityInitPromise) {
    communityInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS community_posts (
          id BIGSERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          author_name VARCHAR(100) NOT NULL,
          views INTEGER NOT NULL DEFAULT 0,
          is_secret BOOLEAN NOT NULL DEFAULT FALSE,
          post_password_hash VARCHAR(255),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT FALSE;`);
      await pool.query(`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_password_hash VARCHAR(255);`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS community_comments (
          id BIGSERIAL PRIMARY KEY,
          post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
          author_name VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS community_concert_videos (
          id BIGSERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          youtube_url TEXT NOT NULL,
          description TEXT,
          hashtags TEXT,
          source_url TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`ALTER TABLE community_concert_videos ADD COLUMN IF NOT EXISTS hashtags TEXT;`);
      await pool.query(`ALTER TABLE community_concert_videos ADD COLUMN IF NOT EXISTS source_url TEXT;`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_community_concert_videos_youtube_url ON community_concert_videos (youtube_url);`);

      for (const video of DEFAULT_CONCERT_VIDEOS) {
        await pool.query(
          `INSERT INTO community_concert_videos
           (title, youtube_url, description, hashtags, source_url, is_active, sort_order, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6, NULL)
           ON CONFLICT (youtube_url)
           DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             hashtags = EXCLUDED.hashtags,
             source_url = EXCLUDED.source_url,
             sort_order = EXCLUDED.sort_order,
             updated_at = NOW()`,
          [video.title, video.youtubeUrl, video.description, video.hashtags, video.sourceUrl, video.sortOrder]
        );
      }
    })();
  }

  try {
    await communityInitPromise;
  } catch (error) {
    communityInitPromise = null;
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

const isAdminRequest = (req: Request): boolean => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return false;

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { role?: string };
    return payload?.role === 'admin';
  } catch {
    return false;
  }
};

// Public: 산골이야기 글 목록
router.get('/posts', async (req: Request, res: Response) => {
  await ensureCommunityTablesReady();
  try {
    const isAdmin = isAdminRequest(req);
    const { rows } = await pool.query<CommunityPostRow>(
      `SELECT
         id,
         title,
         CASE
           WHEN is_secret = TRUE AND $1::boolean = FALSE THEN '비밀글입니다. 관리자만 확인할 수 있습니다.'
           ELSE content
         END AS content,
         CASE
           WHEN is_secret = TRUE AND $1::boolean = FALSE THEN '비공개'
           ELSE author_name
         END AS author_name,
         views,
         is_secret,
         created_at,
         updated_at
       FROM community_posts
       WHERE is_active = TRUE
       ORDER BY created_at DESC`,
      [isAdmin]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ error: '산골이야기 목록 조회 중 오류가 발생했습니다.' });
  }
});

// Public: 산골이야기 글 상세 + 댓글
router.get(
  '/posts/:id',
  param('id').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const postId = Number(req.params.id);
    try {
      const { rows: postRows } = await pool.query<CommunityPostRow>(
        `SELECT id, title, content, author_name, views, is_secret, post_password_hash, created_at, updated_at
         FROM community_posts
         WHERE id = $1 AND is_active = TRUE`,
        [postId]
      );

      if (postRows.length === 0) {
        res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        return;
      }

      const isAdmin = isAdminRequest(req);
      if (postRows[0].is_secret && !isAdmin) {
        const postPassword = typeof req.query.postPassword === 'string' ? req.query.postPassword : '';
        const passwordHash = postRows[0].post_password_hash;
        if (!postPassword || !passwordHash) {
          res.status(403).json({ error: '비밀글입니다. 비밀번호를 입력해 주세요.' });
          return;
        }
        const isPasswordValid = await bcrypt.compare(postPassword, passwordHash);
        if (!isPasswordValid) {
          res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' });
          return;
        }
      }

      await pool.query('UPDATE community_posts SET views = views + 1, updated_at = NOW() WHERE id = $1', [postId]);

      const { rows: commentRows } = await pool.query<CommunityCommentRow>(
        `SELECT id, post_id, author_name, content, created_at
         FROM community_comments
         WHERE post_id = $1 AND is_active = TRUE
         ORDER BY created_at ASC`,
        [postId]
      );

      const post = postRows[0];
      res.json({
        post: {
          id: post.id,
          title: post.title,
          content: post.content,
          author_name: post.author_name,
          views: post.views,
          is_secret: post.is_secret,
          created_at: post.created_at,
          updated_at: post.updated_at,
        },
        comments: commentRows,
      });
    } catch (error) {
      console.error('Get community post detail error:', error);
      res.status(500).json({ error: '게시글 상세 조회 중 오류가 발생했습니다.' });
    }
  }
);

// Public: 산골이야기 글 생성
router.post(
  '/posts',
  body('title').isString().trim().isLength({ min: 1, max: 255 }),
  body('content').isString().trim().isLength({ min: 1 }),
  body('authorName').isString().trim().isLength({ min: 1, max: 100 }),
  body('isSecret').optional().isBoolean(),
  body('postPassword').optional().isString().isLength({ min: 4, max: 100 }),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const { title, content, authorName, isSecret = false, postPassword } = req.body as {
      title: string;
      content: string;
      authorName: string;
      isSecret?: boolean;
      postPassword?: string;
    };

    try {
      if (isSecret && !postPassword) {
        res.status(400).json({ error: '비밀글 작성 시 비밀번호를 입력해 주세요.' });
        return;
      }
      const postPasswordHash = isSecret && postPassword ? await bcrypt.hash(postPassword, 10) : null;

      const { rows } = await pool.query<CommunityPostRow>(
        `INSERT INTO community_posts (title, content, author_name, is_secret, post_password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, content, author_name, views, is_secret, post_password_hash, created_at, updated_at`,
        [title, content, authorName, isSecret, postPasswordHash]
      );

      const createdPost = rows[0];
      res.status(201).json({
        message: '게시글이 등록되었습니다.',
        post: {
          id: createdPost.id,
          title: createdPost.title,
          content: createdPost.content,
          author_name: createdPost.author_name,
          views: createdPost.views,
          is_secret: createdPost.is_secret,
          created_at: createdPost.created_at,
          updated_at: createdPost.updated_at,
        },
      });
    } catch (error) {
      console.error('Create community post error:', error);
      res.status(500).json({ error: '게시글 등록 중 오류가 발생했습니다.' });
    }
  }
);

// Public: 산골이야기 댓글 생성
router.post(
  '/posts/:id/comments',
  param('id').isInt({ min: 1 }),
  body('authorName').isString().trim().isLength({ min: 1, max: 100 }),
  body('content').isString().trim().isLength({ min: 1 }),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const postId = Number(req.params.id);
    const { authorName, content } = req.body as { authorName: string; content: string };

    try {
      const { rows: postExistsRows } = await pool.query<{ id: number; is_secret: boolean }>(
        'SELECT id, is_secret FROM community_posts WHERE id = $1 AND is_active = TRUE',
        [postId]
      );

      if (postExistsRows.length === 0) {
        res.status(404).json({ error: '댓글을 등록할 게시글이 없습니다.' });
        return;
      }

      const isAdmin = isAdminRequest(req);
      if (postExistsRows[0].is_secret && !isAdmin) {
        res.status(403).json({ error: '비밀글에는 관리자만 댓글을 작성할 수 있습니다.' });
        return;
      }

      const { rows } = await pool.query<CommunityCommentRow>(
        `INSERT INTO community_comments (post_id, author_name, content)
         VALUES ($1, $2, $3)
         RETURNING id, post_id, author_name, content, created_at`,
        [postId, authorName, content]
      );

      res.status(201).json({ message: '댓글이 등록되었습니다.', comment: rows[0] });
    } catch (error) {
      console.error('Create community comment error:', error);
      res.status(500).json({ error: '댓글 등록 중 오류가 발생했습니다.' });
    }
  }
);

// Public: 비밀글 수정 (작성 시 입력한 비밀번호 검증)
router.patch(
  '/posts/:id',
  param('id').isInt({ min: 1 }),
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('content').optional().isString().trim().isLength({ min: 1 }),
  body('postPassword').isString().isLength({ min: 4, max: 100 }),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const postId = Number(req.params.id);
    const { title, content, postPassword } = req.body as {
      title?: string;
      content?: string;
      postPassword: string;
    };

    if (!title && !content) {
      res.status(400).json({ error: '수정할 제목 또는 내용을 입력해 주세요.' });
      return;
    }

    try {
      const { rows: postRows } = await pool.query<CommunityPostRow>(
        `SELECT id, title, content, author_name, views, is_secret, post_password_hash, created_at, updated_at
         FROM community_posts
         WHERE id = $1 AND is_active = TRUE`,
        [postId]
      );

      if (postRows.length === 0) {
        res.status(404).json({ error: '수정할 게시글을 찾을 수 없습니다.' });
        return;
      }

      const target = postRows[0];
      if (!target.is_secret) {
        res.status(400).json({ error: '비밀번호 수정은 비밀글에서만 가능합니다.' });
        return;
      }
      if (!target.post_password_hash) {
        res.status(403).json({ error: '비밀글 비밀번호 정보가 없습니다.' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(postPassword, target.post_password_hash);
      if (!isPasswordValid) {
        res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' });
        return;
      }

      const { rows } = await pool.query<CommunityPostRow>(
        `UPDATE community_posts
         SET
           title = COALESCE($1, title),
           content = COALESCE($2, content),
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, title, content, author_name, views, is_secret, post_password_hash, created_at, updated_at`,
        [title ?? null, content ?? null, postId]
      );

      const updated = rows[0];
      res.json({
        message: '게시글이 수정되었습니다.',
        post: {
          id: updated.id,
          title: updated.title,
          content: updated.content,
          author_name: updated.author_name,
          views: updated.views,
          is_secret: updated.is_secret,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
        },
      });
    } catch (error) {
      console.error('Update community secret post error:', error);
      res.status(500).json({ error: '비밀글 수정 중 오류가 발생했습니다.' });
    }
  }
);

// Public: 작은 음악회 목록
router.get('/concert-videos', async (_req: Request, res: Response) => {
  await ensureCommunityTablesReady();
  try {
    const { rows } = await pool.query<CommunityConcertVideoRow>(
      `SELECT id, title, youtube_url, description, hashtags, source_url, is_active, sort_order, created_at, updated_at
       FROM community_concert_videos
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get community concert videos error:', error);
    res.status(500).json({ error: '작은 음악회 목록 조회 중 오류가 발생했습니다.' });
  }
});

// Admin: 작은 음악회 목록
router.get('/admin/concert-videos', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  await ensureCommunityTablesReady();
  try {
    const { rows } = await pool.query<CommunityConcertVideoRow>(
      `SELECT id, title, youtube_url, description, hashtags, source_url, is_active, sort_order, created_at, updated_at
       FROM community_concert_videos
       ORDER BY sort_order ASC, created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get admin concert videos error:', error);
    res.status(500).json({ error: '작은 음악회 관리 목록 조회 중 오류가 발생했습니다.' });
  }
});

// Admin: 작은 음악회 등록
router.post(
  '/admin/concert-videos',
  authenticateToken,
  requireAdmin,
  body('title').isString().trim().isLength({ min: 1, max: 255 }),
  body('youtubeUrl').isString().trim().isLength({ min: 1 }),
  body('description').optional({ nullable: true }).isString(),
  body('hashtags').optional({ nullable: true }).isString(),
  body('sourceUrl').optional({ nullable: true }).isString(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const { title, youtubeUrl, description = null, hashtags = null, sourceUrl = null, sortOrder = 0, isActive = true } = req.body as {
      title: string;
      youtubeUrl: string;
      description?: string | null;
      hashtags?: string | null;
      sourceUrl?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    };

    try {
      const { rows } = await pool.query<CommunityConcertVideoRow>(
        `INSERT INTO community_concert_videos
         (title, youtube_url, description, hashtags, source_url, sort_order, is_active, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, title, youtube_url, description, hashtags, source_url, is_active, sort_order, created_at, updated_at`,
        [title, youtubeUrl, description, hashtags, sourceUrl, sortOrder, isActive, req.user?.id ?? null]
      );

      res.status(201).json({ message: '작은 음악회 영상이 등록되었습니다.', video: rows[0] });
    } catch (error) {
      console.error('Create concert video error:', error);
      res.status(500).json({ error: '작은 음악회 영상 등록 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 작은 음악회 수정
router.patch(
  '/admin/concert-videos/:id',
  authenticateToken,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('youtubeUrl').optional().isString().trim().isLength({ min: 1 }),
  body('description').optional({ nullable: true }).isString(),
  body('hashtags').optional({ nullable: true }).isString(),
  body('sourceUrl').optional({ nullable: true }).isString(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const videoId = Number(req.params.id);
    const { title, youtubeUrl, description, hashtags, sourceUrl, sortOrder, isActive } = req.body as {
      title?: string;
      youtubeUrl?: string;
      description?: string | null;
      hashtags?: string | null;
      sourceUrl?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    };

    try {
      const { rows } = await pool.query<CommunityConcertVideoRow>(
        `UPDATE community_concert_videos
         SET
           title = COALESCE($1, title),
           youtube_url = COALESCE($2, youtube_url),
           description = COALESCE($3, description),
           hashtags = COALESCE($4, hashtags),
           source_url = COALESCE($5, source_url),
           sort_order = COALESCE($6, sort_order),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
         WHERE id = $8
         RETURNING id, title, youtube_url, description, hashtags, source_url, is_active, sort_order, created_at, updated_at`,
        [title ?? null, youtubeUrl ?? null, description ?? null, hashtags ?? null, sourceUrl ?? null, sortOrder ?? null, isActive ?? null, videoId]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: '수정할 영상을 찾을 수 없습니다.' });
        return;
      }

      res.json({ message: '영상 정보가 수정되었습니다.', video: rows[0] });
    } catch (error) {
      console.error('Update concert video error:', error);
      res.status(500).json({ error: '작은 음악회 영상 수정 중 오류가 발생했습니다.' });
    }
  }
);

// Admin: 작은 음악회 삭제
router.delete(
  '/admin/concert-videos/:id',
  authenticateToken,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  async (req: Request, res: Response) => {
    await ensureCommunityTablesReady();
    if (!validate(req, res)) return;

    const videoId = Number(req.params.id);
    try {
      const result = await pool.query('DELETE FROM community_concert_videos WHERE id = $1', [videoId]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: '삭제할 영상을 찾을 수 없습니다.' });
        return;
      }
      res.json({ message: '영상이 삭제되었습니다.' });
    } catch (error) {
      console.error('Delete concert video error:', error);
      res.status(500).json({ error: '작은 음악회 영상 삭제 중 오류가 발생했습니다.' });
    }
  }
);

export default router;

