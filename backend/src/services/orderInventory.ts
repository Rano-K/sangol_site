import type { PoolClient } from 'pg';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const COMMITTED_STATUSES = new Set<OrderStatus>(['processing', 'shipped', 'delivered']);

export const isInventoryCommittedStatus = (status: string): status is OrderStatus =>
  COMMITTED_STATUSES.has(status as OrderStatus);

const resolveStockStatus = (quantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 10) return 'low_stock';
  return 'in_stock';
};

type OrderItemRow = {
  product_id: number;
  quantity: number;
  product_name: string;
};

const loadOrderItemsForUpdate = async (client: PoolClient, orderId: number): Promise<OrderItemRow[]> => {
  const { rows } = await client.query<OrderItemRow>(
    `SELECT oi.product_id, oi.quantity, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return rows;
};

const applyQuantityDelta = async (
  client: PoolClient,
  productId: number,
  productName: string,
  delta: number
): Promise<void> => {
  const { rows } = await client.query<{ stock_quantity: number }>(
    `SELECT stock_quantity
     FROM products
     WHERE id = $1
     FOR UPDATE`,
    [productId]
  );

  if (rows.length === 0) {
    throw new Error(`주문 품목 상품을 찾을 수 없습니다. (product_id=${productId})`);
  }

  const currentQty = Number(rows[0].stock_quantity ?? 0);
  const nextQty = currentQty + delta;

  if (delta < 0 && nextQty < 0) {
    throw new Error(
      `${productName} 재고가 부족합니다. (필요: ${Math.abs(delta)}개, 현재 재고: ${currentQty}개)`
    );
  }

  const normalizedQty = Math.max(0, nextQty);

  await client.query(
    `UPDATE products
     SET stock_quantity = $1,
         stock_status = $2::stock_status,
         updated_at = NOW()
     WHERE id = $3`,
    [normalizedQty, resolveStockStatus(normalizedQty), productId]
  );
};

export const deductOrderItemsStock = async (client: PoolClient, orderId: number): Promise<void> => {
  const items = await loadOrderItemsForUpdate(client, orderId);
  if (items.length === 0) {
    throw new Error('주문 품목이 없어 재고를 반영할 수 없습니다.');
  }

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    await applyQuantityDelta(client, item.product_id, item.product_name, -quantity);
  }
};

export const restoreOrderItemsStock = async (client: PoolClient, orderId: number): Promise<void> => {
  const items = await loadOrderItemsForUpdate(client, orderId);
  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    await applyQuantityDelta(client, item.product_id, item.product_name, quantity);
  }
};

export const syncOrderInventoryOnStatusChange = async (
  client: PoolClient,
  orderId: number,
  fromStatus: string,
  toStatus: string
): Promise<'deduct' | 'restore' | 'none'> => {
  const from = fromStatus as OrderStatus;
  const to = toStatus as OrderStatus;
  const wasCommitted = isInventoryCommittedStatus(from);
  const willBeCommitted = isInventoryCommittedStatus(to);

  if (!wasCommitted && willBeCommitted) {
    await deductOrderItemsStock(client, orderId);
    return 'deduct';
  }

  if (wasCommitted && !willBeCommitted) {
    await restoreOrderItemsStock(client, orderId);
    return 'restore';
  }

  return 'none';
};

export const inventoryNoteSuffix = (action: 'deduct' | 'restore' | 'none'): string => {
  if (action === 'deduct') return ' · 재고 차감';
  if (action === 'restore') return ' · 재고 복원';
  return '';
};
