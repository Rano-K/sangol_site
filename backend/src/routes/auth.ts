import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { env } from '../config/env';

const router = express.Router();

// 로그인
router.post('/login',
  body('email').isEmail().withMessage('유효한 이메일을 입력하세요'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      const { rows } = await pool.query(
        `SELECT u.*, f.franchise_key
         FROM users u
         LEFT JOIN franchises f ON f.id = u.franchise_id
         WHERE u.email = $1`,
        [email]
      );

      if (rows.length === 0) {
        res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        return;
      }

      const user = rows[0];
      if (!user.is_active) {
        res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
        return;
      }
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          franchiseId: user.franchise_id,
          franchiseKey: user.franchise_key ?? null,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          franchiseId: user.franchise_id,
          franchiseKey: user.franchise_key ?? null,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
  }
);

// 비밀번호 변경
router.post('/change-password',
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  async (req: Request, res: Response) => {
    // TODO: Implement password change
    res.status(501).json({ error: '구현 예정' });
  }
);

router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '인증 정보가 없습니다.' });
      return;
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.franchise_id, u.is_active, f.franchise_key
       FROM users u
       LEFT JOIN franchises f ON f.id = u.franchise_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }
    const user = rows[0] as any;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      franchiseId: user.franchise_id,
      franchiseKey: user.franchise_key ?? null,
      isActive: Boolean(user.is_active),
    });
  } catch (error) {
    console.error('Get auth me error:', error);
    res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
