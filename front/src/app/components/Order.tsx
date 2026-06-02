import { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { FRANCHISE_ORDERS_HISTORY_PATH } from "./ReceiptModal";
import { ReceiptModal } from "./ReceiptModal";
import { OrderCartPreviewModal } from "./OrderCartPreviewModal";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type Item = {
  id: number;
  code: string;
  name: string;
  imageUrl?: string | null;
  unit: string;
  tax: string;
  price: number;
  category: string;
  categorySlug: 'forest' | 'agriculture' | 'manufactured' | 'wip';
  categoryLabel: '임산물' | '농산물' | '가공식품' | '재공품';
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  stockQuantity: number;
};

const CATEGORY_TABS = [
  { id: 'all', label: '전체' },
  { id: 'forest', label: '임산물' },
  { id: 'agriculture', label: '농산물' },
  { id: 'manufactured', label: '가공식품' },
  { id: 'wip', label: '재공품' },
] as const;

type SortKey = "name_asc" | "price_asc" | "stock_asc";

type PreviousOrderItem = {
  productId?: number;
  productName?: string;
  productCode?: string;
  quantity: number;
};

type PreviousOrder = {
  id: number;
  created_at: string;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  recipient_name?: string | null;
  delivery_request?: string | null;
  items: PreviousOrderItem[];
};

const getCategoryMeta = (product: any): Pick<Item, 'categorySlug' | 'categoryLabel'> => {
  const normalizedCategory = String(product.category || '').trim();
  if (normalizedCategory === '임산물') return { categorySlug: 'forest', categoryLabel: '임산물' };
  if (normalizedCategory === '농산물') return { categorySlug: 'agriculture', categoryLabel: '농산물' };
  if (normalizedCategory === '제품(가공식품)') return { categorySlug: 'manufactured', categoryLabel: '가공식품' };
  if (normalizedCategory === '재공품') return { categorySlug: 'wip', categoryLabel: '재공품' };

  const code = String(product.product_code || '').toUpperCase();
  if (/^FP_/.test(code) || code.startsWith('SG-IM-')) return { categorySlug: 'forest', categoryLabel: '임산물' };
  if (/^AG_/.test(code) || code.startsWith('SG-AG-')) return { categorySlug: 'agriculture', categoryLabel: '농산물' };
  if (/^PR_/.test(code) || code.startsWith('SG-PR-')) return { categorySlug: 'manufactured', categoryLabel: '가공식품' };
  if (/^WIP_/.test(code) || code.startsWith('SG-WIP-')) return { categorySlug: 'wip', categoryLabel: '재공품' };
  return { categorySlug: 'manufactured', categoryLabel: '가공식품' };
};

export function Order() {
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const FRANCHISE_ORDER_DRAFT_KEY = "sangol_franchise_order_draft";
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_TABS)[number]['id']>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false);
  const [cartPreviewMode, setCartPreviewMode] = useState<"preview" | "checkout">("preview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | undefined>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [deliveryRequest, setDeliveryRequest] = useState("");
  const [previousOrders, setPreviousOrders] = useState<PreviousOrder[]>([]);
  const [isLoadingPreviousOrders, setIsLoadingPreviousOrders] = useState(false);
  const shouldRedirectToLogin = !isAuthenticated || !user;
  const canUseFranchiseOrder = user?.role === "franchise" || user?.role === "admin";
  const isFranchiseUser = user?.role === "franchise";
  const visibleOrderCategoryTabs = useMemo(
    () => (isFranchiseUser ? CATEGORY_TABS : CATEGORY_TABS.filter((cat) => cat.id !== "wip")),
    [isFranchiseUser]
  );

  useEffect(() => {
    const run = async () => {
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${apiBaseUrl}/products`, { headers });
      const payload = await response.json();
      if (!response.ok) return;
      const mapped: Item[] = (payload as any[]).map((product) => {
        const categoryMeta = getCategoryMeta(product);
        // API 응답 필드명이 snake/camel 케이스로 섞일 수 있어 방어적으로 처리
        const imageCandidate = product.image_url ?? product.imageUrl ?? null;
        return {
        id: Number(product.id),
        code: String(product.product_code || `P-${product.id}`),
        name: String(product.name || ""),
        // image_url이 비어있더라도 image-file 엔드포인트가 동작하면 썸네일을 보여주기 위해 fallback을 구성
        imageUrl: imageCandidate
          ? String(imageCandidate)
          : `${apiBaseUrl}/products/${Number(product.id)}/image-file`,
        unit: String(product.unit || "EA"),
        tax:
          product.tax_type === 'tax_exempt'
            ? '비과세'
            : '과세',
        price: Number(product.price || 0),
        category: String(product.category || categoryMeta.categoryLabel),
        categorySlug: categoryMeta.categorySlug,
        categoryLabel: categoryMeta.categoryLabel,
        stockStatus: String(product.stock_status || 'in_stock') as Item['stockStatus'],
        stockQuantity: Number(product.stock_quantity || 0),
      };
      });
      setItems(mapped);
      try {
        const rawDraft = localStorage.getItem(FRANCHISE_ORDER_DRAFT_KEY);
        if (!rawDraft) return;
        const draft = JSON.parse(rawDraft) as Record<string, number>;
        const draftByCode: Record<string, number> = {};
        for (const item of mapped) {
          const draftQty = Number(draft[String(item.id)] || 0);
          if (draftQty > 0) {
            const maxQuantity = item.stockStatus === 'out_of_stock' ? 0 : Math.max(0, item.stockQuantity);
            draftByCode[item.code] = Math.min(draftQty, maxQuantity);
          }
        }
        setQuantities(draftByCode);
      } catch (_error) {
        // 초안 파싱 실패 시 무시하고 빈 상태로 시작
      }
    };
    run();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${apiBaseUrl}/orders/franchise/defaults`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) return;
        setRecipientName(String(data.recipientName || ""));
        setDeliveryPhone(String(data.deliveryPhone || ""));
        setDeliveryAddress(String(data.deliveryAddress || ""));
      } catch (_error) {
        // 기본값 조회 실패 시 수동 입력 가능하도록 무시
      }
    };
    void run();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const run = async () => {
      if (!token || !canUseFranchiseOrder) return;
      setIsLoadingPreviousOrders(true);
      try {
        const response = await fetch(`${apiBaseUrl}/orders/franchise`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) return;
        const mapped: PreviousOrder[] = Array.isArray(data)
          ? data.map((order: any) => ({
              id: Number(order.id),
              created_at: String(order.created_at || ""),
              delivery_address: order.delivery_address ?? order.deliveryAddress ?? null,
              delivery_phone: order.delivery_phone ?? order.deliveryPhone ?? null,
              recipient_name: order.recipient_name ?? order.recipientName ?? null,
              delivery_request: order.delivery_request ?? order.deliveryRequest ?? null,
              items: Array.isArray(order.items)
                ? order.items.map((item: any) => ({
                    productId:
                      item.product_id !== undefined
                        ? Number(item.product_id)
                        : item.productId !== undefined
                          ? Number(item.productId)
                          : undefined,
                    productName: item.product_name ?? item.productName ?? undefined,
                    productCode: item.product_code ?? item.productCode ?? undefined,
                    quantity: Math.max(0, Number(item.quantity || 0)),
                  }))
                : [],
            }))
          : [];
        setPreviousOrders(mapped.slice(0, 5));
      } catch (_error) {
        // 이전 주문 조회 실패 시 주문 기능은 계속 사용 가능해야 함
      } finally {
        setIsLoadingPreviousOrders(false);
      }
    };
    void run();
  }, [apiBaseUrl, canUseFranchiseOrder, token]);

  useEffect(() => {
    if (items.length === 0) return;
    const draft: Record<string, number> = {};
    for (const item of items) {
      const quantity = Number(quantities[item.code] || 0);
      if (quantity > 0) {
        draft[String(item.id)] = quantity;
      }
    }
    localStorage.setItem(FRANCHISE_ORDER_DRAFT_KEY, JSON.stringify(draft));
  }, [FRANCHISE_ORDER_DRAFT_KEY, items, quantities]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((item) => item.categorySlug === activeCategory);
  }, [activeCategory, items]);

  const setQuantityForCode = (code: string, nextQty: number) => {
    const target = items.find((item) => item.code === code);
    if (!target) return;
    const maxQuantity = target.stockStatus === "out_of_stock" ? 0 : Math.max(0, target.stockQuantity);
    const normalized = Number.isFinite(nextQty) ? Math.max(0, Math.min(nextQty, maxQuantity)) : 0;
    setQuantities((prev) => ({ ...prev, [code]: normalized }));
  };

  const displayItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = filteredItems;
    if (q) {
      list = list.filter((it) => it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q));
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "name_asc") return a.name.localeCompare(b.name, "ko-KR");
      if (sortKey === "price_asc") return a.price - b.price;
      if (sortKey === "stock_asc") return a.stockQuantity - b.stockQuantity;
      return 0;
    });
    return sorted;
  }, [filteredItems, searchQuery, sortKey]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = quantities[item.code] || 0;
      return sum + (item.price * q);
    }, 0);
  }, [quantities, items]);

  const orderedItems = useMemo(() => {
    return items.filter(item => (quantities[item.code] || 0) > 0).map(item => ({
      ...item,
      quantity: quantities[item.code]!
    }));
  }, [quantities, items]);

  const submitOrder = async () => {
    if (orderedItems.length === 0) {
      setToastMessage("주문할 수량을 입력해주세요.");
      setToastVisible(true);
      return;
    }
    if (!recipientName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()) {
      setSubmitError("수령인/연락처/배송지는 필수입니다. 가맹점 기본정보를 확인해 주세요.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: orderedItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          recipientName: recipientName.trim(),
          deliveryPhone: deliveryPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryRequest: deliveryRequest.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "주문 저장에 실패했습니다.");
      }

      setCreatedOrderId(Number(payload.orderId));
      setIsCartPreviewOpen(false);
      setIsModalOpen(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "주문 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderClick = () => {
    if (orderedItems.length === 0) {
      setToastMessage("주문할 수량을 입력해주세요.");
      setToastVisible(true);
      return;
    }
    if (!recipientName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()) {
      setSubmitError("수령인/연락처/배송지는 필수입니다. 가맹점 기본정보를 확인해 주세요.");
      return;
    }
    setSubmitError("");
    setCartPreviewMode("checkout");
    setIsCartPreviewOpen(true);
  };

  const applyPreviousOrder = (order: PreviousOrder) => {
    const hasExistingSelection = Object.values(quantities).some((q) => Number(q) > 0);
    if (hasExistingSelection) {
      const proceed = window.confirm("현재 선택한 품목이 초기화됩니다. 이전 주문 내역으로 불러오시겠습니까?");
      if (!proceed) return;
    }

    const nextQuantities: Record<string, number> = {};
    for (const previousItem of order.items) {
      const qty = Math.max(0, Number(previousItem.quantity || 0));
      if (qty <= 0) continue;

      const matchedById =
        previousItem.productId !== undefined
          ? items.find((it) => it.id === previousItem.productId)
          : undefined;
      const matchedByCode = previousItem.productCode
        ? items.find((it) => it.code === previousItem.productCode)
        : undefined;
      const matchedByName = previousItem.productName
        ? items.find((it) => it.name === previousItem.productName)
        : undefined;

      const target = matchedById ?? matchedByCode ?? matchedByName;
      if (!target) continue;

      const maxQuantity = target.stockStatus === "out_of_stock" ? 0 : Math.max(0, target.stockQuantity);
      if (maxQuantity <= 0) continue;
      nextQuantities[target.code] = Math.min(qty, maxQuantity);
    }

    setQuantities(nextQuantities);
    if (order.recipient_name) setRecipientName(String(order.recipient_name));
    if (order.delivery_phone) setDeliveryPhone(String(order.delivery_phone));
    if (order.delivery_address) setDeliveryAddress(String(order.delivery_address));
    if (order.delivery_request) setDeliveryRequest(String(order.delivery_request));

    setToastMessage("이전 주문 내역을 현재 발주서로 불러왔습니다.");
    setToastVisible(true);
  };

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => {
      setToastVisible(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toastMessage]);

  const resetOrder = () => {
    setQuantities({});
    setIsModalOpen(false);
    setCreatedOrderId(undefined);
    setSubmitError("");
    localStorage.removeItem(FRANCHISE_ORDER_DRAFT_KEY);
  };

  const goToOrderHistory = () => {
    resetOrder();
    navigate(FRANCHISE_ORDERS_HISTORY_PATH);
  };

  const clearAllSelectedItems = () => {
    if (orderedItems.length === 0) return;
    const shouldClear = window.confirm("현재 담긴 주문 항목을 모두 제거하시겠습니까?");
    if (!shouldClear) return;
    setQuantities({});
    setSubmitError("");
    setToastMessage("담긴 주문 항목을 모두 제거했습니다.");
    setToastVisible(true);
    localStorage.removeItem(FRANCHISE_ORDER_DRAFT_KEY);
  };

  if (shouldRedirectToLogin) {
    return <Navigate to="/login" state={{ from: "/order" }} replace />;
  }
  if (!canUseFranchiseOrder) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="flex-1 bg-white flex flex-col pb-24">
      <div className="bg-[#1A4D2E] text-white py-12 px-6">
        <div className="site-container">
          <h1 className="text-3xl font-bold mb-2">가맹점 발주 대시보드</h1>
          <p className="text-[#E8DFCA] opacity-90">필요한 품목의 수량을 입력하고 주문을 완료해주세요.</p>
        </div>
      </div>

      <div className="site-container py-8 w-full flex-1 flex flex-col min-h-0">
        {/* Previous Orders Quick Load */}
        <div className="mb-6 rounded-xl border border-[#DDE7D4] bg-[#FAFAF7] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm font-bold text-[#1A4D2E]">이전 주문 불러오기</p>
            <p className="text-xs text-gray-500">최근 주문 5건까지 재사용할 수 있습니다.</p>
          </div>
          {isLoadingPreviousOrders ? (
            <p className="text-sm text-[#6D7568]">이전 주문 내역을 불러오는 중...</p>
          ) : previousOrders.length === 0 ? (
            <p className="text-sm text-[#6D7568]">불러올 이전 주문 내역이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {previousOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-[#E2E8D9] bg-white px-3 py-3">
                  <p className="text-xs text-gray-500 mb-1">
                    주문 #{order.id} · {order.created_at ? new Date(order.created_at).toLocaleString() : "-"}
                  </p>
                  <div className="mb-2 space-y-1">
                    <p className="text-sm font-semibold text-[#1A4D2E]">
                      품목 {order.items.length}종 · 총 수량 {order.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0)}개
                    </p>
                    <p className="text-xs text-gray-600">수령인: {order.recipient_name || "-"}</p>
                    <p className="text-xs text-gray-600">연락처: {order.delivery_phone || "-"}</p>
                    <p className="text-xs text-gray-600 truncate">배송지: {order.delivery_address || "-"}</p>
                    {order.delivery_request ? (
                      <p className="text-xs text-gray-600 truncate">요청사항: {order.delivery_request}</p>
                    ) : null}
                  </div>
                  <div className="mb-3 rounded-md border border-[#E7EDE1] bg-[#FAFCF8] px-2.5 py-2">
                    <p className="text-[11px] font-semibold text-[#5C6B5E] mb-1">주문 품목</p>
                    <ul className="space-y-1">
                      {order.items.slice(0, 4).map((item, index) => (
                        <li key={`${order.id}-${item.productId ?? item.productCode ?? item.productName ?? index}`} className="text-xs text-gray-700 flex items-center justify-between gap-2">
                          <span className="truncate">
                            {item.productName || item.productCode || (item.productId ? `상품ID ${item.productId}` : `품목 ${index + 1}`)}
                          </span>
                          <span className="shrink-0 font-semibold text-[#1A4D2E]">{Math.max(0, Number(item.quantity || 0))}개</span>
                        </li>
                      ))}
                      {order.items.length > 4 ? (
                        <li className="text-[11px] text-gray-500">외 {order.items.length - 4}개 품목</li>
                      ) : null}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPreviousOrder(order)}
                    className="px-3 py-1.5 rounded-lg border border-[#1A4D2E] text-[#1A4D2E] text-sm font-semibold hover:bg-[#F4F7EF] transition-colors"
                  >
                    이 주문 불러오기
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Defaults */}
        <div className="mb-6 rounded-xl border border-[#DDE7D4] bg-[#FAFAF7] p-4">
          <p className="text-sm font-bold text-[#1A4D2E] mb-3">배송 기본정보</p>
          <p className="mb-3 text-xs text-gray-500">주문 시 기본값으로 자동 반영됩니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">수령인 <span className="text-red-600">*</span></label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                placeholder="가맹점명 또는 담당자명"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">연락처 <span className="text-red-600">*</span></label>
              <input
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                placeholder="010-0000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">배송지 <span className="text-red-600">*</span></label>
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                placeholder="기본 배송지"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">배송 요청사항</label>
              <input
                value={deliveryRequest}
                onChange={(e) => setDeliveryRequest(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                placeholder="요청사항 입력"
              />
            </div>
          </div>
        </div>

        <div className="sticky top-24 z-40 mb-6 rounded-2xl border border-[#E2E8D9] bg-white/95 backdrop-blur px-3 py-3 md:px-4 md:py-4 shadow-sm">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
            {visibleOrderCategoryTabs.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  activeCategory === cat.id
                    ? "bg-[#4F6F52] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4">
            <div className="w-full md:w-[340px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                품목 검색 <span className="text-red-600">* 필수</span>
              </label>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="품목 검색 (이름/코드)"
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-shadow"
                required
              />
              <p className="mt-1 text-xs text-gray-500">품목명 또는 품목코드로 검색하세요.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="text-sm font-bold text-gray-700">정렬 <span className="text-red-600">* 필수</span></div>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="px-4 py-3.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none"
                required
              >
                <option value="name_asc">이름순</option>
                <option value="price_asc">가격순</option>
                <option value="stock_asc">재고순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 pb-32">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full table-fixed text-left border-collapse min-w-[1100px]">
                  <colgroup>
                    <col className="w-24" />
                    <col className="w-[240px]" />
                    <col className="w-20" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-32" />
                    <col className="w-32" />
                    <col className="w-40" />
                  </colgroup>
                  <thead>
                    <tr className="bg-white text-gray-600 text-sm border-b border-gray-200">
                      <th className="p-4 font-semibold w-24 sticky left-0 top-0 z-30 bg-white shadow-sm">품목코드</th>
                      <th className="p-4 font-semibold w-[240px] sticky left-24 top-0 z-30 bg-white shadow-sm text-left">품목명</th>
                      <th className="p-4 font-semibold w-20 sticky top-0 z-20 bg-white shadow-sm">단위</th>
                      <th className="p-4 font-semibold w-24 sticky top-0 z-20 bg-white shadow-sm">과세유형</th>
                      <th className="p-4 font-semibold w-24 sticky top-0 z-20 bg-white shadow-sm">재고</th>
                      <th className="p-4 font-semibold w-32 text-right sticky top-0 z-20 bg-white shadow-sm">판매가</th>
                      <th className="p-4 font-semibold w-32 text-center sticky top-0 z-20 bg-white shadow-sm">수량</th>
                      <th className="p-4 font-semibold w-40 text-right sticky top-0 z-20 bg-white shadow-sm">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item) => {
                      const q = quantities[item.code] || 0;
                      const rowTotal = item.price * q;
                      const isOutOfStock = item.stockStatus === "out_of_stock";
                      const isSelected = q > 0;

                      const maxQuantity = isOutOfStock ? 0 : Math.max(0, item.stockQuantity);
                      const isLowStock = item.stockStatus === "low_stock" && item.stockQuantity < 10;

                      return (
                        <tr
                          key={item.code}
                          className={`border-b border-gray-100 hover:bg-[#FAFAF7] transition-colors ${
                            isSelected ? "bg-[#EAF5EE]" : "bg-white"
                          }`}
                        >
                          <td className={`p-4 text-sm text-gray-500 w-24 sticky left-0 z-20 ${isSelected ? "bg-[#EAF5EE]" : "bg-white"}`}>
                            {item.code}
                          </td>
                          <td className={`p-4 font-medium text-gray-800 w-[240px] sticky left-24 z-20 ${isSelected ? "bg-[#EAF5EE]" : "bg-white"}`}>
                            <div className="flex items-center gap-3 min-w-[240px]">
                              <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const img = e.currentTarget;
                                      img.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-gray-200" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate">{item.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 w-20 text-sm text-gray-500">{item.unit}</td>
                          <td className="p-4 w-24 text-sm text-gray-500">
                            <span
                              className={`px-2 py-1 rounded-md text-xs ${
                                item.tax === "과세"
                                  ? "bg-orange-100 text-orange-800"
                                  : item.tax === "비과세"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {item.tax}
                            </span>
                          </td>
                          <td className="p-4 w-24 text-sm text-gray-500">
                            {isOutOfStock ? (
                              <span className="px-2 py-1 rounded-md text-xs bg-red-100 text-red-700">품절</span>
                            ) : isLowStock ? (
                              <span className="px-2 py-1 rounded-md text-xs bg-red-100 text-red-700">
                                재고 {item.stockQuantity}개 (임박)
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                재고 {item.stockQuantity}
                              </span>
                            )}
                          </td>
                          <td className="p-4 w-32 text-right font-semibold text-[#1A4D2E]">
                            {item.price.toLocaleString()}원
                          </td>
                          <td className="p-4 w-32 text-center">
                            <div className="inline-flex items-center justify-center border border-gray-300 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                aria-label="수량 감소"
                                onClick={() => setQuantityForCode(item.code, Math.max(0, q - 1))}
                                disabled={isOutOfStock || q <= 0}
                                className="px-3 py-1.5 text-lg font-semibold text-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                              >
                                -
                              </button>
                              <div className="px-4 py-1.5 min-w-[56px] bg-white text-sm font-bold text-gray-800">{q}</div>
                              <button
                                type="button"
                                aria-label="수량 증가"
                                onClick={() => setQuantityForCode(item.code, q + 1)}
                                disabled={isOutOfStock || q >= maxQuantity}
                                className="px-3 py-1.5 text-lg font-semibold text-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-4 w-40 text-right font-bold text-[#1A4D2E]">
                            {rowTotal > 0 ? `${rowTotal.toLocaleString()}원` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-3">
              {displayItems.map((item) => {
                const q = quantities[item.code] || 0;
                const rowTotal = item.price * q;
                const isOutOfStock = item.stockStatus === "out_of_stock";
                const maxQuantity = isOutOfStock ? 0 : Math.max(0, item.stockQuantity);
                const isSelected = q > 0;
                const isLowStock = item.stockStatus === "low_stock" && item.stockQuantity < 10;

                return (
                  <div
                    key={item.code}
                    className={`rounded-2xl border p-4 bg-white shadow-sm ${
                      isSelected ? "border-[#4F6F52]/30 bg-[#EAF5EE]" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-200" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {item.code} · {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs text-gray-500">판매가</div>
                        <div className="font-bold text-[#1A4D2E]">{item.price.toLocaleString()}원</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">재고</div>
                        {isOutOfStock ? (
                          <div className="text-sm font-bold text-red-700">품절</div>
                        ) : isLowStock ? (
                          <div className="text-sm font-bold text-red-700">
                            재고 {item.stockQuantity}개 (임박)
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-gray-700">{`재고 ${item.stockQuantity}개`}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="inline-flex items-center justify-center border border-gray-300 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          aria-label="수량 감소"
                          onClick={() => setQuantityForCode(item.code, Math.max(0, q - 1))}
                          disabled={isOutOfStock || q <= 0}
                          className="px-3 py-1.5 text-lg font-semibold text-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          -
                        </button>
                        <div className="px-4 py-1.5 min-w-[56px] bg-white text-sm font-bold text-gray-800">{q}</div>
                        <button
                          type="button"
                          aria-label="수량 증가"
                          onClick={() => setQuantityForCode(item.code, q + 1)}
                          disabled={isOutOfStock || q >= maxQuantity}
                          className="px-3 py-1.5 text-lg font-semibold text-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-500">금액</div>
                        <div className="font-bold text-[#1A4D2E]">
                          {rowTotal > 0 ? `${rowTotal.toLocaleString()}원` : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Bottom */}
        <div className="bg-[#FAFAF7] border border-[#E8DFCA] rounded-xl p-6 flex flex-col gap-4 shadow-sm sticky bottom-6 z-30">
          {/* 주문내역 프리뷰: 총액/버튼 영역 위로 올려 노출 */}
          <div className="text-sm text-gray-600 bg-white/60 border border-[#E8DFCA] rounded-xl px-4 py-2 max-h-40 overflow-y-auto w-full">
            {orderedItems.length === 0 ? (
              <span className="text-gray-500">선택된 상품 없음</span>
            ) : (
              <div className="space-y-2">
                {orderedItems.map((it) => (
                  <div key={it.code} className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{it.name}</span>
                    <span className="shrink-0 font-bold text-[#1A4D2E]">{it.quantity}개</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">총 합산 금액</p>
              <div className="text-3xl md:text-5xl font-extrabold text-[#1A4D2E]">
                {totalAmount.toLocaleString()}<span className="text-2xl md:text-3xl ml-1 text-gray-600">원</span>
              </div>
              {submitError ? <p className="mt-3 text-sm font-semibold text-red-600">{submitError}</p> : null}
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={clearAllSelectedItems}
                disabled={orderedItems.length === 0 || isSubmitting}
                className="w-full sm:w-auto px-6 py-3.5 bg-white border border-[#C8D7BE] text-[#2B4B35] text-base font-semibold rounded-xl hover:bg-[#F3F8EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                전체 제거
              </button>
              <button
                onClick={handleOrderClick}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-4 bg-[#1A4D2E] hover:bg-[#123A21] text-white text-xl font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-6 h-6" />
                {isSubmitting ? "주문 저장 중" : "주문하기"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ReceiptModal
          items={orderedItems}
          total={totalAmount}
          orderId={createdOrderId}
          onClose={() => setIsModalOpen(false)}
          onConfirm={resetOrder}
          orderHistoryPath={FRANCHISE_ORDERS_HISTORY_PATH}
          onGoToOrderHistory={goToOrderHistory}
        />
      )}

      {isCartPreviewOpen && (
        <OrderCartPreviewModal
          items={orderedItems.map((it) => ({
            code: it.code,
            name: it.name,
            unit: it.unit,
            price: it.price,
            quantity: it.quantity,
          }))}
          total={totalAmount}
          onClose={() => setIsCartPreviewOpen(false)}
          onConfirmOrder={cartPreviewMode === "checkout" ? () => void submitOrder() : undefined}
          isSubmitting={cartPreviewMode === "checkout" ? isSubmitting : false}
        />
      )}

      {toastVisible && toastMessage ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[70] transition-opacity duration-200">
          <div className="max-w-sm rounded-xl border border-[#DDE7D4] bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
            <p className="text-sm font-medium text-[#1A4D2E]">{toastMessage}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
