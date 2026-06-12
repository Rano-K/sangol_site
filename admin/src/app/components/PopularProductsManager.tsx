import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

const POPULAR_PRODUCT_LIMIT = 16;

type PopularProductRow = {
  id: number;
  product_id: number;
  display_order: number;
  product_code: string;
  name: string;
  category: string;
  image_url: string | null;
  is_active: boolean;
};

type ProductOption = {
  id: number;
  product_code: string;
  name: string;
  category: string;
  is_active: boolean;
};

interface PopularProductsManagerProps {
  token: string;
}

export function PopularProductsManager({ token }: PopularProductsManagerProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const authHeader = { Authorization: `Bearer ${token}` };
  const [items, setItems] = useState<PopularProductRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [popularRes, productsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/home-popular-products`, { headers: authHeader }),
        fetch(`${apiBaseUrl}/admin/products`, { headers: authHeader }),
      ]);
      const popularData = await popularRes.json();
      const productsData = await productsRes.json();
      if (!popularRes.ok) throw new Error(popularData?.error || '인기 상품 목록 조회 실패');
      if (!productsRes.ok) throw new Error(productsData?.error || '상품 목록 조회 실패');
      setItems(Array.isArray(popularData) ? popularData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '목록 조회 중 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProductIds = useMemo(() => new Set(items.map((item) => item.product_id)), [items]);

  const candidateProducts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return products
      .filter((product) => !selectedProductIds.has(product.id))
      .filter((product) => {
        if (!normalized) return true;
        return (
          product.name.toLowerCase().includes(normalized) ||
          product.product_code.toLowerCase().includes(normalized) ||
          product.category.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 30);
  }, [keyword, products, selectedProductIds]);

  const saveOrder = async (nextItems: PopularProductRow[], successMessage: string) => {
    const response = await fetch(`${apiBaseUrl}/admin/home-popular-products/order`, {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productIds: nextItems.map((item) => item.product_id) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '순서 저장 실패');
    setItems(Array.isArray(data.items) ? data.items : nextItems);
    setMessage(successMessage);
  };

  const addProduct = async (productId: number) => {
    setMessage(null);
    setError(null);
    if (items.length >= POPULAR_PRODUCT_LIMIT) {
      window.alert(`인기 상품은 최대 ${POPULAR_PRODUCT_LIMIT}개까지 지정할 수 있습니다.`);
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/admin/home-popular-products`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '인기 상품 추가 실패');
      setItems(Array.isArray(data.items) ? data.items : items);
      setMessage(data?.message || '인기 상품에 추가되었습니다.');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : '인기 상품 추가 중 오류');
    }
  };

  const removeItem = async (item: PopularProductRow) => {
    if (!window.confirm(`"${item.name}"을(를) 인기 상품에서 제거할까요?`)) return;
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/home-popular-products/${item.id}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '인기 상품 제거 실패');
      setItems(Array.isArray(data.items) ? data.items : []);
      setMessage(data?.message || '인기 상품에서 제거되었습니다.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : '인기 상품 제거 중 오류');
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, moved);
    setMessage(null);
    setError(null);
    try {
      await saveOrder(nextItems, '인기 상품 순서가 저장되었습니다.');
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : '순서 저장 중 오류');
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">인기상품 관리</h2>
        <p className="text-sm text-gray-600 mt-2">
          메인 홈 BEST SELLER 영역에 노출할 상품을 지정합니다. 최대 {POPULAR_PRODUCT_LIMIT}개까지 등록할 수 있으며,
          지정된 상품이 없으면 기존처럼 상품 DB에서 자동 선정됩니다.
        </p>
      </div>

      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">지정된 인기 상품</h3>
              <p className="text-xs text-gray-500 mt-1">{items.length} / {POPULAR_PRODUCT_LIMIT}개</p>
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-500">불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">지정된 인기 상품이 없습니다. 오른쪽에서 상품을 추가하세요.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <li key={item.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.product_code} · {item.category} · {item.is_active ? '노출' : '비노출'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40"
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40"
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      제거
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">상품 추가</h3>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="품목코드/상품명/카테고리 검색"
              className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-500">불러오는 중...</div>
          ) : (
            <ul className="divide-y divide-gray-200 max-h-[560px] overflow-y-auto">
              {candidateProducts.map((product) => (
                <li key={product.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {product.product_code} · {product.category} · {product.is_active ? '노출' : '비노출'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(product.id)}
                    disabled={items.length >= POPULAR_PRODUCT_LIMIT}
                    className="px-3 py-1.5 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    추가
                  </button>
                </li>
              ))}
              {candidateProducts.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-gray-500">추가 가능한 상품이 없습니다.</li>
              ) : null}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
