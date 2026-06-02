import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ChevronDown, ChevronUp, Heart, Minus, Plus, X } from "lucide-react";
import { cn } from "./ui/utils";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useShopping } from "../hooks/useShopping";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type ProductRow = {
  id: number;
  name: string;
  product_code?: string | null;
  category: string;
  description?: string | null;
  image_url?: string | null;
  image_items?: Array<{
    id?: number;
    image_url: string | null;
    is_primary?: boolean;
    display_order?: number;
  }>;
  unit?: string | null;
  spec?: string | null;
  price?: string | number | null;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock";
  stock_quantity?: number | string | null;
};

type CategorySlug = "forest" | "agriculture" | "manufactured" | "wip";

const TABS = [
  { id: "forest" as CategorySlug, label: "임산물" },
  { id: "agriculture" as CategorySlug, label: "농산물" },
  { id: "manufactured" as CategorySlug, label: "가공식품" },
  { id: "wip" as CategorySlug, label: "재공품" },
];
const PRODUCT_PAGE_SIZE = 24;
/** 관심 상품 UI 노출 여부 (로직은 유지, 화면만 숨김) */
const SHOW_WISHLIST_UI = false;
const PURCHASE_INQUIRY_PATH = "/company/location";

const stripHtmlAndDecode = (html?: string | null): string => {
  if (!html) return "";

  // 1) 태그 제거
  const noTags = html.replace(/<[^>]*>/g, " ");

  // 2) 자주 쓰는 HTML 엔티티 디코딩
  const decoded = noTags
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

  // 3) 다중 공백 정리
  return decoded.replace(/\s+/g, " ").trim();
};

const getCategorySlug = (product: ProductRow): CategorySlug => {
  const normalizedCategory = (product.category || "").trim();
  if (normalizedCategory === "임산물") return "forest";
  if (normalizedCategory === "농산물") return "agriculture";
  if (normalizedCategory === "제품(가공식품)") return "manufactured";
  if (normalizedCategory === "재공품") return "wip";

  const code = product.product_code || "";
  const codeUpper = code.toUpperCase();
  if (/^FP_/.test(codeUpper) || codeUpper.startsWith("SG-IM-")) return "forest";
  if (/^AG_/.test(codeUpper) || codeUpper.startsWith("SG-AG-")) return "agriculture";
  if (/^PR_/.test(codeUpper) || codeUpper.startsWith("SG-PR-")) return "manufactured";
  if (/^WIP_/.test(codeUpper) || codeUpper.startsWith("SG-WIP-")) return "wip";

  if (["임산물", "산양삼", "산더덕", "산두룹", "공지"].includes(product.category)) return "forest";
  if (["농산물", "고추", "마늘", "양파", "토마토"].includes(product.category)) return "agriculture";
  return "manufactured";
};

