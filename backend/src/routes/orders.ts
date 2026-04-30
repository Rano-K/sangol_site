import express, { Request, Response } from 'express';
import pool from '../config/database';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireFranchise } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { env } from '../config/env';

const router = express.Router();

const ensureOrderColumnsReady = async (): Promise<void> => {
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(30);');
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120);');
};

const optionalAuthenticateToken = (req: Request, res: Response, next: () => void): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
      return;
    }
    req.user = user as Request['user'];
    next();
  });
};

// 주문 생성
router.post('/',
  optionalAuthenticateToken,
  body('items').isArray().notEmpty(),
  body('items.*.productId').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1 }),
  body('deliveryAddress').optional({ nullable: true }).isString(),
  body('deliveryPhone').optional({ nullable: true }).isString(),
  body('recipientName').optional({ nullable: true }).isString(),
  body('deliveryRequest').optional({ nullable: true }).isString(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { items, deliveryAddress, deliveryPhone, recipientName, deliveryRequest } = req.body;
    const hasFranchiseUser = Boolean(req.user?.franchiseId && (req.user.role === 'franchise' || req.user.role === 'admin'));
    const franchiseId = hasFranchiseUser ? req.user?.franchiseId : null;
    const orderChannel = hasFranchiseUser ? 'b2b' : 'b2c';
    const placedByUserId = req.user?.id ?? null;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await ensureOrderColumnsReady();

      let resolvedDeliveryAddress: string | null = deliveryAddress ?? null;
      let resolvedDeliveryPhone: string | null = deliveryPhone ?? null;
      let resolvedRecipientName: string | null = recipientName ?? null;

      if (orderChannel === 'b2b' && franchiseId) {
        const franchiseResult = await client.query<{ name: string; phone: string | null; address: string | null }>(
          `SELECT name, phone, address
           FROM franchises
           WHERE id = $1`,
          [franchiseId]
        );
        if (franchiseResult.rows.length === 0) {
          throw new Error('가맹점 정보를 찾을 수 없습니다.');
        }
        const franchise = franchiseResult.rows[0];
        resolvedDeliveryAddress = resolvedDeliveryAddress || franchise.address || null;
        resolvedDeliveryPhone = resolvedDeliveryPhone || franchise.phone || null;
        resolvedRecipientName = resolvedRecipientName || franchise.name || null;
      }

      if (orderChannel === 'b2b') {
        if (!resolvedDeliveryAddress || !String(resolvedDeliveryAddress).trim()) {
          throw new Error('배송지는 필수입니다. 가맹점 기본 배송지를 확인해 주세요.');
        }
        if (!resolvedDeliveryPhone || !String(resolvedDeliveryPhone).trim()) {
          throw new Error('연락처는 필수입니다. 가맹점 기본 연락처를 확인해 주세요.');
        }
      }

      // 주문 생성
      const orderResult = await client.query<{ id: number }>(
        `INSERT INTO orders (
           order_channel, franchise_id, placed_by_user_id,
           delivery_address, delivery_phone, recipient_name, delivery_request,
           status, total_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0)
         RETURNING id`,
        [
          orderChannel,
          franchiseId,
          placedByUserId,
          resolvedDeliveryAddress,
          resolvedDeliveryPhone,
          resolvedRecipientName,
          deliveryRequest ?? null,
        ]
      );

      const orderId = orderResult.rows[0].id;
      let totalAmount = 0;

      // 주문 항목 추가
      for (const item of items) {
        const productRows = await client.query<{ price: string; stock_status: string }>(
          'SELECT price, stock_status FROM products WHERE id = $1 AND is_active = TRUE',
          [item.productId]
        );

        if (productRows.rows.length === 0) {
          throw new Error('주문 가능한 상품을 찾을 수 없습니다.');
        }

        if (productRows.rows[0].stock_status === 'out_of_stock') {
          throw new Error('품절 상품은 주문할 수 없습니다.');
        }

        const price = Number(productRows.rows[0].price);
        const itemTotal = price * item.quantity;
        totalAmount += itemTotal;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.productId, item.quantity, price, itemTotal]
        );
      }

      // 총액 업데이트
      await client.query(
        'UPDATE orders SET total_amount = $1 WHERE id = $2',
        [totalAmount, orderId]
      );

      await client.query(
        `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by_user_id, note)
         VALUES ($1, NULL, 'pending', $2, $3)`,
        [orderId, placedByUserId, orderChannel === 'b2c' ? '프론트 주문 생성' : '가맹점 주문 생성']
      );

      await client.query('COMMIT');

      res.status(201).json({
        orderId,
        message: '주문이 성공적으로 생성되었습니다.',
        totalAmount,
        orderChannel,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create order error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.' });
    } finally {
      client.release();
    }
  }
);

// 가맹점 주문 내역 조회
router.get('/franchise',
  authenticateToken,
  requireFranchise,
  async (req: Request, res: Response) => {
    const franchiseId = req.user?.franchiseId;

    try {
      await ensureOrderColumnsReady();
      const { rows } = await pool.query(
        `SELECT o.*,
         (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
             'id', oi.id,
             'productName', p.name,
             'quantity', oi.quantity,
             'unitPrice', oi.unit_price,
             'totalPrice', oi.total_price
           )), '[]'::json)
          FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = o.id) as items
         FROM orders o
         WHERE o.franchise_id = $1
         ORDER BY o.created_at DESC`,
        [franchiseId]
      );

      res.json(rows);
    } catch (error) {
      console.error('Get franchise orders error:', error);
      res.status(500).json({ error: '주문 내역을 불러오는 중 오류가 발생했습니다.' });
    }
  }
);

