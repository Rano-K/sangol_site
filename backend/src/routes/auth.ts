import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { env } from '../config/env';
import {
  createRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokensForUser,
  rotateRefreshToken,
  type RefreshTokenUser,
} from '../services/refreshTokens';

const router = express.Router();

const signAccessToken = (user: {
  id: number;
  email: string;
  role: string;
  franchise_id?: number | null;
  franchise_key?: string | null;
}): string =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      franchiseId: user.franchise_id ?? null,
      franchiseKey: user.franchise_key ?? null,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] }
  );

const mapAuthUser = (user: {
  id: number;
  email: string;
  name: string;
  role: string;
  franchise_id?: number | null;
  franchise_key?: string | null;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  franchiseId: user.franchise_id ?? null,
  franchiseKey: user.franchise_key ?? null,
});

const mapRefreshUser = (user: RefreshTokenUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  franchiseId: user.franchise_id,
  franchiseKey: user.franchise_key,
});

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

      await revokeRefreshTokensForUser(Number(user.id));
      const token = signAccessToken(user);
      const refreshToken = await createRefreshToken(Number(user.id));

      res.json({
        token,
        refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshIdleExpiresIn: env.JWT_REFRESH_IDLE_EXPIRES_IN,
        user: mapAuthUser(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
  }
);

router.post(
  '/refresh',
  body('refreshToken').isString().trim().notEmpty().withMessage('refreshToken이 필요합니다.'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { refreshToken } = req.body as { refreshToken: string };
    try {
      const rotated = await rotateRefreshToken(refreshToken);
      const token = signAccessToken({
        id: rotated.user.id,
        email: rotated.user.email,
        role: rotated.user.role,
        franchise_id: rotated.user.franchise_id,
        franchise_key: rotated.user.franchise_key,
      });

      res.json({
        token,
        refreshToken: rotated.refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshIdleExpiresIn: env.JWT_REFRESH_IDLE_EXPIRES_IN,
        user: mapRefreshUser(rotated.user),
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'IDLE_TIMEOUT') {
        res.status(401).json({ error: '유휴 시간이 초과되어 다시 로그인해주세요.' });
        return;
      }
      if (code === 'INACTIVE_USER') {
        res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
        return;
      }
      if (code === 'INVALID_REFRESH_TOKEN') {
        res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
        return;
      }
      console.error('Refresh token error:', error);
      res.status(500).json({ error: '세션 갱신 중 오류가 발생했습니다.' });
    }
  }
);

router.post(
  '/logout',
  body('refreshToken').optional({ nullable: true }).isString().trim(),
  async (req: Request, res: Response) => {
    const refreshToken = String(req.body?.refreshToken ?? '').trim();
    try {
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      res.json({ message: '로그아웃되었습니다.' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: '로그아웃 처리 중 오류가 발생했습니다.' });
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
