import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, X, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type ProductStock = 'in_stock' | 'low_stock' | 'out_of_stock';
type TaxType = 'taxable' | 'tax_exempt';

type ProductRow = {
  id: number;
  product_code: string;
  name: string;
  description?: string | null;
  unit: string | null;
  tax_type: TaxType;
  cost_price: string | number | null;
  price: string | number;
  stock_quantity: number;
  amount: string | number;
  note: string | null;
  spec?: string | null;
  current_delivery?: string | null;
  future_delivery?: string | null;
  kg_unit_price?: string | number | null;
  image_url: string | null;
  image_items?: Array<{
    id?: number;
    image_url: string | null;
    is_primary?: boolean;
    display_order?: number;
  }>;
  category: string;
  stock_status: ProductStock;
  is_active: boolean;
  expiration_date?: string | null;
  stocked_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProductCategory = {
  id: number;
  name: string;
  category_key: string;
  is_active: boolean;
};

interface ProductsProps {
  token: string;
}

type ProductForm = {
  productCode: string;
  name: string;
  category: string;
  unit: string;
  taxType: TaxType;
  costPrice: string;
  price: string;
  stockQuantity: string;
  amount: string;
  note: string;
  spec: string;
  currentDelivery: string;
  futureDelivery: string;
  kgUnitPrice: string;
  expirationDate: string;
  stockedAt: string;
  imageUrl: string;
  additionalImageUrls: [string, string, string, string];
  isActive: boolean;
};

type AdditionalImageUpload = {
  base64: string | null;
  mimeType: string | null;
  originalName: string | null;
};

type CategoryForm = {
  id: number | null;
  name: string;
  categoryKey: string;
  isActive: boolean;
};

type StockFilter = 'all' | 'low';
type ExposureFilter = 'all' | 'active' | 'inactive';
type SortKey = 'product_code' | 'price' | 'stock_quantity' | 'created_at';
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

const INITIAL_FORM: ProductForm = {
  productCode: '',
  name: '',
  category: '',
  unit: '1kg',
  taxType: 'taxable',
  costPrice: '',
  price: '',
  stockQuantity: '0',
  amount: '0',
  note: '',
  spec: '',
  currentDelivery: '',
  futureDelivery: '',
  kgUnitPrice: '',
  expirationDate: '',
  stockedAt: '',
  imageUrl: '',
  additionalImageUrls: ['', '', '', ''],
  isActive: true,
};
const INITIAL_CATEGORY_FORM: CategoryForm = {
  id: null,
  name: '',
  categoryKey: '',
  isActive: true,
};

const extractImageFromDescription = (description?: string | null): string | null => {
  if (!description) return null;
  const match =
    description.match(/<img[^>]+src=\\?"([^"\\]+)\\?"/i) ||
    description.match(/<img[^>]+src="([^"]+)"/i);
  return match?.[1] || null;
};

const onlyDigits = (value: string): string => value.replace(/[^\d]/g, '');
const formatKrwInput = (value: string): string => {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
};
const parseKrwInputToNumber = (value: string): number => {
  const digits = onlyDigits(value);
  return digits ? Number(digits) : 0;
};
const toMoneyInputString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return String(Math.round(numeric));
  return onlyDigits(String(value));
};
const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. ${date.getHours()}시 ${date.getMinutes()}분 ${date.getSeconds()}초`;
};
const toDateInputString = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const toDateTimeLocalInputString = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const h = `${date.getHours()}`.padStart(2, '0');
  const min = `${date.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};
const isExpiringWithinMonth = (value?: string | null): boolean => {
  if (!value) return false;
  const now = new Date();
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;
  const diffMs = expiry.getTime() - now.getTime();
  const monthMs = 1000 * 60 * 60 * 24 * 30;
  return diffMs >= 0 && diffMs <= monthMs;
};
const extractWeightKg = (raw: string): number | null => {
  const normalized = (raw || '').replace(/\s+/g, '').toLowerCase();
  if (!normalized) return null;
  const kgMatch = normalized.match(/(\d+(?:\.\d+)?)kg/);
  if (kgMatch) return Number(kgMatch[1]);
  const gMatch = normalized.match(/(\d+(?:\.\d+)?)g/);
  if (gMatch) return Number(gMatch[1]) / 1000;
  return null;
};
const sortIndicator = (active: boolean, direction: SortDirection): string => {
  if (!active) return '↕';
  return direction === 'asc' ? '↑' : '↓';
};