// 가맹점 주문 기본 정보 조회 (연락처/배송지)
router.get('/franchise/defaults', authenticateToken, requireFranchise, async (req: Request, res: Response) => {
  const franchiseId = req.user?.franchiseId;
  try {
    const { rows } = await pool.query<{
      id: number;
      franchise_key: string | null;
      name: string;
      phone: string | null;
      address: string | null;
    }>(
      `SELECT id, franchise_key, name, phone, address
       FROM franchises
       WHERE id = $1`,
      [franchiseId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: '가맹점 정보를 찾을 수 없습니다.' });
      return;
    }
    const row = rows[0];
    res.json({
      franchiseId: row.id,
      franchiseKey: row.franchise_key,
      recipientName: row.name || '',
      deliveryPhone: row.phone || '',
      deliveryAddress: row.address || '',
    });
  } catch (error) {
    console.error('Get franchise defaults error:', error);
    res.status(500).json({ error: '가맹점 기본 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 가맹점 주문 단건 수정 (pending 상태만)
router.patch(
  '/franchise/:orderId',
  authenticateToken,
  requireFranchise,
  body('items').optional().isArray().notEmpty(),
  body('items.*.productId').optional().isInt({ min: 1 }),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('deliveryAddress').optional({ nullable: true }).isString(),
  body('deliveryPhone').optional({ nullable: true }).isString(),
  body('recipientName').optional({ nullable: true }).isString(),
  body('deliveryRequest').optional({ nullable: true }).isString(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const franchiseId = req.user?.franchiseId;
    const orderId = Number(req.params.orderId);
    const { items, deliveryAddress, deliveryPhone, recipientName, deliveryRequest } = req.body as {
      items?: Array<{ productId: number; quantity: number }>;
      deliveryAddress?: string | null;
      deliveryPhone?: string | null;
      recipientName?: string | null;
      deliveryRequest?: string | null;
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureOrderColumnsReady();

      const existingOrder = await client.query<{ id: number; status: string }>(
        `SELECT id, status
         FROM orders
         WHERE id = $1 AND franchise_id = $2`,
        [orderId, franchiseId]
      );
      if (existingOrder.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: '수정할 주문을 찾을 수 없습니다.' });
        return;
      }
      if (existingOrder.rows[0].status !== 'pending') {
        await client.query('ROLLBACK');
        res.status(409).json({ error: '대기(pending) 상태의 주문만 수정할 수 있습니다.' });
        return;
      }

      let computedTotal = Number(
        (
          await client.query<{ total: string }>(
            `SELECT COALESCE(SUM(total_price), 0)::text AS total
             FROM order_items
             WHERE order_id = $1`,
            [orderId]
          )
        ).rows[0].total
      );

      if (Array.isArray(items)) {
        if (items.length === 0) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: '주문 항목은 최소 1개 이상이어야 합니다.' });
          return;
        }

        await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);

        let nextTotal = 0;
        for (const item of items) {
          const productRows = await client.query<{ price: string; stock_status: string }>(
            'SELECT price, stock_status FROM products WHERE id = $1 AND is_active = TRUE',
            [item.productId]
          );
          if (productRows.rows.length === 0) throw new Error('주문 가능한 상품을 찾을 수 없습니다.');
          if (productRows.rows[0].stock_status === 'out_of_stock') throw new Error('품절 상품은 주문할 수 없습니다.');

          const unitPrice = Number(productRows.rows[0].price);
          const itemTotal = unitPrice * item.quantity;
          nextTotal += itemTotal;

          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, item.productId, item.quantity, unitPrice, itemTotal]
          );
        }
        computedTotal = nextTotal;
      }

      await client.query(
        `UPDATE orders
         SET delivery_address = COALESCE($1, delivery_address),
             delivery_phone = COALESCE($2, delivery_phone),
             recipient_name = COALESCE($3, recipient_name),
             delivery_request = COALESCE($4, delivery_request),
             total_amount = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          deliveryAddress ?? null,
          deliveryPhone ?? null,
          recipientName ?? null,
          deliveryRequest ?? null,
          computedTotal,
          orderId,
        ]
      );

      await client.query(
        `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by_user_id, note)
         VALUES ($1, 'pending', 'pending', $2, '가맹점 주문 수정')`,
        [orderId, req.user?.id ?? null]
      );

      await client.query('COMMIT');
      res.json({ message: '주문이 수정되었습니다.', orderId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update franchise order error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '주문 수정 중 오류가 발생했습니다.' });
    } finally {
      client.release();
    }
  }
);

// 가맹점 주문 삭제 (pending 상태만)
router.delete('/franchise/:orderId', authenticateToken, requireFranchise, async (req: Request, res: Response) => {
  const franchiseId = req.user?.franchiseId;
  const orderId = Number(req.params.orderId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingOrder = await client.query<{ id: number; status: string }>(
      `SELECT id, status
       FROM orders
       WHERE id = $1 AND franchise_id = $2`,
      [orderId, franchiseId]
    );
    if (existingOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: '삭제할 주문을 찾을 수 없습니다.' });
      return;
    }
    if (existingOrder.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(409).json({ error: '대기(pending) 상태의 주문만 삭제할 수 있습니다.' });
      return;
    }

    await client.query('DELETE FROM order_status_logs WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM orders WHERE id = $1', [orderId]);

    await client.query('COMMIT');
    res.json({ message: '주문이 삭제되었습니다.', orderId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete franchise order error:', error);
    res.status(500).json({ error: '주문 삭제 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

export default router;
