import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { env } from '../config/env';

interface UserPayload {
  id: number;
  email: string;
  role: 'admin' | 'franchise';
  franchiseId?: number;
  franchiseKey?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    const { rows } = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM users WHERE id = $1 LIMIT 1',
      [decoded.id]
    );
    if (rows.length === 0 || !rows[0].is_active) {
      res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (_error) {
    res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    return;
  }
  next();
};

export const requireFranchise = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'franchise' && req.user?.role !== 'admin') {
    res.status(403).json({ error: '가맹점 권한이 필요합니다.' });
    return;
  }
  next();
};

/** 공개 API에서 선택적으로 사용자 컨텍스트를 붙입니다(토큰 없음/무효 시 게스트). */
export const optionalAuthenticateToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    const { rows } = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM users WHERE id = $1 LIMIT 1',
      [decoded.id]
    );
    if (rows.length > 0 && rows[0].is_active) {
      req.user = decoded;
    }
  } catch (_error) {
    // invalid token → treat as guest
  }

  next();
};

export const canViewWipProducts = (req: Request): boolean => req.user?.role === 'franchise';
