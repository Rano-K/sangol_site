/** 상품 카테고리 → 카탈로그 경로 */
export function categoryToProductsPath(category: string, isFranchiseUser = false): string {
  const normalized = String(category || "").trim();
  if (normalized === "임산물") return "/products/forest";
  if (normalized === "농산물") return "/products/agriculture";
  if (normalized === "재공품") return isFranchiseUser ? "/products/wip" : "/products/manufactured";
  if (normalized === "제품(가공식품)") return "/products/manufactured";
  return "/products/manufactured";
}

/** 상품 카탈로그 이동 URL (`productId` 쿼리로 상세 모달 자동 오픈) */
export function buildProductCatalogHref(
  product: { id?: number; category: string },
  options?: { isFranchiseUser?: boolean; extraQuery?: Record<string, string | undefined> }
): string {
  const path = categoryToProductsPath(product.category, options?.isFranchiseUser);
  const params = new URLSearchParams();
  if (product.id != null && product.id > 0) {
    params.set("productId", String(product.id));
  }
  if (options?.extraQuery) {
    for (const [key, value] of Object.entries(options.extraQuery)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
