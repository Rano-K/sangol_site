import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  FileText,
  MessageSquare,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type AdminTab = 'overview' | 'orders' | 'franchises' | 'inquiries' | 'notices' | 'faq' | 'products' | 'content' | 'concert';

type DashboardStats = {
  ordersToday: number;
  ordersTotal: number;
  revenueTotal: number;
  revenueToday: number;
  ordersPending: number;
  franchisesActive: number;
  franchisesTotal: number;
  inquiriesPending: number;
  productsActive: number;
  productsTotal: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  noticesActive: number;
  importantNotices: number;
  recentOrders: Array<{ id: number; total_amount: string; status: string; created_at: string; franchise_name: string }>;
  lowStockProductList: Array<{ id: number; product_code: string; name: string; stock_quantity: number; stock_status: string }>;
  recentInquiries: Array<{ id: number; name: string; subject: string; status: string; created_at: string }>;
};

interface OverviewProps {
  token: string;
  onNavigate: (tab: AdminTab) => void;
}

const initialStats: DashboardStats = {
  ordersToday: 0,
  ordersTotal: 0,
  revenueTotal: 0,
  revenueToday: 0,
  ordersPending: 0,
  franchisesActive: 0,
  franchisesTotal: 0,
  inquiriesPending: 0,
  productsActive: 0,
  productsTotal: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  noticesActive: 0,
  importantNotices: 0,
  recentOrders: [],
  lowStockProductList: [],
  recentInquiries: [],
};

export function Overview({ token, onNavigate }: OverviewProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/admin/dashboard/stats`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || '대시보드 통계 조회 실패');
        setStats({ ...initialStats, ...data });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : '대시보드 통계 조회 중 오류');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadStats();
    return () => controller.abort();
  }, [apiBaseUrl, token]);

  const krw = (value: number) => `${value.toLocaleString('ko-KR')}원`;
  const count = (value: number, suffix = '건') => `${value.toLocaleString('ko-KR')}${suffix}`;

  const statCards = [
    {
      title: '오늘 주문',
      value: count(stats.ordersToday),
      helper: `오늘 매출 ${krw(stats.revenueToday)}`,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      tab: 'orders' as AdminTab,
    },
    {
      title: '주문 대기',
      value: count(stats.ordersPending),
      helper: '처리가 필요한 B2B 발주',
      icon: AlertTriangle,
      color: 'bg-amber-500',
      tab: 'orders' as AdminTab,
    },
    {
      title: '총 매출',
      value: krw(stats.revenueTotal),
      helper: `누적 주문 ${count(stats.ordersTotal)}`,
      icon: TrendingUp,
      color: 'bg-green-600',
      tab: 'orders' as AdminTab,
    },
    {
      title: '가맹점',
      value: count(stats.franchisesActive, '개'),
      helper: `전체 ${count(stats.franchisesTotal, '개')}`,
      icon: Store,
      color: 'bg-purple-500',
      tab: 'franchises' as AdminTab,
    },
    {
      title: '상품',
      value: count(stats.productsActive, '개'),
      helper: `전체 등록 ${count(stats.productsTotal, '개')}`,
      icon: Package,
      color: 'bg-emerald-600',
      tab: 'products' as AdminTab,
    },
    {
      title: '재고 주의',
      value: count(stats.lowStockProducts, '개'),
      helper: `품절 ${count(stats.outOfStockProducts, '개')}`,
      icon: AlertTriangle,
      color: 'bg-red-500',
      tab: 'products' as AdminTab,
    },
    {
      title: '미처리 문의',
      value: count(stats.inquiriesPending),
      helper: '답변 대기 고객 문의',
      icon: MessageSquare,
      color: 'bg-orange-500',
      tab: 'inquiries' as AdminTab,
    },
    {
      title: '공지사항',
      value: count(stats.noticesActive, '개'),
      helper: `중요 공지 ${count(stats.importantNotices, '개')}`,
      icon: Bell,
      color: 'bg-slate-600',
      tab: 'notices' as AdminTab,
    },
  ];

  const statusLabel = (status: string) => {
    if (status === 'pending') return '대기';
    if (status === 'processing') return '처리중';
    if (status === 'shipped') return '배송중';
    if (status === 'delivered') return '완료';
    if (status === 'cancelled') return '취소';
    return status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-sm text-gray-500 mt-1">주문, 상품, 가맹점, 고객 대응 현황을 한눈에 확인합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
        >
          상품 관리 바로가기
        </button>
      </div>

      {loading ? <div className="text-sm text-gray-500">대시보드 데이터를 불러오는 중...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              type="button"
              key={stat.title}
              onClick={() => onNavigate(stat.tab)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className="text-xs font-medium text-gray-400">클릭하여 이동</span>
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-2">{stat.helper}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">최근 주문</h3>
            <button type="button" onClick={() => onNavigate('orders')} className="text-sm text-green-700 font-medium">
              전체보기
            </button>
          </div>
          <div className="space-y-3">
            {stats.recentOrders.length === 0 ? (
              <div className="text-sm text-gray-500 py-6">최근 주문이 없습니다.</div>
            ) : (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">주문 #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.franchise_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{krw(Number(order.total_amount || 0))}</p>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {statusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">재고 주의 상품</h3>
            <button type="button" onClick={() => onNavigate('products')} className="text-sm text-green-700 font-medium">
              상품관리
            </button>
          </div>
          <div className="space-y-3">
            {stats.lowStockProductList.length === 0 ? (
              <div className="text-sm text-gray-500 py-6">재고 주의 상품이 없습니다.</div>
            ) : (
              stats.lowStockProductList.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.product_code}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">재고 {product.stock_quantity}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">최근 문의</h3>
            <button type="button" onClick={() => onNavigate('inquiries')} className="text-sm text-green-700 font-medium">
              문의관리
            </button>
          </div>
          <div className="space-y-3">
            {stats.recentInquiries.length === 0 ? (
              <div className="text-sm text-gray-500 py-6">최근 문의가 없습니다.</div>
            ) : (
              stats.recentInquiries.map((inquiry) => (
                <div key={inquiry.id} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate">{inquiry.subject}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {inquiry.status === 'pending' ? '대기' : '답변완료'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{inquiry.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#F7F8F4] rounded-xl border border-[#DDE7D4] p-6">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-green-700 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900 mb-1">운영 체크 포인트</h3>
            <p className="text-sm text-gray-600">
              주문 대기, 재고 10개 이하, 미처리 문의는 매일 우선 확인해야 하는 쇼핑몰 운영 지표입니다.
              각 카드와 요약 영역을 클릭하면 해당 관리 화면으로 바로 이동합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
