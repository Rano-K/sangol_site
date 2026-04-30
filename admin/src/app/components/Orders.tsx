import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type OrderItem = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  taxType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type OrderRecord = {
  id: number;
  orderChannel: 'b2b' | 'b2c';
  franchiseKey: string | null;
  franchiseName: string;
  franchiseContactPerson: string | null;
  franchisePhone: string | null;
  franchiseAddress: string | null;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  recipientName: string | null;
  deliveryRequest: string | null;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

interface OrdersProps {
  token: string;
}

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-yellow-100 text-yellow-700' },
  processing: { label: '처리중', className: 'bg-blue-100 text-blue-700' },
  shipped: { label: '출고', className: 'bg-purple-100 text-purple-700' },
  delivered: { label: '배송완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-red-100 text-red-700' },
};

const STATUS_OPTIONS = Object.entries(STATUS_META) as Array<[OrderStatus, (typeof STATUS_META)[OrderStatus]]>;

const toNumber = (value: unknown): number => Number(value ?? 0);

const normalizeOrder = (row: any): OrderRecord => ({
  id: Number(row.id),
  orderChannel: row.order_channel || 'b2b',
  franchiseKey: row.franchise_key ?? null,
  franchiseName: row.franchise_name || '미지정 가맹점',
  franchiseContactPerson: row.franchise_contact_person ?? null,
  franchisePhone: row.franchise_phone ?? null,
  franchiseAddress: row.franchise_address ?? null,
  deliveryAddress: row.delivery_address ?? null,
  deliveryPhone: row.delivery_phone ?? null,
  recipientName: row.recipient_name ?? null,
  deliveryRequest: row.delivery_request ?? null,
  totalAmount: toNumber(row.total_amount),
  status: row.status as OrderStatus,
  createdAt: row.created_at,
  items: Array.isArray(row.items)
    ? row.items.map((item: any) => ({
        id: Number(item.id),
        productId: Number(item.productId),
        productCode: String(item.productCode || ''),
        productName: String(item.productName || ''),
        unit: String(item.unit || ''),
        taxType: String(item.taxType || ''),
        quantity: Number(item.quantity || 0),
        unitPrice: toNumber(item.unitPrice),
        totalPrice: toNumber(item.totalPrice),
      }))
    : [],
});

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export function Orders({ token }: OrdersProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'b2b' | 'b2c'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '주문 목록 조회 실패');
      setOrders((data as any[]).map(normalizeOrder));
      setCurrentPage(1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '주문 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, token]);

  const filteredOrders = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return orders.filter((order) => {
      if (channelFilter !== 'all' && order.orderChannel !== channelFilter) return false;
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(order.id).includes(q) ||
        (order.franchiseName || '').toLowerCase().includes(q) ||
        (order.franchiseKey || '').toLowerCase().includes(q) ||
        (order.deliveryPhone || '').toLowerCase().includes(q)
      );
    });
  }, [orders, searchKeyword, channelFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safeCurrentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, safeCurrentPage - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safeCurrentPage, totalPages]);

  const updateStatus = async (orderId: number, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '주문 상태 변경 실패');
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
      setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status } : prev));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '주문 상태를 변경하지 못했습니다.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const downloadCsv = () => {
    const header = ['주문번호', '주문구분', '가맹점', '주문일', '금액', '상태', '품목수'];
    const rows = orders.map((order) => [
      `#${order.id}`,
      order.orderChannel === 'b2c' ? '프론트' : '가맹점',
      order.franchiseName,
      formatDate(order.createdAt),
      String(order.totalAmount),
      STATUS_META[order.status]?.label || order.status,
      String(order.items.length),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sangol-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: OrderStatus) => {
    const meta = STATUS_META[status] || STATUS_META.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>
        {meta.label}
      </span>
    );
  };

  const firstVisible = filteredOrders.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const lastVisible = Math.min(safeCurrentPage * pageSize, filteredOrders.length);
  const b2bCount = orders.filter((o) => o.orderChannel === 'b2b').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">주문 관리</h2>
          <p className="text-sm text-gray-500 mt-1">DB 주문 내역과 가맹점 키/연락처/배송지 정보를 함께 조회합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={orders.length === 0}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            엑셀 다운로드
          </button>
        </div>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">전체 주문</p>
          <p className="text-xl font-bold text-gray-900">{orders.length}건</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">가맹점 주문(B2B)</p>
          <p className="text-xl font-bold text-[#1A4D2E]">{b2bCount}건</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="주문번호/가맹점명/키/연락처 검색"
            className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value as 'all' | 'b2b' | 'b2c');
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">전체 구분</option>
            <option value="b2b">가맹점(B2B)</option>
            <option value="b2c">프론트(B2C)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | OrderStatus);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">전체 상태</option>
            {STATUS_OPTIONS.map(([status, meta]) => (
              <option key={status} value={status}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">주문번호</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">구분</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">가맹점</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">가맹점 키</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">주문일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">품목</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">금액</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">상태</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                    주문 내역을 불러오는 중입니다.
                  </td>
                </tr>
              ) : pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                    아직 저장된 주문이 없습니다.
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={`${index % 2 === 1 ? 'bg-lime-50' : 'bg-white'} hover:bg-lime-100 transition`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {order.orderChannel === 'b2c' ? '프론트' : '가맹점'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.franchiseName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.franchiseKey || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.items.length}개</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ₩{order.totalAmount.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(event) => updateStatus(order.id, event.target.value as OrderStatus)}
                        disabled={updatingOrderId === order.id}
                        className="px-2 py-1.5 text-sm rounded-md border border-gray-300 bg-white disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map(([status, meta]) => (
                          <option key={status} value={status}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="text-sm text-green-700 hover:text-green-800 font-medium"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            총 {filteredOrders.length}개 중 {firstVisible}-{lastVisible}개 표시
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 text-sm rounded-md border border-gray-300 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}개
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  pageNum === safeCurrentPage
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">주문 상세 #{selectedOrder.id}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedOrder.franchiseName} · {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh] p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">주문 구분</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.orderChannel === 'b2c' ? '프론트' : '가맹점'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">주문 상태</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">총 금액</p>
                  <p className="font-semibold text-gray-900">₩{selectedOrder.totalAmount.toLocaleString('ko-KR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">가맹점 키</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.franchiseKey || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">가맹점 연락처</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.franchisePhone || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">가맹점 담당자</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.franchiseContactPerson || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">가맹점 기본 배송지</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.franchiseAddress || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">수령인</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.recipientName || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">주문 연락처</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.deliveryPhone || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 md:col-span-2">
                  <p className="text-gray-500">주문 배송지 / 요청사항</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.deliveryAddress || '-'}</p>
                  <p className="text-gray-600 mt-1">{selectedOrder.deliveryRequest || '-'}</p>
                </div>
              </div>

              <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-sm text-gray-700">
                  <tr>
                    <th className="px-4 py-3">품목</th>
                    <th className="px-4 py-3 text-right">단가</th>
                    <th className="px-4 py-3 text-right">수량</th>
                    <th className="px-4 py-3 text-right">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">
                          {item.productCode} · {item.unit}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">₩{item.unitPrice.toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        ₩{item.totalPrice.toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
