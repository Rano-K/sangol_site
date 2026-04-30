import express, { Request, Response } from 'express';
import pool from '../config/database';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// 문의 생성
router.post('/',
  body('name').notEmpty().withMessage('이름을 입력하세요'),
  body('email').isEmail().withMessage('유효한 이메일을 입력하세요'),
  body('phone')
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage('연락처 형식이 올바르지 않습니다.'),
  body('subject').notEmpty().withMessage('제목을 입력하세요'),
  body('message').notEmpty().withMessage('문의 내용을 입력하세요'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, phone, subject, message } = req.body;

    try {
      const { rows } = await pool.query<{ id: number }>(
        `INSERT INTO inquiries (name, email, phone, subject, message, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id`,
        [name, email, phone, subject, message]
      );

      res.status(201).json({
        id: rows[0].id,
        message: '문의가 성공적으로 접수되었습니다.'
      });
    } catch (error) {
      console.error('Create inquiry error:', error);
      res.status(500).json({ error: '문의 접수 중 오류가 발생했습니다.' });
    }
  }
);

export default router;
