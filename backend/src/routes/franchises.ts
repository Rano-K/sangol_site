import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

export const ensureLocationFranchiseTableReady = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_franchises (
      id BIGSERIAL PRIMARY KEY,
      store_type VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      store_phone VARCHAR(30),
      owner_name VARCHAR(100),
      owner_phone VARCHAR(30),
      address TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('ALTER TABLE location_franchises ADD COLUMN IF NOT EXISTS franchise_key VARCHAR(32);');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_location_franchises_franchise_key ON location_franchises (franchise_key);');
  await pool.query(`
    UPDATE location_franchises
    SET franchise_key = CONCAT('FRA-', LPAD(id::text, 6, '0'))
    WHERE franchise_key IS NULL OR BTRIM(franchise_key) = '';
  `);
};

// 오시는 길 > 가맹점 현황 (public)
router.get('/location', async (_req: Request, res: Response) => {
  try {
    await ensureLocationFranchiseTableReady();
    const { rows } = await pool.query(
      `SELECT id, franchise_key, store_type, name, store_phone, owner_name, owner_phone, address, display_order, is_active, created_at, updated_at
       FROM location_franchises
       WHERE is_active = TRUE
       ORDER BY display_order ASC, id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get location franchises error:', error);
    res.status(500).json({ error: '가맹점 현황을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 가맹점 정보 조회
router.get('/me',
  authenticateToken,
  async (req: Request, res: Response) => {
    const franchiseId = req.user?.franchiseId;

    try {
      const { rows } = await pool.query(
        'SELECT * FROM franchises WHERE id = $1',
        [franchiseId]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: '가맹점 정보를 찾을 수 없습니다.' });
        return;
      }

      res.json(rows[0]);
    } catch (error) {
      console.error('Get franchise error:', error);
      res.status(500).json({ error: '가맹점 정보를 불러오는 중 오류가 발생했습니다.' });
    }
  }
);

export default router;
