import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type InquiryStatus = 'pending' | 'answered';

type InquiryRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  created_at: string;
  status: InquiryStatus;
};

const STATUS_DISPLAY: Record<InquiryStatus, { className: string; label: string }> = {
  pending: { className: 'bg-yellow-100 text-yellow-700', label: '대기' },
  answered: { className: 'bg-green-100 text-green-700', label: '답변완료' },
};

interface InquiriesProps {
  token: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

export function Inquiries({ token }: InquiriesProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const loadInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/inquiries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '문의 목록 조회 실패');
      setInquiries(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '문의 목록 조회 중 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: number, status: InquiryStatus) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/inquiries/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '상태 업데이트 실패');
      await loadInquiries();
    } catch (updateError) {
      window.alert(updateError instanceof Error ? updateError.message : '상태 업데이트 중 오류');
    }
  };

  const getStatusBadge = (status: InquiryStatus) => {
    const { className, label } = STATUS_DISPLAY[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(inquiries.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedInquiries = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return inquiries.slice(start, start + pageSize);
  }, [inquiries, safeCurrentPage, pageSize]);
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
      <h2 className="text-2xl font-bold text-gray-900">문의 관리</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">문의 목록을 불러오는 중...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
        <>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">번호</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">이름</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">이메일</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">연락처</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">제목</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">내용</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">문의일</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">상태</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pagedInquiries.map((inquiry, index) => (
              <tr
                key={inquiry.id}
                className={`${index % 2 === 1 ? 'bg-lime-50' : 'bg-white'} hover:bg-lime-100 transition`}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">#{inquiry.id}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{inquiry.name}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{inquiry.email}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{inquiry.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{inquiry.subject}</td>
                <td className="px-6 py-4 text-sm text-gray-700 max-w-[320px] truncate">{inquiry.message}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{new Date(inquiry.created_at).toLocaleString()}</td>
                <td className="px-6 py-4">{getStatusBadge(inquiry.status)}</td>
                <td className="px-6 py-4">
                  <button
                    className="text-sm text-green-700 hover:text-green-800 font-medium"
                    onClick={() => updateStatus(inquiry.id, inquiry.status === 'pending' ? 'answered' : 'pending')}
                  >
                    {inquiry.status === 'pending' ? '답변완료 처리' : '대기 전환'}
                  </button>
                </td>
              </tr>
            ))}
            {pagedInquiries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                  등록된 문의가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              총 {inquiries.length}개 중 {(safeCurrentPage - 1) * pageSize + 1}-{Math.min(safeCurrentPage * pageSize, inquiries.length)}개 표시
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
        )}
      </div>
    </div>
  );
}
