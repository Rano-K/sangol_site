import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useShopping } from "../hooks/useShopping";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { useCmsPage } from "../hooks/useCmsPage";

type FranchiseOrderItem = {
  id: number;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type FranchiseOrder = {
  id: number;
  status: string;
  total_amount: number | string;
  delivery_address: string | null;
  delivery_phone?: string | null;
  recipient_name?: string | null;
  delivery_request: string | null;
  created_at: string;
  items: FranchiseOrderItem[];
};

type FranchiseOrderEditDraft = {
  recipientName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryRequest: string;
  items: FranchiseOrderItem[];
};

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

const ORDER_STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-yellow-100 text-yellow-700" },
  processing: { label: "처리중", className: "bg-blue-100 text-blue-700" },
  shipped: { label: "출고", className: "bg-purple-100 text-purple-700" },
  delivered: { label: "배송완료", className: "bg-green-100 text-green-700" },
  cancelled: { label: "취소", className: "bg-red-100 text-red-700" },
};

const getOrderStatusMeta = (status: string): { label: string; className: string } => {
  const key = status as OrderStatus;
  if (ORDER_STATUS_META[key]) return ORDER_STATUS_META[key];
  return { label: "상태확인", className: "bg-gray-200 text-gray-700" };
};

export function MyPage() {
  const location = useLocation();
  const { user, token, isAuthenticated, logout } = useAuth();
  const { wishlistItems, cartItems, addToCart, removeFromWishlist, removeFromCart, updateCartQuantity } = useShopping();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [franchiseOrders, setFranchiseOrders] = useState<FranchiseOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FranchiseOrderEditDraft | null>(null);
  const { data: orderCms } = useCmsPage("order");
  const activeTab = new URLSearchParams(location.search).get("tab");
  const shouldRedirectToLogin = !isAuthenticated || !user || !token;
  const isFranchiseUser = user?.role === "franchise";
  const canUseFranchiseOrder = isFranchiseUser || user?.role === "admin";
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const editingOrder = useMemo(
    () => (editingOrderId === null ? null : franchiseOrders.find((order) => order.id === editingOrderId) || null),
    [editingOrderId, franchiseOrders]
  );
  const originalOrderTotal = Number(editingOrder?.total_amount || 0);
  const draftOrderTotal = useMemo(
    () => (editDraft ? editDraft.items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Math.max(1, Number(item.quantity || 1)), 0) : 0),
    [editDraft]
  );
  const orderTotalDiff = draftOrderTotal - originalOrderTotal;
  const paymentSection =
    orderCms?.sections && typeof orderCms.sections === "object"
      ? ((orderCms.sections as Record<string, unknown>).payment as Record<string, unknown> | undefined)
      : undefined;
  const depositAccountName =
    (typeof paymentSection?.accountName === "string" && paymentSection.accountName.trim()) ||
    ((import.meta.env["VITE_B2B_DEPOSIT_ACCOUNT_NAME"] as string | undefined) ?? "");
  const depositAccountNumber =
    (typeof paymentSection?.accountNumber === "string" && paymentSection.accountNumber.trim()) ||
    ((import.meta.env["VITE_B2B_DEPOSIT_ACCOUNT_NUMBER"] as string | undefined) ?? "");
  const requiredNotice =
    (typeof paymentSection?.requiredNotice === "string" && paymentSection.requiredNotice.trim()) ||
    "※ 반드시 입금 후 주문을 확정해 주세요. 미입금 시 출고가 진행되지 않습니다.";

  const runSafely = async (key: string, fn: () => Promise<void>, fallbackError: string) => {
    try {
      setBusyKey(key);
      setError("");
      await fn();
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : fallbackError);
    } finally {
      setBusyKey(null);
    }
  };

  const moveAllWishlistToCart = async () => {
    await runSafely(
      "wishlist-move-all",
      async () => {
        for (const item of wishlistItems) {
          await addToCart(item.productId, 1);
        }
      },
      "전체 장바구니 담기에 실패했습니다."
    );
  };

  const clearCart = async () => {
    await runSafely(
      "cart-clear-all",
      async () => {
        for (const item of cartItems) {
          await removeFromCart(item.productId);
        }
      },
      "장바구니 비우기에 실패했습니다."
    );
  };

  const clearWishlist = async () => {
    await runSafely(
      "wishlist-clear-all",
      async () => {
        for (const item of wishlistItems) {
          await removeFromWishlist(item.productId);
        }
      },
      "관심상품 비우기에 실패했습니다."
    );
  };

  const loadFranchiseOrders = async () => {
    if (!canUseFranchiseOrder || !token) return;
    setLoadingOrders(true);
    try {
      const response = await fetch(`${apiBaseUrl}/orders/franchise`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "주문 내역 조회 실패");
      setFranchiseOrders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "주문 내역 조회 실패");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadFranchiseOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseFranchiseOrder, token]);

  if (shouldRedirectToLogin) {
    return <Navigate to="/login" state={{ from: "/mypage" }} replace />;
  }
  if (isFranchiseUser && (activeTab === "cart" || activeTab === "wishlist")) {
    return <Navigate to="/mypage" replace />;
  }

  const startEditOrder = (order: FranchiseOrder) => {
    setEditingOrderId(order.id);
    setEditDraft({
      recipientName: order.recipient_name || "",
      deliveryPhone: order.delivery_phone || "",
      deliveryAddress: order.delivery_address || "",
      deliveryRequest: order.delivery_request || "",
      items: Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : [],
    });
  };

  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setEditDraft(null);
  };

  const updateDraftItemQuantity = (itemId: number, nextQuantity: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(1, Math.floor(nextQuantity || 1)) } : item
        ),
      };
    });
  };

  const removeDraftItem = (itemId: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      };
    });
  };

  const saveOrderMeta = async (orderId: number) => {
    await runSafely(
      `franchise-order-update-${orderId}`,
      async () => {
        if (!editDraft) throw new Error("수정할 주문 정보가 없습니다.");
        if (editDraft.items.length === 0) {
          throw new Error("주문 항목은 최소 1개 이상이어야 합니다.");
        }
        const invalidItem = editDraft.items.find((item) => !Number.isInteger(item.quantity) || item.quantity < 1);
        if (invalidItem) {
          throw new Error("수량은 1 이상의 정수로 입력해 주세요.");
        }
        const missingProduct = editDraft.items.find((item) => !Number.isFinite(Number(item.productId)));
        if (missingProduct) {
          throw new Error("일부 품목은 상품 식별자가 없어 수정할 수 없습니다.");
        }

        const response = await fetch(`${apiBaseUrl}/orders/franchise/${orderId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientName: editDraft.recipientName.trim() || null,
            deliveryPhone: editDraft.deliveryPhone.trim() || null,
            deliveryAddress: editDraft.deliveryAddress.trim() || null,
            deliveryRequest: editDraft.deliveryRequest.trim() || null,
            items: editDraft.items.map((item) => ({
              productId: Number(item.productId),
              quantity: Math.max(1, Math.floor(item.quantity || 1)),
            })),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "주문 수정 실패");
        cancelEditOrder();
        await loadFranchiseOrders();
      },
      "주문 수정 실패"
    );
  };

  const deleteFranchiseOrder = async (orderId: number) => {
    if (!window.confirm("해당 주문을 삭제하시겠습니까? (pending 주문만 삭제 가능)")) return;
    await runSafely(
      `franchise-order-delete-${orderId}`,
      async () => {
        const response = await fetch(`${apiBaseUrl}/orders/franchise/${orderId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "주문 삭제 실패");
        if (editingOrderId === orderId) cancelEditOrder();
        await loadFranchiseOrders();
      },
      "주문 삭제 실패"
    );
  };

  return (
    <div className="flex-1 bg-[#F4F6F1] py-16 px-4">
      <div className="site-container site-container--narrow space-y-6">
        <div className="bg-white border border-[#E2E8D9] rounded-3xl p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#6D7568] mb-1">안녕하세요, {user.name}님</p>
              <h1 className="text-3xl font-black tracking-tight text-[#1A4D2E] mb-2">마이페이지</h1>
              <p className="text-[#5F675B]">
                {isFranchiseUser
                  ? "가맹점 주문 내역과 계정 정보를 관리하세요."
                  : canUseFranchiseOrder
                    ? "장바구니/관심상품과 가맹점 주문 내역을 함께 관리하세요."
                    : "장바구니, 관심상품, 계정 정보를 한 번에 관리하세요."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/products"
                className="px-4 py-2 rounded-xl border border-[#D2DAC7] text-[#1A4D2E] font-semibold hover:bg-[#F4F7EF] transition-colors"
              >
                상품 더 보기
              </Link>
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-[#1A4D2E] text-white font-semibold hover:bg-[#123A21] transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>

          <div className={`grid gap-3 mt-6 ${isFranchiseUser ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
            {!isFranchiseUser ? (
              <>
                <div className="rounded-2xl border border-[#E2E8D9] bg-[#F8FAF5] p-4">
                  <p className="text-xs text-[#6D7568]">장바구니 상품 수</p>
                  <p className="mt-1 text-2xl font-extrabold text-[#1A4D2E]">{cartItemCount}</p>
                </div>
                <div className="rounded-2xl border border-[#E2E8D9] bg-[#F8FAF5] p-4">
                  <p className="text-xs text-[#6D7568]">관심상품 수</p>
                  <p className="mt-1 text-2xl font-extrabold text-[#1A4D2E]">{wishlistItems.length}</p>
                </div>
              </>
            ) : null}
            <div className="rounded-2xl border border-[#E2E8D9] bg-[#F8FAF5] p-4">
              <p className="text-xs text-[#6D7568]">{isFranchiseUser ? "가맹점 발주" : "예상 결제금액"}</p>
              <p className="mt-1 text-2xl font-extrabold text-[#1A4D2E]">
                {isFranchiseUser ? "사용" : `${cartTotal.toLocaleString()}원`}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E2E8D9] bg-[#F8FAF5] p-4">
              <p className="text-xs text-[#6D7568]">회원 권한</p>
              <p className="mt-1 text-2xl font-extrabold text-[#1A4D2E]">{user.role}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8D9] rounded-3xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A4D2E] mb-4">계정 정보</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm rounded-2xl border border-[#E2E8D9] bg-[#FBFCF9] p-4">
            <div>
              <dt className="text-[#6D7568] mb-1">이름</dt>
              <dd className="text-[#1A4D2E] font-semibold">{user.name}</dd>
            </div>
            <div>
              <dt className="text-[#6D7568] mb-1">이메일</dt>
              <dd className="text-[#1A4D2E] font-semibold">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[#6D7568] mb-1">권한</dt>
              <dd className="text-[#1A4D2E] font-semibold">{user.role}</dd>
            </div>
            <div>
              <dt className="text-[#6D7568] mb-1">가맹점 연동키</dt>
              <dd className="text-[#1A4D2E] font-semibold">{user.franchiseKey ?? user.franchiseId ?? "-"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/order"
              className="px-4 py-2 rounded-xl border border-[#1A4D2E] text-[#1A4D2E] font-semibold hover:bg-[#F4F7EF] transition-colors"
            >
              가맹점 주문 페이지
            </Link>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        ) : null}

        {canUseFranchiseOrder ? (
          <div className="bg-white border border-[#E2E8D9] rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-[#1A4D2E]">가맹점 주문 내역</h2>
              <Link
                to="/order"
                className="inline-flex px-4 py-2 rounded-xl bg-[#1A4D2E] text-white text-sm font-semibold hover:bg-[#123A21] transition-colors"
              >
                신규 주문
              </Link>
            </div>
            <div className="mb-4 rounded-2xl border border-[#D7E2CE] bg-[#F7FAF5] p-4">
              <p className="text-xs font-semibold text-[#65725F]">입금 계좌 안내</p>
              <p className="mt-1 text-sm font-bold text-[#1A4D2E]">{depositAccountName || "계좌명을 관리자에서 설정해 주세요."}</p>
              <p className="text-sm font-semibold text-[#1A4D2E]">{depositAccountNumber || "계좌번호를 관리자에서 설정해 주세요."}</p>
              <p className="mt-2 text-sm font-extrabold text-red-600">{requiredNotice}</p>
            </div>
            {loadingOrders ? (
              <p className="text-sm text-[#6D7568]">주문 내역을 불러오는 중...</p>
            ) : franchiseOrders.length === 0 ? (
              <p className="text-sm text-[#6D7568]">등록된 주문 내역이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {franchiseOrders.map((order) => {
                  const isPending = order.status === "pending";
                  const statusMeta = getOrderStatusMeta(order.status);
                  return (
                    <div key={order.id} className="rounded-2xl border border-[#E2E8D9] p-4 bg-[#FBFCF9]">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="text-sm text-[#5F675B]">
                          주문 #{order.id} · {new Date(order.created_at).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-sm font-bold text-[#1A4D2E]">
                            {Number(order.total_amount || 0).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        {Array.isArray(order.items) &&
                          order.items.map((item) => (
                            <div key={item.id} className="text-sm text-[#1A4D2E] flex justify-between gap-3">
                              <span className="truncate">{item.productName}</span>
                              <span className="shrink-0">{item.quantity}개 · {Number(item.totalPrice).toLocaleString()}원</span>
                            </div>
                          ))}
                      </div>
                      <div className="text-xs text-[#6D7568] mb-3 space-y-0.5">
                        <p>수령인: {order.recipient_name || "-"}</p>
                        <p>연락처: {order.delivery_phone || "-"}</p>
                        <p>배송지: {order.delivery_address || "-"}</p>
                        <p>요청사항: {order.delivery_request || "-"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => startEditOrder(order)}
                            className="px-3 py-1.5 rounded-xl border border-[#1A4D2E] text-[#1A4D2E] text-sm"
                          >
                            수정
                          </button>
                        ) : null}
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => void deleteFranchiseOrder(order.id)}
                            disabled={busyKey !== null}
                            className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm disabled:opacity-40"
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
        <div
          id="cart"
          className={`bg-white border border-[#E2E8D9] rounded-3xl p-6 shadow-sm ${activeTab === "cart" ? "ring-2 ring-[#1A4D2E]/30" : ""}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1A4D2E]">장바구니</h2>
              <p className="text-sm text-[#6D7568]">수량 조절, 상품 삭제, 예상 결제금액 확인이 가능합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => void clearCart()}
              disabled={cartItems.length === 0 || busyKey !== null}
              className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              장바구니 비우기
            </button>
          </div>
          {cartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D2DAC7] bg-[#F8FAF5] p-6 text-center">
              <p className="text-sm text-[#6D7568] mb-3">장바구니가 비어 있습니다.</p>
              <Link
                to="/products"
                className="inline-flex px-4 py-2 rounded-xl bg-[#1A4D2E] text-white text-sm font-semibold hover:bg-[#123A21] transition-colors"
              >
                상품 보러 가기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.productId} className="border border-[#E2E8D9] rounded-2xl p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1A4D2E] truncate">{item.name}</p>
                    <p className="text-sm text-[#5F675B]">{item.price.toLocaleString()}원</p>
                    <p className="text-xs text-[#6D7568] mt-0.5">소계 {(item.price * item.quantity).toLocaleString()}원</p>
                  </div>
                  <div className="inline-flex items-center rounded-xl border border-[#D6DECB] bg-[#F8FAF5] overflow-hidden">
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        void runSafely(
                          `cart-dec-${item.productId}`,
                          () => updateCartQuantity(item.productId, Math.max(1, item.quantity - 1)),
                          "수량 변경 실패"
                        )
                      }
                      className="px-3 py-1.5 text-[#1A4D2E] hover:bg-[#EEF3E7] disabled:opacity-40"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => {
                        const nextQty = Math.max(1, Number(event.target.value) || 1);
                        void runSafely(
                          `cart-input-${item.productId}`,
                          () => updateCartQuantity(item.productId, nextQty),
                          "수량 변경 실패"
                        );
                      }}
                      className="w-16 text-center bg-transparent py-1.5 text-sm outline-none"
                    />
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        void runSafely(
                          `cart-inc-${item.productId}`,
                          () => updateCartQuantity(item.productId, item.quantity + 1),
                          "수량 변경 실패"
                        )
                      }
                      className="px-3 py-1.5 text-[#1A4D2E] hover:bg-[#EEF3E7] disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void runSafely(
                        `cart-remove-${item.productId}`,
                        () => removeFromCart(item.productId),
                        "장바구니 삭제 실패"
                      )
                    }
                    disabled={busyKey !== null}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          id="wishlist"
          className={`bg-white border border-[#E2E8D9] rounded-3xl p-6 shadow-sm ${activeTab === "wishlist" ? "ring-2 ring-[#1A4D2E]/30" : ""}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1A4D2E]">관심 상품</h2>
              <p className="text-sm text-[#6D7568]">자주 보는 상품을 모아두고 바로 장바구니로 이동하세요.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void moveAllWishlistToCart()}
                disabled={wishlistItems.length === 0 || busyKey !== null}
                className="px-3 py-2 rounded-xl bg-[#1A4D2E] text-white text-sm font-semibold hover:bg-[#123A21] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                전체 장바구니 담기
              </button>
              <button
                type="button"
                onClick={() => void clearWishlist()}
                disabled={wishlistItems.length === 0 || busyKey !== null}
                className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                전체 삭제
              </button>
            </div>
          </div>
          {wishlistItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D2DAC7] bg-[#F8FAF5] p-6 text-center">
              <p className="text-sm text-[#6D7568] mb-3">관심 상품이 없습니다.</p>
              <Link
                to="/products"
                className="inline-flex px-4 py-2 rounded-xl border border-[#1A4D2E] text-[#1A4D2E] text-sm font-semibold hover:bg-[#F4F7EF] transition-colors"
              >
                상품 둘러보기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlistItems.map((item) => (
                <div key={item.productId} className="border border-[#E2E8D9] rounded-2xl p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1A4D2E] truncate">{item.name}</p>
                    <p className="text-sm text-[#5F675B]">{item.price.toLocaleString()}원</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void runSafely(
                        `wishlist-to-cart-${item.productId}`,
                        () => addToCart(item.productId, 1),
                        "장바구니 담기 실패"
                      )
                    }
                    disabled={busyKey !== null}
                    className="px-3 py-1.5 rounded-xl border border-[#C8D5B8] text-[#1A4D2E] hover:bg-[#F4F7EF] text-sm disabled:opacity-40"
                  >
                    장바구니 담기
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void runSafely(
                        `wishlist-remove-${item.productId}`,
                        () => removeFromWishlist(item.productId),
                        "관심 상품 삭제 실패"
                      )
                    }
                    disabled={busyKey !== null}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {editingOrderId !== null && editDraft ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={cancelEditOrder}>
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E2E8D9] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1A4D2E]">주문 #{editingOrderId} 수정 (대기 상태)</h3>
              <button type="button" onClick={cancelEditOrder} className="text-sm px-3 py-1.5 rounded-lg border border-[#D2DAC7]">
                닫기
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-auto max-h-[calc(88vh-130px)]">
              <div className="rounded-xl border border-[#DDE7D4] bg-[#F5FAF1] px-4 py-3">
                <p className="text-sm font-semibold text-[#1A4D2E] mb-2">총액 비교</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border border-[#E2E8D9] bg-white px-3 py-2">
                    <p className="text-xs text-[#6D7568]">변경 전</p>
                    <p className="font-bold text-[#1A4D2E]">{originalOrderTotal.toLocaleString()}원</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8D9] bg-white px-3 py-2">
                    <p className="text-xs text-[#6D7568]">변경 후</p>
                    <p className="font-bold text-[#1A4D2E]">{draftOrderTotal.toLocaleString()}원</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8D9] bg-white px-3 py-2">
                    <p className="text-xs text-[#6D7568]">차액</p>
                    <p className={`font-bold ${orderTotalDiff === 0 ? "text-[#1A4D2E]" : orderTotalDiff > 0 ? "text-red-600" : "text-blue-600"}`}>
                      {orderTotalDiff > 0 ? "+" : ""}
                      {orderTotalDiff.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8D9] bg-[#FBFCF9] p-4">
                <p className="text-sm font-semibold text-[#1A4D2E] mb-3">주문 상품</p>
                <div className="space-y-2">
                  {editDraft.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-[#E2E8D9] bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A4D2E] truncate">{item.productName}</p>
                        <p className="text-xs text-[#6D7568]">{Number(item.unitPrice || 0).toLocaleString()}원 / 개</p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateDraftItemQuantity(item.id, Number(e.target.value))}
                        className="w-20 rounded-lg border border-[#D2DAC7] px-2 py-1.5 text-sm text-right"
                      />
                      <button
                        type="button"
                        onClick={() => removeDraftItem(item.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50"
                      >
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">수령인</label>
                  <input
                    value={editDraft.recipientName}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, recipientName: e.target.value } : prev))}
                    className="w-full rounded-lg border border-[#D2DAC7] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">연락처</label>
                  <input
                    value={editDraft.deliveryPhone}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, deliveryPhone: e.target.value } : prev))}
                    className="w-full rounded-lg border border-[#D2DAC7] px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">배송지</label>
                  <input
                    value={editDraft.deliveryAddress}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, deliveryAddress: e.target.value } : prev))}
                    className="w-full rounded-lg border border-[#D2DAC7] px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">요청사항</label>
                  <input
                    value={editDraft.deliveryRequest}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, deliveryRequest: e.target.value } : prev))}
                    className="w-full rounded-lg border border-[#D2DAC7] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[#E2E8D9] bg-[#FBFCF9] flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void deleteFranchiseOrder(editingOrderId)}
                disabled={busyKey !== null}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm disabled:opacity-40"
              >
                주문 삭제
              </button>
              <button
                type="button"
                onClick={cancelEditOrder}
                className="px-3 py-1.5 rounded-xl border border-[#D2DAC7] text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void saveOrderMeta(editingOrderId)}
                disabled={busyKey !== null}
                className="px-3 py-1.5 rounded-xl bg-[#1A4D2E] text-white text-sm disabled:opacity-40"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
