import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

const ensureNoticeColumnsReady = async (): Promise<void> => {
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;');
};

// 공지사항 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureNoticeColumnsReady();
    const { rows } = await pool.query(
      `SELECT id, title, content, author, views, is_active, is_important, created_at, updated_at
       FROM notices
       WHERE is_active = TRUE
       ORDER BY is_important DESC, created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: '공지사항을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 공지사항 상세 조회
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await ensureNoticeColumnsReady();
    const { rows } = await pool.query(
      'SELECT id, title, content, author, views, is_active, is_important, created_at, updated_at FROM notices WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      return;
    }

    // 조회수 증가
    await pool.query(
      'UPDATE notices SET views = views + 1 WHERE id = $1',
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ error: '공지사항을 불러오는 중 오류가 발생했습니다.' });
  }
});

export default router;
