import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type FranchiseRow = {
  id: number;
  franchise_key?: string;
  member_link_key?: string;
  store_type: string;
  name: string;
  store_phone: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  address: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  linked_member_count?: number;
  linked_active_member_count?: number;
  linked_members?: Array<{
    id: number;
    email: string;
    name: string;
    isActive: boolean;
  }>;
};

interface FranchisesProps {
  token: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

export function Franchises({ token }: FranchisesProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [franchises, setFranchises] = useState<FranchiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [franchiseKeywordFilter, setFranchiseKeywordFilter] = useState("");
  const [form, setForm] = useState({
    storeType: '가맹점',
    name: '',
    storePhone: '',
    ownerName: '',
    ownerPhone: '',
    address: '',
    displayOrder: '0',
    isActive: true,
  });

  const authHeader = { Authorization: `Bearer ${token}` };

  const loadFranchises = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/location-franchises`, { headers: authHeader });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '가맹점 목록 조회 실패');
      setFranchises(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '가맹점 목록 조회 중 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFranchises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      storeType: '가맹점',
      name: '',
      storePhone: '',
      ownerName: '',
      ownerPhone: '',
      address: '',
      displayOrder: '0',
      isActive: true,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const startEdit = (item: FranchiseRow) => {
    setEditingId(item.id);
    setForm({
      storeType: item.store_type || '가맹점',
      name: item.name || '',
      storePhone: item.store_phone || '',
      ownerName: item.owner_name || '',
      ownerPhone: item.owner_phone || '',
      address: item.address || '',
      displayOrder: String(item.display_order ?? 0),
      isActive: item.is_active,
    });
    setIsModalOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = editingId !== null;
      const payload = {
        storeType: form.storeType.trim(),
        name: form.name.trim(),
        storePhone: form.storePhone.trim() || null,
        ownerName: form.ownerName.trim() || null,
        ownerPhone: form.ownerPhone.trim() || null,
        address: form.address.trim(),
        displayOrder: Number(form.displayOrder || 0),
        isActive: form.isActive,
      };
      const response = await fetch(
        isEdit ? `${apiBaseUrl}/admin/location-franchises/${editingId}` : `${apiBaseUrl}/admin/location-franchises`,
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
      if (!response.ok) throw new Error(data?.error || '가맹점 저장 실패');
      window.alert(isEdit ? '가맹점이 수정되었습니다.' : '가맹점이 등록되었습니다.');
      closeModal();
      await loadFranchises();
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '가맹점 저장 중 오류');
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('이 가맹점을 비노출 처리할까요?')) return;
    try {
      const response = await fetch(`${apiBaseUrl}/admin/location-franchises/${id}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '가맹점 삭제 실패');
      await loadFranchises();
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : '가맹점 삭제 중 오류');
    }
  };

  const filteredFranchises = useMemo(() => {
    const keyword = franchiseKeywordFilter.trim().toLowerCase();
    if (!keyword) return franchises;
    return franchises.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        (row.store_type || '').toLowerCase().includes(keyword) ||
        (row.address || '').toLowerCase().includes(keyword) ||
        (row.owner_name || '').toLowerCase().includes(keyword)
    );
  }, [franchises, franchiseKeywordFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFranchises.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredFranchises.slice(start, start + pageSize);
  }, [filteredFranchises, pageSize, safeCurrentPage]);
  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, safeCurrentPage - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safeCurrentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">가맹점 관리</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
        >
          가맹점 등록
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="p-6 text-sm text-gray-500">가맹점 목록을 불러오는 중...</div> : null}
        {error ? <div className="p-6 text-sm text-red-600">{error}</div> : null}
        {!loading && !error ? (
          <>
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                가맹점 {filteredFranchises.length}개
                {franchiseKeywordFilter.trim() ? ` (검색: ${franchiseKeywordFilter.trim()})` : ""}
              </p>
              <input
                type="text"
                value={franchiseKeywordFilter}
                onChange={(e) => {
                  setFranchiseKeywordFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="매장명/주소/대표자 검색"
                className="w-48 border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">매장구분</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">매장명</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">매장전화</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">대표자</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">대표자전화</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">주소</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">연결 회원</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">노출</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagedRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`${index % 2 === 1 ? 'bg-lime-50' : 'bg-white'} hover:bg-lime-100 transition`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">{row.store_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.store_phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.owner_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.owner_phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[280px] truncate">{row.address}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <p className="font-medium">
                          활성 {Number(row.linked_active_member_count || 0)}명 / 전체 {Number(row.linked_member_count || 0)}명
                        </p>
                        {Array.isArray(row.linked_members) && row.linked_members.length > 0 ? (
                          <p className="text-xs text-gray-500 truncate max-w-[220px]">
                            {row.linked_members.map((member) => member.name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">연결된 회원 없음</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.is_active ? '노출' : '비노출'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 text-sm">
                          <button onClick={() => startEdit(row)} className="text-green-700 hover:text-green-800 font-medium">
                            수정
                          </button>
                          <button onClick={() => remove(row.id)} className="text-red-600 hover:text-red-700 font-medium">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                        등록된 가맹점이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                총 {filteredFranchises.length}개 중{" "}
                {filteredFranchises.length === 0
                  ? "0-0"
                  : `${(safeCurrentPage - 1) * pageSize + 1}-${Math.min(safeCurrentPage * pageSize, filteredFranchises.length)}`}개 표시
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
          </>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{editingId === null ? '가맹점 등록' : '가맹점 수정'}</h3>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-800">
                닫기
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    매장구분 (직영점/가맹점) <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={form.storeType}
                    onChange={(e) => setForm((prev) => ({ ...prev, storeType: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">예: 직영점, 가맹점</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    매장명 <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">가맹점 목록에 표시되는 명칭</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장 전화번호</label>
                  <input
                    value={form.storePhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, storePhone: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">선택 입력 (예: 02-1234-5678)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대표자</label>
                  <input
                    value={form.ownerName}
                    onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대표자 전화번호</label>
                  <input
                    value={form.ownerPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, ownerPhone: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">정렬순서</label>
                  <input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">숫자가 작을수록 먼저 노출됩니다.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소 <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="border rounded-lg px-3 py-2 w-full min-h-24"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">배송/문의에 사용되는 상세 주소를 입력하세요.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                프론트 노출
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                  취소
                </button>
                <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition">
                  {editingId === null ? '가맹점 등록' : '수정 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