export function Products() {
  const { category } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const FRANCHISE_ORDER_DRAFT_KEY = "sangol_franchise_order_draft";

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [totalProductsCount, setTotalProductsCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityById, setQuantityById] = useState<Record<number, number>>({});
  const [modalInitialQuantity, setModalInitialQuantity] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [franchiseDraftByProductId, setFranchiseDraftByProductId] = useState<Record<string, number>>({});
  const [isOrderBarExpanded, setIsOrderBarExpanded] = useState(true);
  const { addToCart, isWishlisted, toggleWishlist } = useShopping();
  const { user, token } = useAuth();
  const isFranchiseUser = user?.role === "franchise";
  const visibleTabs = useMemo(
    () => (isFranchiseUser ? TABS : TABS.filter((tab) => tab.id !== "wip")),
    [isFranchiseUser]
  );
  const holdIntervalRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const didHoldRepeatRef = useRef(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreGuardRef = useRef(false);

  const readFranchiseDraft = () => {
    try {
      const raw = localStorage.getItem(FRANCHISE_ORDER_DRAFT_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      setFranchiseDraftByProductId(parsed);
    } catch (_error) {
      setFranchiseDraftByProductId({});
    }
  };

  const activeTabId = useMemo(() => {
    const current = (category || "").trim();
    if (current === "wip" || current === "재공품") {
      return isFranchiseUser ? "wip" : "forest";
    }
    if (visibleTabs.some((tab) => tab.id === current)) return current as CategorySlug;

    // 라벨 직접 접근 호환
    if (current === "임산물") return "forest";
    if (current === "농산물") return "agriculture";
    if (current === "제품(가공식품)") return "manufactured";

    return "forest";
  }, [category, isFranchiseUser, visibleTabs]);

  useEffect(() => {
    if (isFranchiseUser) return;
    const current = (category || "").trim();
    if (current === "wip" || current === "재공품") {
      navigate("/products/forest", { replace: true });
    }
  }, [category, isFranchiseUser, navigate]);
  const keyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim();
  }, [location.search]);

  const productIdFromQuery = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("productId");
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [location.search]);

  const productIdHandledRef = useRef<number | null>(null);

  const mapProductRows = useCallback(
    (rows: any[]): ProductRow[] =>
      rows.map((row: any) => ({
        ...row,
        id: Number(row.id),
        stock_quantity:
          row.stock_quantity === null || row.stock_quantity === undefined
            ? row.stock_quantity
            : Number(row.stock_quantity),
      })),
    []
  );

  const getImageUrls = useCallback((product: ProductRow): string[] => {
    const gallery = Array.isArray(product.image_items)
      ? product.image_items
          .slice()
          .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
          .map((item) => item.image_url)
          .filter((url): url is string => Boolean(url))
      : [];
    if (gallery.length > 0) return gallery.slice(0, 5);
    return product.image_url ? [product.image_url] : [];
  }, []);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const loadProducts = useCallback(async (offset: number, reset: boolean) => {
    if (!reset && loadingMoreGuardRef.current) return;
    if (!reset) loadingMoreGuardRef.current = true;
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PRODUCT_PAGE_SIZE));
      params.set("offset", String(offset));
      if (keyword) params.set("q", keyword);
      const endpoint = `${apiBaseUrl}/products?${params.toString()}`;
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(endpoint, { headers });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "상품 목록 조회 실패");
      }

      const incomingRows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const mapped = mapProductRows(incomingRows);
      const incomingTotal = typeof data?.total === "number" ? Number(data.total) : null;
      const nextHasMore = Array.isArray(data)
        ? mapped.length === PRODUCT_PAGE_SIZE
        : Boolean(data?.hasMore);

      setProducts((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHasMoreProducts(nextHasMore);
      setTotalProductsCount(incomingTotal);
      setError(null);

      if (isFranchiseUser) {
        readFranchiseDraft();
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "상품 목록을 불러오지 못했습니다.");
    } finally {
      if (reset) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
        loadingMoreGuardRef.current = false;
      }
    }
  }, [apiBaseUrl, isFranchiseUser, keyword, mapProductRows, token]);

  useEffect(() => {
    setProducts([]);
    setHasMoreProducts(true);
    setTotalProductsCount(null);
    loadingMoreGuardRef.current = false;
    void loadProducts(0, true);
  }, [apiBaseUrl, keyword, isFranchiseUser]);

  useEffect(() => {
    const target = loadMoreSentinelRef.current;
    if (!target) return;
    if (isLoading || isLoadingMore || !hasMoreProducts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        void loadProducts(products.length, false);
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreProducts, isLoading, isLoadingMore, products.length]);

  const visibleProducts = useMemo(
    () => (isFranchiseUser ? products : products.filter((product) => getCategorySlug(product) !== "wip")),
    [isFranchiseUser, products]
  );

  const filteredProducts = useMemo(
    () =>
      keyword
        ? visibleProducts
        : visibleProducts.filter((product) => getCategorySlug(product) === activeTabId),
    [activeTabId, keyword, visibleProducts]
  );
  const inStockCount = useMemo(
    () => filteredProducts.filter((product) => product.stock_status !== "out_of_stock").length,
    [filteredProducts]
  );

  const parsePrice = (price: ProductRow["price"]): number => {
    if (price === null || price === undefined) return 0;
    const parsed = Number(price);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const parseStockQuantity = (value: ProductRow["stock_quantity"]): number => {
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getProductSpecLabel = (product: ProductRow): string | null => {
    const spec = String(product.spec ?? "").trim();
    return spec.length > 0 ? spec : null;
  };

  const getProductUnitLabel = (product: ProductRow): string | null => {
    const unit = String(product.unit ?? "").trim();
    return unit.length > 0 ? unit : null;
  };

  const getProductDescriptionSnippet = (product: ProductRow, maxLen = 60): string | null => {
    const text = stripHtmlAndDecode(product.description);
    if (!text) return null;
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  };

  const getQuantity = (productId: number): number => quantityById[productId] ?? 1;

  const openProductModalForRow = useCallback((product: ProductRow) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
    const initialQty = quantityById[product.id] ?? 1;
    setQuantity(initialQty);
    setModalInitialQuantity(initialQty);
  }, [quantityById]);

  const clearProductIdQuery = useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("productId")) return;
    params.delete("productId");
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    productIdHandledRef.current = null;
  }, [productIdFromQuery]);

  useEffect(() => {
    if (productIdFromQuery === null) return;
    if (productIdHandledRef.current === productIdFromQuery) return;

    const tryOpen = (product: ProductRow) => {
      const slug = getCategorySlug(product);
      if (!keyword && slug !== activeTabId) {
        navigate(`/products/${slug}?productId=${productIdFromQuery}`, { replace: true });
        return;
      }
      productIdHandledRef.current = productIdFromQuery;
      openProductModalForRow(product);
      clearProductIdQuery();
    };

    const existing = products.find((p) => p.id === productIdFromQuery);
    if (existing) {
      tryOpen(existing);
      return;
    }

    if (isLoading) return;

    let cancelled = false;
    void (async () => {
      try {
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${apiBaseUrl}/products/${productIdFromQuery}`, { headers });
        const data = await response.json();
        if (!response.ok || cancelled) return;
        const mapped = mapProductRows([data])[0];
        if (!mapped || cancelled) return;
        tryOpen(mapped);
      } catch {
        // 상품 없음·권한 없음 시 무시
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    productIdFromQuery,
    isLoading,
    products,
    activeTabId,
    keyword,
    apiBaseUrl,
    token,
    navigate,
    mapProductRows,
    openProductModalForRow,
    clearProductIdQuery,
  ]);

  const setProductQuantity = (productId: number, next: number) => {
    setQuantityById((prev) => ({ ...prev, [productId]: Math.max(1, next) }));
  };
  const incrementProductQuantity = (productId: number) => {
    setQuantityById((prev) => ({ ...prev, [productId]: (prev[productId] ?? 1) + 1 }));
  };
  const decrementProductQuantity = (productId: number) => {
    setQuantityById((prev) => ({ ...prev, [productId]: Math.max(1, (prev[productId] ?? 1) - 1) }));
  };

  const startHoldChange = (fn: () => void) => {
    stopHoldChange();
    didHoldRepeatRef.current = false;
    holdTimeoutRef.current = window.setTimeout(() => {
      fn();
      holdIntervalRef.current = window.setInterval(fn, 90);
      didHoldRepeatRef.current = true;
    }, 1000);
  };

  const stopHoldChange = () => {
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHoldChange();
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProductModalByEsc();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProduct, quantity, modalInitialQuantity]);

  const selectedPrice = selectedProduct ? parsePrice(selectedProduct.price) : 0;
  const totalPrice = selectedPrice * quantity;

  const closeModal = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setModalInitialQuantity(1);
  };

  function closeProductModalByEsc() {
    if (!selectedProduct) return;
    const hasChanges = quantity !== modalInitialQuantity;
    if (hasChanges) {
      const shouldApply = window.confirm("수정한 내역을 반영하시겠습니까?");
      if (shouldApply) {
        setProductQuantity(selectedProduct.id, quantity);
      }
    }
    closeModal();
  }

  const showAddedAlert = (productName: string, qty: number) => {
    setToastMessage(`${productName} ${qty}개 담겼습니다.`);
    setToastVisible(true);
  };

  const handleToggleWishlist = async (productId: number, productName: string) => {
    setActionError(null);
    try {
      const nowWished = await toggleWishlist(productId);
      setToastMessage(
        nowWished
          ? `${productName}을(를) 관심 상품에 추가했습니다.`
          : `${productName}을(를) 관심 상품에서 제거했습니다.`
      );
      setToastVisible(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "관심 상품 처리에 실패했습니다.");
    }
  };

  const persistFranchiseDraft = (draft: Record<string, number>) => {
    localStorage.setItem(FRANCHISE_ORDER_DRAFT_KEY, JSON.stringify(draft));
    setFranchiseDraftByProductId(draft);
  };

  const removeFranchiseDraftItem = (productId: number, productName?: string) => {
    try {
      const rawDraft = localStorage.getItem(FRANCHISE_ORDER_DRAFT_KEY);
      const draft = rawDraft ? (JSON.parse(rawDraft) as Record<string, number>) : {};
      delete draft[String(productId)];
      persistFranchiseDraft(draft);
      setToastMessage(
        productName ? `${productName}을(를) 주문서에서 제거했습니다.` : "주문서에서 제거했습니다."
      );
      setToastVisible(true);
    } catch (_error) {
      setActionError("주문서에서 상품을 제거하지 못했습니다.");
    }
  };

  const handleAddToCart = async (productId: number, productName: string, qty: number) => {
    setActionError(null);
    if (isFranchiseUser) {
      try {
        const rawDraft = localStorage.getItem(FRANCHISE_ORDER_DRAFT_KEY);
        const draft = rawDraft ? (JSON.parse(rawDraft) as Record<string, number>) : {};
        const key = String(productId);
        const nextQty = Math.max(1, qty);
        draft[key] = Math.max(0, Number(draft[key] || 0)) + nextQty;
        persistFranchiseDraft(draft);
        setToastMessage(`${productName} ${nextQty}개가 가맹점 주문서에 추가되었습니다.`);
        setToastVisible(true);
      } catch (_error) {
        setActionError("가맹점 주문서 담기에 실패했습니다.");
      }
      return;
    }
    try {
      await addToCart(productId, qty);
      showAddedAlert(productName, qty);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "장바구니 담기에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => {
      setToastVisible(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toastMessage]);

  useEffect(() => {
    if (!isFranchiseUser) return;
    readFranchiseDraft();
  }, [isFranchiseUser]);

  useEffect(() => {
    if (!isFranchiseUser) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === FRANCHISE_ORDER_DRAFT_KEY) {
        readFranchiseDraft();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isFranchiseUser]);

  const franchiseOrderedItems = useMemo(() => {
    if (!isFranchiseUser) return [];
    return products
      .map((product) => {
        const quantity = Number(franchiseDraftByProductId[String(product.id)] || 0);
        const price = parsePrice(product.price);
        return {
          id: product.id,
          name: product.name,
          quantity,
          subtotal: quantity * price,
        };
      })
      .filter((item) => item.quantity > 0);
  }, [franchiseDraftByProductId, isFranchiseUser, products]);

  const franchiseDraftTotal = useMemo(
    () => franchiseOrderedItems.reduce((sum, item) => sum + item.subtotal, 0),
    [franchiseOrderedItems]
  );

  return (
    <div className="flex-1 bg-[#F4F6F1] min-h-screen">
      <div
        className={cn(
          "site-container py-12 md:py-16",
          isFranchiseUser && (isOrderBarExpanded ? "pb-44 md:pb-52" : "pb-28")
        )}
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#1A4D2E] mb-3">산골 상품</h1>
          <p className="text-[#4F6F52] text-lg">
            {keyword ? `"${keyword}" 검색 결과` : "자연에서 자란 청정 먹거리"}
          </p>
          {keyword ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#CFE0C8] bg-[#F3F8EF] px-4 py-2 text-sm text-[#2E5A3C]">
              <span className="font-semibold">검색 키워드</span>
              <span className="font-bold">"{keyword}"</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
          {visibleTabs.map((tab) => (
            <Link
              key={tab.id}
              to={`/products/${encodeURIComponent(tab.id)}`}
              className={`px-8 py-3 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${
                activeTabId === tab.id
                  ? "bg-[#1A4D2E] text-white shadow"
                  : "bg-white text-[#59635A] border border-[#E6E6E2] hover:border-[#1A4D2E]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {!isLoading && !error ? (
          <div className="mb-8 bg-white rounded-2xl border border-[#E2E8D9] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5D6659]">
              총{" "}
              <span className="font-bold text-[#1A4D2E]">
                {totalProductsCount ?? filteredProducts.length}
              </span>
              개 상품
              {isFranchiseUser ? (
                <>
                  {" · "}
                  판매 가능 <span className="font-bold text-[#1A4D2E]">{inStockCount}</span>개
                </>
              ) : null}
            </p>
            <p className="text-xs text-[#7C8576]">
              {isFranchiseUser
                ? "카드를 클릭하면 상세 정보와 수량을 확인할 수 있습니다."
                : "카드를 클릭하면 상세 정보를 확인할 수 있습니다."}
            </p>
          </div>
        ) : null}
        {actionError ? (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{actionError}</div>
        ) : null}

        {isLoading ? (
          <div className="text-center text-gray-500 py-20">상품을 불러오는 중입니다...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-20">{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 py-20">해당 카테고리에 등록된 상품이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E2E8D9] group flex flex-col hover:shadow-lg transition-shadow"
              >
                <button
                  type="button"
                  onClick={() => openProductModalForRow(product)}
                  className="relative h-52 md:h-60 overflow-hidden bg-[#F1F4EC] text-left flex items-center justify-center"
                  aria-label={`${product.name} 상세 보기`}
                >
                  <ImageWithFallback
                    src={getImageUrls(product)[0] || ""}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  {SHOW_WISHLIST_UI ? (
                    <div
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleWishlist(product.id, product.name);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/95 shadow-sm hover:bg-white transition-colors"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void handleToggleWishlist(product.id, product.name);
                        }
                      }}
                      aria-label="관심 상품 토글"
                      aria-pressed={isWishlisted(product.id)}
                    >
                      <Heart
                        className="w-4 h-4 transition-colors"
                        color={isWishlisted(product.id) ? "#ef4444" : "#5F675B"}
                        fill={isWishlisted(product.id) ? "#ef4444" : "none"}
                      />
                    </div>
                  ) : null}
                  {isFranchiseUser && product.stock_status === "out_of_stock" ? (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-white/90 text-[#1A4D2E] text-sm font-bold">품절</span>
                    </div>
                  ) : null}
                </button>
                <div className="px-4 py-4 flex-1 flex flex-col items-stretch text-left">
                  <h3 className="text-[#1A4D2E] text-base md:text-lg font-bold leading-snug mb-1">
                    {product.name}
                  </h3>
                  {getProductDescriptionSnippet(product) ? (
                    <p className="text-sm text-[#5F675B] line-clamp-2 mb-1">{getProductDescriptionSnippet(product)}</p>
                  ) : null}
                  {getProductSpecLabel(product) ? (
                    <p className="text-sm text-[#8A9385] mb-1">{getProductSpecLabel(product)}</p>
                  ) : null}
                  {getProductUnitLabel(product) ? (
                    <p className="text-sm text-[#8A9385] mb-2">{getProductUnitLabel(product)}</p>
                  ) : null}
                  {isFranchiseUser ? (
                    <p className="text-xs text-[#6A746C] mb-2">
                      {product.stock_status === "out_of_stock" ? "품절" : `재고 ${parseStockQuantity(product.stock_quantity)}개`}
                    </p>
                  ) : null}
                  <div className="w-full mt-auto pt-2 space-y-3">
                    {isFranchiseUser ? (
                      <>
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-[#6A746C]">판매가</p>
                            <p className="text-xl md:text-2xl font-black text-[#1A4D2E] tabular-nums">
                              {parsePrice(product.price).toLocaleString()}원
                            </p>
                          </div>
                          <div className="shrink-0 inline-flex items-center border border-[#D8DCD0] rounded-full overflow-hidden bg-[#FBFCF9]">
                            <button
                              type="button"
                              onClick={() => {
                                if (didHoldRepeatRef.current) {
                                  didHoldRepeatRef.current = false;
                                  return;
                                }
                                decrementProductQuantity(product.id);
                              }}
                              onMouseDown={() => startHoldChange(() => decrementProductQuantity(product.id))}
                              onMouseUp={stopHoldChange}
                              onMouseLeave={stopHoldChange}
                              onTouchStart={() => startHoldChange(() => decrementProductQuantity(product.id))}
                              onTouchEnd={stopHoldChange}
                              onTouchCancel={stopHoldChange}
                              className="px-2.5 py-2 hover:bg-[#EEF3E7]"
                              aria-label="수량 감소"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={getQuantity(product.id)}
                              onChange={(e) => setProductQuantity(product.id, Number(e.target.value) || 1)}
                              className="w-12 text-center outline-none py-2 bg-transparent text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (didHoldRepeatRef.current) {
                                  didHoldRepeatRef.current = false;
                                  return;
                                }
                                incrementProductQuantity(product.id);
                              }}
                              onMouseDown={() => startHoldChange(() => incrementProductQuantity(product.id))}
                              onMouseUp={stopHoldChange}
                              onMouseLeave={stopHoldChange}
                              onTouchStart={() => startHoldChange(() => incrementProductQuantity(product.id))}
                              onTouchEnd={stopHoldChange}
                              onTouchCancel={stopHoldChange}
                              className="px-2.5 py-2 hover:bg-[#EEF3E7]"
                              aria-label="수량 증가"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddToCart(product.id, product.name, getQuantity(product.id))}
                          className="w-full bg-[#1A4D2E] hover:bg-[#123A21] text-white py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={product.stock_status === "out_of_stock"}
                        >
                          {product.stock_status === "out_of_stock" ? "품절" : "발주 담기"}
                        </button>
                      </>
                    ) : (
                      <Link
                        to={PURCHASE_INQUIRY_PATH}
                        className="block w-full bg-[#1A4D2E] hover:bg-[#123A21] text-white py-2.5 rounded-xl font-bold text-sm text-center transition-colors"
                      >
                        구매 문의
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && !error ? (
          <div ref={loadMoreSentinelRef} className="h-16 flex items-center justify-center text-sm text-[#6D7568]">
            {isLoadingMore ? "상품을 더 불러오는 중..." : hasMoreProducts ? "스크롤하면 상품을 더 불러옵니다." : "모든 상품을 불러왔습니다."}
          </div>
        ) : null}

      </div>

      {isFranchiseUser ? (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[#E8DFCA] bg-[#FAFAF7] shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
          <div className="site-container">
            <button
              type="button"
              onClick={() => setIsOrderBarExpanded((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#4F6F52] hover:text-[#1A4D2E] transition-colors"
              aria-expanded={isOrderBarExpanded}
              aria-label={isOrderBarExpanded ? "발주 요약 접기" : "발주 요약 펼치기"}
            >
              {isOrderBarExpanded ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  발주 요약 접기
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" />
                  발주 요약 펼치기
                </>
              )}
            </button>

            {isOrderBarExpanded ? (
              <div className="pb-5 md:pb-6 flex flex-col gap-4">
                <div className="text-sm text-gray-600 bg-white/60 border border-[#E8DFCA] rounded-xl px-4 py-2 max-h-40 overflow-y-auto w-full">
                  {franchiseOrderedItems.length === 0 ? (
                    <span className="text-gray-500">선택된 상품 없음</span>
                  ) : (
                    <div className="space-y-2">
                      {franchiseOrderedItems.map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{it.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-[#1A4D2E]">{it.quantity}개</span>
                            <button
                              type="button"
                              onClick={() => removeFranchiseDraftItem(it.id, it.name)}
                              className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label={`${it.name} 삭제`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">총 합산 금액</p>
                    <div className="text-3xl md:text-5xl font-extrabold text-[#1A4D2E]">
                      {franchiseDraftTotal.toLocaleString()}
                      <span className="text-2xl md:text-3xl ml-1 text-gray-600">원</span>
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
                    <Link
                      to="/mypage#franchise-orders"
                      className="w-full sm:w-auto px-8 py-2 bg-white hover:bg-gray-50 text-[#1A4D2E] text-sm font-bold rounded-xl border border-[#E8DFCA] shadow-sm transition-colors text-center"
                    >
                      주문 내역 보기
                    </Link>
                    <Link
                      to="/order"
                      className="w-full sm:w-auto px-10 py-4 bg-[#1A4D2E] hover:bg-[#123A21] text-white text-xl font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-3"
                    >
                      주문 완료
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-0.5">총 합산 금액</p>
                  <p className="text-2xl md:text-3xl font-extrabold text-[#1A4D2E] tabular-nums">
                    {franchiseDraftTotal.toLocaleString()}
                    <span className="text-lg md:text-xl ml-1 text-gray-600 font-bold">원</span>
                  </p>
                </div>
                <p className="text-sm text-[#4F6F52] font-medium">
                  {franchiseOrderedItems.length > 0
                    ? `${franchiseOrderedItems.length}개 품목 · ${franchiseOrderedItems.reduce((n, it) => n + it.quantity, 0)}개 수량`
                    : "선택된 상품 없음"}
                </p>
                <div className="flex gap-2 sm:shrink-0">
                  <Link
                    to="/mypage#franchise-orders"
                    className="flex-1 sm:flex-none px-5 py-2 bg-white hover:bg-gray-50 text-[#1A4D2E] text-sm font-bold rounded-xl border border-[#E8DFCA] text-center"
                  >
                    주문 내역
                  </Link>
                  <Link
                    to="/order"
                    className="flex-1 sm:flex-none px-6 py-2 bg-[#1A4D2E] hover:bg-[#123A21] text-white text-sm font-bold rounded-xl text-center"
                  >
                    주문 완료
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {selectedProduct ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-[#1A4D2E]">상품 상세보기</h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-800"
                aria-label="상세보기 닫기"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="rounded-xl overflow-hidden bg-[#F2F2F0] border border-[#E4E4E0]">
                {selectedProduct ? (
                  <ImageWithFallback
                    src={getImageUrls(selectedProduct)[selectedImageIndex] || getImageUrls(selectedProduct)[0] || ""}
                    alt={selectedProduct.name}
                    className="w-full h-72 object-contain bg-[#F7F8F4]"
                  />
                ) : null}
              </div>
              {selectedProduct && getImageUrls(selectedProduct).length > 1 ? (
                <div className="md:col-span-2 mt-3 grid grid-cols-5 gap-2">
                  {getImageUrls(selectedProduct).map((imageUrl, idx) => (
                    <button
                      key={`${imageUrl}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`h-16 rounded-lg border overflow-hidden ${
                        selectedImageIndex === idx ? "border-[#1A4D2E]" : "border-[#DADFD3]"
                      }`}
                    >
                      <ImageWithFallback src={imageUrl} alt={`${selectedProduct.name} 이미지 ${idx + 1}`} className="w-full h-full object-contain bg-[#F7F8F4]" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col">
                <p className="text-sm text-[#4F6F52] mb-2">{selectedProduct.category}</p>
                <h4 className="text-2xl font-extrabold text-[#1A4D2E] mb-3">{selectedProduct.name}</h4>
                <p className="text-gray-600 leading-relaxed mb-5">
                  {(() => {
                    const cleanDescription = stripHtmlAndDecode(selectedProduct.description);
                    return cleanDescription ? cleanDescription.slice(0, 180) : "선택한 상품의 상세 설명입니다.";
                  })()}
                </p>

                {getProductSpecLabel(selectedProduct) ? (
                  <p className="text-sm text-[#8A9385] mb-1 text-left">
                    규격 {getProductSpecLabel(selectedProduct)}
                  </p>
                ) : null}
                {getProductUnitLabel(selectedProduct) ? (
                  <p className="text-sm text-[#8A9385] mb-3 text-left">
                    단위 {getProductUnitLabel(selectedProduct)}
                  </p>
                ) : null}

                {isFranchiseUser ? (
                  <div className="bg-[#F7F8F4] rounded-xl border border-[#E1E4D7] p-4 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-base">
                      <span className="text-gray-600">판매가</span>
                      <span className="text-2xl font-black text-[#1A4D2E]">
                        {selectedPrice.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">재고</span>
                      <span className="font-semibold text-[#1A4D2E]">
                        {selectedProduct.stock_status === "out_of_stock"
                          ? "품절"
                          : `${parseStockQuantity(selectedProduct.stock_quantity)}개`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={PURCHASE_INQUIRY_PATH}
                    onClick={() => closeModal()}
                    className="block w-full mb-4 bg-[#1A4D2E] hover:bg-[#123A21] text-white py-3 rounded-xl font-bold text-center transition-colors"
                  >
                    구매 문의
                  </Link>
                )}

                {isFranchiseUser ? (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">수량 선택</p>
                      <div className="inline-flex items-center border border-[#D8DCD0] rounded-full overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            if (didHoldRepeatRef.current) {
                              didHoldRepeatRef.current = false;
                              return;
                            }
                            setQuantity((prev) => Math.max(1, prev - 1));
                          }}
                          onMouseDown={() => startHoldChange(() => setQuantity((prev) => Math.max(1, prev - 1)))}
                          onMouseUp={stopHoldChange}
                          onMouseLeave={stopHoldChange}
                          onTouchStart={() => startHoldChange(() => setQuantity((prev) => Math.max(1, prev - 1)))}
                          onTouchEnd={stopHoldChange}
                          onTouchCancel={stopHoldChange}
                          className="px-3 py-2 bg-white hover:bg-[#F3F5EE]"
                          aria-label="수량 감소"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                          className="w-16 text-center outline-none py-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (didHoldRepeatRef.current) {
                              didHoldRepeatRef.current = false;
                              return;
                            }
                            setQuantity((prev) => prev + 1);
                          }}
                          onMouseDown={() => startHoldChange(() => setQuantity((prev) => prev + 1))}
                          onMouseUp={stopHoldChange}
                          onMouseLeave={stopHoldChange}
                          onTouchStart={() => startHoldChange(() => setQuantity((prev) => prev + 1))}
                          onTouchEnd={stopHoldChange}
                          onTouchCancel={stopHoldChange}
                          className="px-3 py-2 bg-white hover:bg-[#F3F5EE]"
                          aria-label="수량 증가"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-200">
                      {SHOW_WISHLIST_UI ? (
                        <button
                          type="button"
                          onClick={() => void handleToggleWishlist(selectedProduct.id, selectedProduct.name)}
                          className="w-full mb-3 border border-[#D8DCD0] text-[#1A4D2E] py-2.5 rounded-xl font-semibold hover:bg-[#F6F8F2] transition-colors"
                        >
                          {isWishlisted(selectedProduct.id) ? "관심 해제" : "관심 상품 담기"}
                        </button>
                      ) : null}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-600">총 금액</span>
                        <span className="text-2xl font-black text-[#1A4D2E]">
                          {totalPrice.toLocaleString()}원
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddToCart(selectedProduct.id, selectedProduct.name, quantity)}
                        className="w-full bg-[#1A4D2E] hover:bg-[#123A21] text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedProduct.stock_status === "out_of_stock"}
                      >
                        {selectedProduct.stock_status === "out_of_stock" ? "품절" : "가맹점 발주 담기"}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

