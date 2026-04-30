import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type ShoppingContextType = {
  wishlistCount: number;
  cartCount: number;
  wishlistIds: Set<number>;
  wishlistItems: Array<{ productId: number; name: string; price: number; imageUrl: string | null }>;
  cartItems: Array<{ productId: number; name: string; price: number; imageUrl: string | null; quantity: number }>;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  toggleWishlist: (productId: number) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateCartQuantity: (productId: number, quantity: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
  refreshShopping: () => Promise<void>;
};

const ShoppingContext = createContext<ShoppingContextType | null>(null);
const CLIENT_KEY_STORAGE = "sangol_client_key";

const getClientKey = (): string => {
  const saved = localStorage.getItem(CLIENT_KEY_STORAGE);
  if (saved) return saved;
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(CLIENT_KEY_STORAGE, generated);
  return generated;
};

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [clientKey, setClientKey] = useState("");
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [wishlistItems, setWishlistItems] = useState<ShoppingContextType['wishlistItems']>([]);
  const [cartItems, setCartItems] = useState<ShoppingContextType['cartItems']>([]);

  useEffect(() => {
    setClientKey(getClientKey());
  }, []);

  const headers = useMemo(() => {
    const nextHeaders: Record<string, string> = {};
    if (clientKey) nextHeaders["x-client-key"] = clientKey;
    if (token) nextHeaders.Authorization = `Bearer ${token}`;
    return nextHeaders;
  }, [clientKey, token]);
  const fetchOptions = useMemo(() => ({ headers, cache: "no-store" as RequestCache }), [headers]);

  const syncGuestToUser = useCallback(async () => {
    if (!clientKey || !token || !isAuthenticated) return;
    await fetch(`${apiBaseUrl}/shopping/sync-guest`, {
      method: "POST",
      headers,
    });
  }, [apiBaseUrl, clientKey, headers, isAuthenticated, token]);

  const refreshShopping = useCallback(async () => {
    if (!clientKey) return;

    const [summaryResponse, wishlistResponse, cartResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/shopping/summary`, fetchOptions),
      fetch(`${apiBaseUrl}/shopping/wishlist`, fetchOptions),
      fetch(`${apiBaseUrl}/shopping/cart`, fetchOptions),
    ]);

    if (summaryResponse.ok) {
      const summary = (await summaryResponse.json()) as { wishlistCount: number; cartCount: number };
      setWishlistCount(Number(summary.wishlistCount || 0));
      setCartCount(Number(summary.cartCount || 0));
    }

    if (wishlistResponse.ok) {
      const wishlistRows = (await wishlistResponse.json()) as Array<{ product_id: string | number }>;
      const ids = new Set<number>(wishlistRows.map((row) => Number(row.product_id)).filter((id) => Number.isFinite(id)));
      setWishlistIds(ids);
      setWishlistItems(
        wishlistRows.map((row: any) => ({
          productId: Number(row.product_id),
          name: String(row.name || ''),
          price: Number(row.price || 0),
          imageUrl: row.image_url || null,
        }))
      );
    }

    if (cartResponse.ok) {
      const cartRows = (await cartResponse.json()) as Array<any>;
      setCartItems(
        cartRows.map((row) => ({
          productId: Number(row.product_id),
          name: String(row.name || ''),
          price: Number(row.price || 0),
          imageUrl: row.image_url || null,
          quantity: Number(row.quantity || 1),
        }))
      );
    }
  }, [apiBaseUrl, clientKey, fetchOptions]);

  useEffect(() => {
    void refreshShopping();
  }, [refreshShopping]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const run = async () => {
      await syncGuestToUser();
      await refreshShopping();
    };
    void run();
  }, [isAuthenticated, token, syncGuestToUser, refreshShopping]);

  const addToCart = useCallback(
    async (productId: number, quantity = 1) => {
      if (!clientKey) return;
      const response = await fetch(`${apiBaseUrl}/shopping/cart`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "장바구니 담기에 실패했습니다.");
      }
      await refreshShopping();
    },
    [apiBaseUrl, clientKey, headers, refreshShopping]
  );

  const toggleWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      if (!clientKey) return false;
      const wished = wishlistIds.has(productId);
      const nextWished = !wished;

      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (nextWished) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
      setWishlistCount((prev) => Math.max(0, prev + (nextWished ? 1 : -1)));

      const method = wished ? "DELETE" : "POST";
      const url = wished
        ? `${apiBaseUrl}/shopping/wishlist/${productId}`
        : `${apiBaseUrl}/shopping/wishlist`;
      try {
        const response = await fetch(url, {
          method,
          cache: "no-store",
          headers: wished ? headers : { ...headers, "Content-Type": "application/json" },
          body: wished ? undefined : JSON.stringify({ productId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "관심 상품 처리에 실패했습니다.");
        }
        await refreshShopping();
        return nextWished;
      } catch (error) {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (wished) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
        setWishlistCount((prev) => Math.max(0, prev + (wished ? 1 : -1)));
        throw error;
      }
    },
    [apiBaseUrl, clientKey, headers, refreshShopping, wishlistIds]
  );

  const removeFromWishlist = useCallback(
    async (productId: number) => {
      if (!clientKey && !token) return;
      const response = await fetch(`${apiBaseUrl}/shopping/wishlist/${productId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "관심 상품 삭제에 실패했습니다.");
      }
      await refreshShopping();
    },
    [apiBaseUrl, clientKey, headers, refreshShopping, token]
  );

  const removeFromCart = useCallback(
    async (productId: number) => {
      if (!clientKey && !token) return;
      const response = await fetch(`${apiBaseUrl}/shopping/cart/${productId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "장바구니 삭제에 실패했습니다.");
      }
      await refreshShopping();
    },
    [apiBaseUrl, clientKey, headers, refreshShopping, token]
  );

  const updateCartQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (!clientKey && !token) return;
      const response = await fetch(`${apiBaseUrl}/shopping/cart/${productId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "장바구니 수량 변경에 실패했습니다.");
      }
      await refreshShopping();
    },
    [apiBaseUrl, clientKey, headers, refreshShopping, token]
  );

  const value: ShoppingContextType = {
    wishlistCount,
    cartCount,
    wishlistIds,
    wishlistItems,
    cartItems,
    addToCart,
    toggleWishlist,
    removeFromWishlist,
    removeFromCart,
    updateCartQuantity,
    isWishlisted: (productId) => wishlistIds.has(productId),
    refreshShopping,
  };

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}

export const useShopping = (): ShoppingContextType => {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error("useShopping must be used within ShoppingProvider");
  }
  return context;
};