export function Products({ token }: ProductsProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [exposureFilter, setExposureFilter] = useState<ExposureFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [modalInitialSnapshot, setModalInitialSnapshot] = useState<string>(JSON.stringify(INITIAL_FORM));
  const [localImageBase64, setLocalImageBase64] = useState<string | null>(null);
  const [localImageMimeType, setLocalImageMimeType] = useState<string | null>(null);
  const [localImageName, setLocalImageName] = useState<string | null>(null);
  const [additionalImageUploads, setAdditionalImageUploads] = useState<[
    AdditionalImageUpload,
    AdditionalImageUpload,
    AdditionalImageUpload,
    AdditionalImageUpload
  ]>([
    { base64: null, mimeType: null, originalName: null },
    { base64: null, mimeType: null, originalName: null },
    { base64: null, mimeType: null, originalName: null },
    { base64: null, mimeType: null, originalName: null },
  ]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(INITIAL_CATEGORY_FORM);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const additionalFileInputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const getProductImageItems = (product: ProductRow): string[] => {
    const list = Array.isArray(product.image_items)
      ? product.image_items
          .slice()
          .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
          .map((item) => item.image_url)
          .filter((url): url is string => Boolean(url))
      : [];
    if (list.length > 0) return list;
    return product.image_url ? [product.image_url] : [];
  };

  const authHeader = { Authorization: `Bearer ${token}` };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/products`, {
        headers: authHeader,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '상품 목록 조회 실패');
      setProducts(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '상품 목록 조회 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/product-categories`, { headers: authHeader });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '카테고리 조회 실패');
      setCategories(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(loadError);
    }
  };

  useEffect(() => {
    loadProducts();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
    setLocalImageBase64(null);
    setLocalImageMimeType(null);
    setLocalImageName(null);
    setAdditionalImageUploads([
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
    ]);
  };

  const requestSuggestedCode = async (categoryName: string): Promise<string> => {
    const category = categories.find((c) => c.name === categoryName);
    if (!category) return '';
    const response = await fetch(`${apiBaseUrl}/admin/product-categories/${category.id}/next-code`, {
      headers: authHeader,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '품목코드 제안 조회 실패');
    return String(data?.nextProductCode || '');
  };

  const openCreateModal = async () => {
    setEditingId(null);
    const firstActiveCategory = categories.find((c) => c.is_active)?.name || '';
    const initial = { ...INITIAL_FORM, category: firstActiveCategory };
    if (firstActiveCategory) {
      try {
        initial.productCode = await requestSuggestedCode(firstActiveCategory);
      } catch (_error) {
        initial.productCode = '';
      }
    }
    setForm(initial);
    setModalInitialSnapshot(JSON.stringify(initial));
    setLocalImageBase64(null);
    setLocalImageMimeType(null);
    setLocalImageName(null);
    setAdditionalImageUploads([
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
    ]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    additionalFileInputRefs.current.forEach((input) => {
      if (input) input.value = '';
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = async (nextCategory: string) => {
    setForm((prev) => ({ ...prev, category: nextCategory }));
    if (editingId) return;
    try {
      const nextCode = await requestSuggestedCode(nextCategory);
      setForm((prev) => ({ ...prev, category: nextCategory, productCode: nextCode }));
    } catch (_error) {
      // 카테고리 미선택/조회 실패 시 현재 입력 유지
    }
  };

  const openEditModal = (product: ProductRow) => {
    setEditingId(product.id);
    const imageItems = getProductImageItems(product);
    const nextForm = {
      productCode: product.product_code,
      name: product.name,
      category: product.category,
      unit: product.unit || '1kg',
      taxType: product.tax_type,
      costPrice: toMoneyInputString(product.cost_price),
      price: toMoneyInputString(product.price),
      stockQuantity: String(product.stock_quantity ?? 0),
      amount: toMoneyInputString(product.amount ?? 0),
      note: product.note || '',
      spec: product.spec || '',
      currentDelivery: product.current_delivery || '',
      futureDelivery: product.future_delivery || '',
      kgUnitPrice: toMoneyInputString(product.kg_unit_price),
      expirationDate: toDateInputString(product.expiration_date),
      stockedAt: toDateTimeLocalInputString(product.stocked_at),
      imageUrl: imageItems[0] || product.image_url || extractImageFromDescription(product.description) || '',
      additionalImageUrls: [
        imageItems[1] || '',
        imageItems[2] || '',
        imageItems[3] || '',
        imageItems[4] || '',
      ] as [string, string, string, string],
      isActive: product.is_active,
    };
    setForm(nextForm);
    setModalInitialSnapshot(JSON.stringify(nextForm));
    setLocalImageBase64(null);
    setLocalImageMimeType(null);
    setLocalImageName(null);
    setAdditionalImageUploads([
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
      { base64: null, mimeType: null, originalName: null },
    ]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    additionalFileInputRefs.current.forEach((input) => {
      if (input) input.value = '';
    });
    setIsModalOpen(true);
  };

  const onSelectLocalImage = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setLocalImageBase64(base64);
      setLocalImageMimeType(file.type || 'image/png');
      setLocalImageName(file.name);
      setForm((prev) => ({ ...prev, imageUrl: '' }));
    };
    reader.readAsDataURL(file);
  };

  const onSelectAdditionalLocalImage = (index: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setAdditionalImageUploads((prev) => {
        const next = [...prev] as [
          AdditionalImageUpload,
          AdditionalImageUpload,
          AdditionalImageUpload,
          AdditionalImageUpload
        ];
        next[index] = {
          base64,
          mimeType: file.type || 'image/png',
          originalName: file.name,
        };
        return next;
      });
      setForm((prev) => {
        const nextUrls = [...prev.additionalImageUrls] as [string, string, string, string];
        nextUrls[index] = '';
        return { ...prev, additionalImageUrls: nextUrls };
      });
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = async (): Promise<boolean> => {
    try {
      const payload = {
        productCode: (form.productCode || '').trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        taxType: form.taxType,
        costPrice: form.costPrice === '' ? null : parseKrwInputToNumber(form.costPrice),
        price: parseKrwInputToNumber(form.price),
        stockQuantity: Number(form.stockQuantity),
        amount: parseKrwInputToNumber(form.amount),
        note: form.note.trim() || null,
        spec: form.spec.trim() || null,
        currentDelivery: form.currentDelivery.trim() || null,
        futureDelivery: form.futureDelivery.trim() || null,
        kgUnitPrice: form.kgUnitPrice === '' ? null : parseKrwInputToNumber(form.kgUnitPrice),
        expirationDate: form.expirationDate || null,
        stockedAt: form.stockedAt || null,
        imageUrl: form.imageUrl.trim() || null,
        imageBase64: localImageBase64,
        imageMimeType: localImageMimeType,
        imageOriginalName: localImageName,
        imageItems: [
          localImageBase64 || form.imageUrl.trim()
            ? {
                isPrimary: true,
                imageUrl: localImageBase64 ? null : form.imageUrl.trim() || null,
                imageBase64: localImageBase64,
                imageMimeType: localImageMimeType,
                imageOriginalName: localImageName,
              }
            : null,
          ...form.additionalImageUrls
            .map((url, index) => {
              const upload = additionalImageUploads[index];
              if (upload?.base64) {
                return {
                  isPrimary: false,
                  imageUrl: null,
                  imageBase64: upload.base64,
                  imageMimeType: upload.mimeType,
                  imageOriginalName: upload.originalName,
                  displayOrder: index + 1,
                };
              }
              const trimmed = url.trim();
              if (!trimmed) return null;
              return {
                isPrimary: false,
                imageUrl: trimmed,
                displayOrder: index + 1,
              };
            })
            .filter(Boolean),
        ].filter(Boolean),
        isActive: form.isActive,
      };

      const response = await fetch(
        editingId ? `${apiBaseUrl}/admin/products/${editingId}` : `${apiBaseUrl}/admin/products`,
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const errorMessage =
          (typeof data?.error === 'string' ? data.error : null) ||
          (typeof data?.error?.message === 'string' ? data.error.message : null) ||
          (Array.isArray(data?.errors) && data.errors.length > 0
            ? String(data.errors[0]?.msg || '상품 저장 실패')
            : null) ||
          '상품 저장 실패';
        throw new Error(errorMessage);
      }
      closeModal();
      await loadProducts();
      return true;
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '상품 저장 중 오류');
      return false;
    }
  };

  const submitProduct = async (e: FormEvent) => {
    e.preventDefault();
    await saveProduct();
  };

  const closeProductModalByEsc = async () => {
    const hasChanges = JSON.stringify(form) !== modalInitialSnapshot;
    if (hasChanges) {
      const shouldApply = window.confirm("수정한 내역을 반영하시겠습니까?");
      if (shouldApply) {
        const saved = await saveProduct();
        if (!saved) return;
        return;
      }
    }
    closeModal();
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void closeProductModalByEsc();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, form, modalInitialSnapshot]);

  const taxTypeLabel = (taxType: TaxType) => {
    if (taxType === 'tax_exempt') return '비과세';
    return '과세';
  };

  const categoryOptions = Array.from(new Set(categories.map((c) => c.name))).filter(Boolean);
  const visibleCategoryOptions = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'created_at' ? 'desc' : 'asc');
  };
  const applyBulkVisibility = async (isActive: boolean) => {
    if (selectedProductIds.length === 0) return;
    try {
      const response = await fetch(`${apiBaseUrl}/admin/products/bulk-status`, {
        method: 'PATCH',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedProductIds, isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '일괄 상태 변경 실패');
      setSelectedProductIds([]);
      await loadProducts();
    } catch (bulkError) {
      window.alert(bulkError instanceof Error ? bulkError.message : '일괄 상태 변경 중 오류');
    }
  };
  const bulkSoftDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const confirmed = window.confirm(`선택한 ${selectedProductIds.length}개 상품을 삭제 처리(비노출) 하시겠습니까?`);
    if (!confirmed) return;
    try {
      const response = await fetch(`${apiBaseUrl}/admin/products/bulk-delete`, {
        method: 'PATCH',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedProductIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '일괄 삭제 처리 실패');
      setSelectedProductIds([]);
      await loadProducts();
    } catch (bulkError) {
      window.alert(bulkError instanceof Error ? bulkError.message : '일괄 삭제 처리 중 오류');
    }
  };
  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    const next = products.filter((product) => {
      if (stockFilter === 'low' && Number(product.stock_quantity) > 10) return false;
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;
      if (exposureFilter === 'active' && !product.is_active) return false;
      if (exposureFilter === 'inactive' && product.is_active) return false;
      if (!keyword) return true;
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.product_code.toLowerCase().includes(keyword)
      );
    });
    const sorted = [...next].sort((a, b) => {
      let left: number | string = '';
      let right: number | string = '';
      if (sortKey === 'product_code') {
        left = a.product_code || '';
        right = b.product_code || '';
      }
      if (sortKey === 'price') {
        left = Number(a.price || 0);
        right = Number(b.price || 0);
      }
      if (sortKey === 'stock_quantity') {
        left = Number(a.stock_quantity || 0);
        right = Number(b.stock_quantity || 0);
      }
      if (sortKey === 'created_at') {
        left = new Date(a.created_at || 0).getTime();
        right = new Date(b.created_at || 0).getTime();
      }
      if (typeof left === 'number' && typeof right === 'number') {
        return sortDirection === 'asc' ? left - right : right - left;
      }
      const compared = String(left).localeCompare(String(right), 'ko');
      return sortDirection === 'asc' ? compared : -compared;
    });
    return sorted;
  }, [categoryFilter, exposureFilter, products, searchKeyword, sortDirection, sortKey, stockFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);
  const previewImageSrc = localImageBase64
    ? `data:${localImageMimeType || 'image/png'};base64,${localImageBase64}`
    : form.imageUrl;

  useEffect(() => {
    setCurrentPage(1);
  }, [stockFilter, pageSize, searchKeyword, categoryFilter, exposureFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  useEffect(() => {
    const currentWeightKg = extractWeightKg(form.spec) ?? extractWeightKg(form.unit) ?? 1;
    const sellingPrice = parseKrwInputToNumber(form.price);
    const computedKgUnitPrice = currentWeightKg > 0
      ? String(Math.max(0, Math.round(sellingPrice / currentWeightKg)))
      : '0';
    setForm((prev) => {
      if (prev.kgUnitPrice === computedKgUnitPrice) return prev;
      return { ...prev, kgUnitPrice: computedKgUnitPrice };
    });
  }, [form.price, form.spec, form.unit]);
  useEffect(() => {
    setSelectedProductIds((prev) => prev.filter((id) => filteredProducts.some((p) => p.id === id)));
  }, [filteredProducts]);
  const currentPageIds = pagedProducts.map((p) => p.id);
  const isCurrentPageAllSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedProductIds.includes(id));

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, safeCurrentPage - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safeCurrentPage, totalPages]);

  const submitCategoryForm = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: categoryForm.name.trim(),
        categoryKey: categoryForm.categoryKey.trim().toUpperCase(),
        isActive: categoryForm.isActive,
      };
      const isEdit = categoryForm.id !== null;
      const response = await fetch(
        isEdit ? `${apiBaseUrl}/admin/product-categories/${categoryForm.id}` : `${apiBaseUrl}/admin/product-categories`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '카테고리 저장 실패');
      await loadCategories();
      setCategoryForm(INITIAL_CATEGORY_FORM);
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '카테고리 저장 중 오류');
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">상품 관리</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="상품명/품목코드 검색"
            className="h-10 min-w-[220px] border border-gray-300 rounded-lg px-3 text-sm text-gray-700 bg-white"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 border border-gray-300 rounded-lg px-3 text-sm text-gray-700 bg-white"
          >
            <option value="all">전체 카테고리</option>
            {visibleCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={exposureFilter}
            onChange={(e) => setExposureFilter(e.target.value as ExposureFilter)}
            className="h-10 border border-gray-300 rounded-lg px-3 text-sm text-gray-700 bg-white"
          >
            <option value="all">전체 노출 상태</option>
            <option value="active">노출만</option>
            <option value="inactive">비노출만</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="h-10 border border-gray-300 rounded-lg px-3 text-sm text-gray-700 bg-white"
          >
            <option value="all">전체 재고 보기</option>
            <option value="low">재고 10개 이하만</option>
          </select>
          <button onClick={() => void openCreateModal()} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition">
            상품 추가
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryForm(INITIAL_CATEGORY_FORM);
              setIsCategoryModalOpen(true);
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            카테고리 관리
          </button>
        </div>
      </div>
      {selectedProductIds.length > 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
          <p className="text-sm text-emerald-900 font-medium">선택 {selectedProductIds.length}개</p>
          <button
            type="button"
            onClick={() => void applyBulkVisibility(true)}
            className="px-3 py-1.5 text-sm rounded-md bg-green-700 text-white hover:bg-green-800"
          >
            일괄 노출
          </button>
          <button
            type="button"
            onClick={() => void applyBulkVisibility(false)}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800"
          >
            일괄 비노출
          </button>
          <button
            type="button"
            onClick={() => void bulkSoftDelete()}
            className="px-3 py-1.5 text-sm rounded-md bg-red-700 text-white hover:bg-red-800"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={() => setSelectedProductIds([])}
            className="ml-auto px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white"
          >
            선택 해제
          </button>
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-500">상품 목록을 불러오는 중...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1780px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                <input
                  type="checkbox"
                  checked={isCurrentPageAllSelected}
                  onChange={(event) => {
                    setSelectedProductIds((prev) => {
                      if (event.target.checked) {
                        return Array.from(new Set([...prev, ...currentPageIds]));
                      }
                      return prev.filter((id) => !currentPageIds.includes(id));
                    });
                  }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">썸네일</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                <button type="button" onClick={() => toggleSort('product_code')} className="inline-flex items-center gap-1">
                  품목코드 {sortIndicator(sortKey === 'product_code', sortDirection)}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 z-20 bg-gray-50 min-w-[180px]">상품명</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">배치 카테고리</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">단위</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">과세유형</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">매입가</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                <button type="button" onClick={() => toggleSort('price')} className="inline-flex items-center gap-1">
                  판매가 {sortIndicator(sortKey === 'price', sortDirection)}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                <button type="button" onClick={() => toggleSort('stock_quantity')} className="inline-flex items-center gap-1">
                  수량 {sortIndicator(sortKey === 'stock_quantity', sortDirection)}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">금액</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">규격</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">현재배송</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">차후직배가능</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">1KG 단가</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">비고</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">노출</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">유통기한</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                <button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1">
                  일자정보 {sortIndicator(sortKey === 'created_at', sortDirection)}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pagedProducts.map((product, index) => (
              <tr
                key={product.id}
                className={`${
                  Number(product.stock_quantity) === 0
                    ? 'bg-red-50'
                    : Number(product.stock_quantity) <= 10
                      ? 'bg-amber-50'
                      : index % 2 === 1
                        ? 'bg-lime-50'
                        : 'bg-white'
                } hover:bg-lime-100 transition`}
              >
                <td className="px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={(event) =>
                      setSelectedProductIds((prev) =>
                        event.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id)
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {getProductImageItems(product)[0] ? (
                    <img src={getProductImageItems(product)[0]} alt={product.name} className="h-10 w-10 rounded border object-cover bg-gray-50" />
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded border bg-gray-50 text-gray-400">
                      <ImageIcon className="w-4 h-4" />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.product_code}</td>
                <td
                  className={`px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 min-w-[180px] ${
                    index % 2 === 1 ? 'bg-lime-50' : 'bg-white'
                  }`}
                >
                  {product.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.category}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.unit || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{taxTypeLabel(product.tax_type)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.cost_price === null ? '-' : Number(product.cost_price).toLocaleString('ko-KR')}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{Number(product.price).toLocaleString('ko-KR')}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1 font-semibold ${Number(product.stock_quantity) <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                    {Number(product.stock_quantity) <= 10 ? <AlertTriangle className="w-4 h-4" /> : null}
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{Number(product.amount).toLocaleString('ko-KR')}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.spec || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.current_delivery || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{product.future_delivery || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.kg_unit_price === null || product.kg_unit_price === undefined || product.kg_unit_price === ''
                    ? '-'
                    : `${Number(product.kg_unit_price).toLocaleString('ko-KR')}원`}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate">{product.note || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.is_active ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" aria-label="노출" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" aria-label="비노출" />
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-sm whitespace-nowrap ${
                    isExpiringWithinMonth(product.expiration_date) ? 'text-red-600 font-semibold' : 'text-gray-700'
                  }`}
                >
                  {product.expiration_date ? formatDateTime(product.expiration_date) : '-'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap leading-6">
                  <div>등록일 : {formatDateTime(product.created_at)}</div>
                  <div>수정일 : {formatDateTime(product.updated_at)}</div>
                  <div>입고일 : {formatDateTime(product.stocked_at)}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <button onClick={() => openEditModal(product)} className="text-green-700 hover:text-green-800 font-medium">
                    수정
                  </button>
                </td>
              </tr>
            ))}
            {pagedProducts.length === 0 && !loading ? (
              <tr>
                <td colSpan={20} className="py-10 text-center text-sm text-gray-500">
                  {stockFilter === 'low' ? '재고 10개 이하 상품이 없습니다.' : '검색/필터 조건에 맞는 상품이 없습니다.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
        {filteredProducts.length > 0 ? (
          <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-gray-600">
              총 {filteredProducts.length}개 중 {(safeCurrentPage - 1) * pageSize + 1}-
              {Math.min(safeCurrentPage * pageSize, filteredProducts.length)}개 표시
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
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
              {pageNumbers[0] > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white"
                  >
                    1
                  </button>
                  {pageNumbers[0] > 2 ? <span className="px-1 text-gray-400">...</span> : null}
                </>
              ) : null}
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
              {pageNumbers[pageNumbers.length - 1] < totalPages ? (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 ? <span className="px-1 text-gray-400">...</span> : null}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white"
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}
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
        ) : null}
      </div>

      {isCategoryModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">카테고리 관리</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={submitCategoryForm} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                className="border rounded-lg px-3 py-2"
                placeholder="카테고리명"
                required
              />
              <input
                value={categoryForm.categoryKey}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, categoryKey: e.target.value.toUpperCase() }))}
                className="border rounded-lg px-3 py-2"
                placeholder="카테고리 키 (예: FP)"
                required
              />
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  사용
                </label>
                <button type="submit" className="ml-auto px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800">
                  {categoryForm.id ? '카테고리 수정' : '카테고리 추가'}
                </button>
              </div>
            </form>
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">카테고리명</th>
                      <th className="px-4 py-2 text-left text-sm">카테고리 키</th>
                      <th className="px-4 py-2 text-left text-sm">상태</th>
                      <th className="px-4 py-2 text-left text-sm">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="px-4 py-2 text-sm">{category.name}</td>
                        <td className="px-4 py-2 text-sm font-mono">{category.category_key}</td>
                        <td className="px-4 py-2 text-sm">{category.is_active ? '사용' : '미사용'}</td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            type="button"
                            onClick={() =>
                              setCategoryForm({
                                id: category.id,
                                name: category.name,
                                categoryKey: category.category_key,
                                isActive: category.is_active,
                              })
                            }
                            className="text-green-700 hover:text-green-800 font-medium"
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? '상품 수정' : '상품 추가'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={submitProduct} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리 <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.category}
                    onChange={(e) => {
                      void handleCategoryChange(e.target.value);
                    }}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                    required
                  >
                    <option value="">카테고리 선택</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      void handleCategoryChange(form.category);
                    }}
                    className="px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50"
                  >
                    코드 재추천
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  카테고리 키 기반 다음 품목코드(예: FP_01)를 자동 제안합니다.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  품목코드 <span className="text-red-600">*</span>
                </label>
                <input
                  value={form.productCode}
                  onChange={(e) => setForm((p) => ({ ...p, productCode: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">카테고리 선택 시 제안값이 자동 입력되며, 언제든 직접 수정 가능합니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명 <span className="text-red-600">*</span>
                </label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                <p className="text-xs text-gray-500 mt-1">사용자 화면에 표시되는 이름입니다. (1~255자)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  단위 <span className="text-red-600">*</span>
                </label>
                <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                <p className="text-xs text-gray-500 mt-1">예: 1kg, 500g, 1박스</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과세유형</label>
                <select value={form.taxType} onChange={(e) => setForm((p) => ({ ...p, taxType: e.target.value as TaxType }))} className="w-full border rounded-lg px-3 py-2">
                  <option value="taxable">과세</option>
                  <option value="tax_exempt">비과세</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">매입가</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatKrwInput(form.costPrice)}
                    onChange={(e) => setForm((p) => ({ ...p, costPrice: onlyDigits(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">선택 입력: 내부 원가 관리용입니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매가 <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatKrwInput(form.price)}
                    onChange={(e) => setForm((p) => ({ ...p, price: onlyDigits(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 pr-8"
                    placeholder="0"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수량 <span className="text-red-600">*</span>
                </label>
                <input type="number" min={0} value={form.stockQuantity} onChange={(e) => setForm((p) => ({ ...p, stockQuantity: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                <p className="text-xs text-gray-500 mt-1">0 입력 시 자동으로 품절 상태로 처리됩니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  금액 <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatKrwInput(form.amount)}
                    onChange={(e) => setForm((p) => ({ ...p, amount: onlyDigits(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 pr-8"
                    placeholder="0"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">규격</label>
                <input
                  value={form.spec}
                  onChange={(e) => setForm((p) => ({ ...p, spec: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="예: 40kg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">현재배송</label>
                <input
                  value={form.currentDelivery}
                  onChange={(e) => setForm((p) => ({ ...p, currentDelivery: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="예: 직배송"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">차후직배가능</label>
                <input
                  value={form.futureDelivery}
                  onChange={(e) => setForm((p) => ({ ...p, futureDelivery: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="예: 조율필요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1KG 단가</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatKrwInput(form.kgUnitPrice)}
                    readOnly
                    className="w-full border rounded-lg px-3 py-2 pr-8 bg-gray-50"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">단위/규격 기준 무게를 인식해 자동 계산됩니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유통기한</label>
                <input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">유통기한이 없으면 비워두세요.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입고일</label>
                <input
                  type="datetime-local"
                  value={form.stockedAt}
                  onChange={(e) => setForm((p) => ({ ...p, stockedAt: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">입고 이력이 없으면 비워둘 수 있습니다.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="w-full border rounded-lg px-3 py-2 min-h-20" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">일자 정보</label>
                <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600 leading-6">
                  <div>등록일 : {editingId ? formatDateTime(products.find((p) => p.id === editingId)?.created_at) : '-'}</div>
                  <div>수정일 : {editingId ? formatDateTime(products.find((p) => p.id === editingId)?.updated_at) : '-'}</div>
                  <div>입고일 : {editingId ? formatDateTime(products.find((p) => p.id === editingId)?.stocked_at) : '-'}</div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대표 이미지 URL
                </label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://... 또는 /uploads/..."
                  className="w-full border rounded-lg px-3 py-2"
                />
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">또는 로컬 파일 업로드</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      void onSelectLocalImage(e.target.files?.[0] || null);
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-green-700 text-white rounded-lg border border-green-800 hover:bg-green-800 transition"
                    >
                      파일 선택
                    </button>
                    <span className="text-sm text-gray-500 truncate">
                      {localImageName || '선택된 파일 없음'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  대표 이미지는 URL 또는 파일 업로드 중 하나만 입력하세요. 확장자(jpg/jpeg/png/webp/gif)와 MIME 타입이 서버에서 강제 검증됩니다.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  권장 규격: 4:3 비율, 1200x900px (최소 800x600px), 파일 용량 500KB~1MB 권장 (최대 6MB)
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  추가 이미지 URL (최대 4장)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {form.additionalImageUrls.map((url, index) => {
                    const upload = additionalImageUploads[index];
                    return (
                      <div key={index} className="rounded-lg border border-gray-200 p-3 space-y-2">
                        <input
                          value={url}
                          onChange={(e) =>
                            setForm((prev) => {
                              const next = [...prev.additionalImageUrls] as [string, string, string, string];
                              next[index] = e.target.value;
                              return { ...prev, additionalImageUrls: next };
                            })
                          }
                          placeholder={`추가 이미지 ${index + 1} URL`}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                        <input
                          ref={(el) => {
                            additionalFileInputRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => onSelectAdditionalLocalImage(index, e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => additionalFileInputRefs.current[index]?.click()}
                            className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm border border-gray-800 hover:bg-gray-800"
                          >
                            파일 선택
                          </button>
                          <span className="text-xs text-gray-500 truncate">
                            {upload?.originalName || '선택된 파일 없음'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  각 슬롯은 URL 또는 파일 중 하나만 사용하세요. 대표 1장 + 추가 4장 = 총 5장까지 등록됩니다.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                  노출(해제 시 비노출)
                </label>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-2">현재 상품 이미지 미리보기</p>
                {previewImageSrc ? (
                  <div className="space-y-3">
                    <div className="h-52 w-full rounded-lg border bg-[#F7F8F4] flex items-center justify-center overflow-hidden">
                      <img
                        src={previewImageSrc}
                        alt="대표 이미지 미리보기"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        previewImageSrc,
                        ...form.additionalImageUrls.map((url, idx) => {
                          const upload = additionalImageUploads[idx];
                          if (upload?.base64) {
                            return `data:${upload.mimeType || 'image/png'};base64,${upload.base64}`;
                          }
                          return url.trim() || null;
                        }),
                      ]
                        .filter((img): img is string => Boolean(img))
                        .slice(0, 5)
                        .map((img, idx) => (
                        <div key={`${img}-${idx}`} className="h-20 rounded-lg border bg-[#F7F8F4] flex items-center justify-center overflow-hidden">
                          <img src={img} alt={`상품 이미지 ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                        </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-52 w-full rounded-lg border bg-[#F7F8F4] flex items-center justify-center text-sm text-gray-500">
                    등록된 이미지가 없습니다.
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
                  취소
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800">
                  {editingId ? '수정 저장' : '상품 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
