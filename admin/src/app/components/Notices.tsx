import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type NoticeRow = {
  id: number;
  title: string;
  content: string;
  author: string | null;
  views: number;
  is_active: boolean;
  is_important: boolean;
  created_at: string;
  updated_at: string;
};

interface NoticesProps {
  token: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

export function Notices({ token }: NoticesProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [form, setForm] = useState({
    title: '',
    content: '',
    author: 'SANGOL ADMIN',
    isImportant: false,
    isActive: true,
  });

  const loadNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/notices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '공지사항 목록 조회 실패');
      setNotices(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '공지사항 목록 조회 중 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      content: '',
      author: 'SANGOL ADMIN',
      isImportant: false,
      isActive: true,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const plainText = form.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!plainText) {
      window.alert('공지 내용을 입력해 주세요.');
      return;
    }
    try {
      const isEdit = editingId !== null;
      const response = await fetch(
        isEdit ? `${apiBaseUrl}/admin/notices/${editingId}` : `${apiBaseUrl}/admin/notices`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: form.title,
            content: form.content,
            author: form.author,
            isImportant: form.isImportant,
            isActive: form.isActive,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '공지사항 저장 실패');
      window.alert(isEdit ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.');
      resetForm();
      await loadNotices();
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '공지사항 저장 중 오류');
    }
  };

  const startEdit = (notice: NoticeRow) => {
    setEditingId(notice.id);
    setForm({
      title: notice.title,
      content: notice.content,
      author: notice.author || 'SANGOL ADMIN',
      isImportant: notice.is_important,
      isActive: notice.is_active,
    });
  };

  const handleDelete = async (noticeId: number) => {
    const ok = window.confirm('이 공지사항을 비노출 처리할까요?');
    if (!ok) return;

    try {
      const response = await fetch(`${apiBaseUrl}/admin/notices/${noticeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '공지사항 삭제 실패');
      await loadNotices();
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : '공지사항 삭제 중 오류');
    }
  };

  const totalPages = Math.max(1, Math.ceil(notices.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedNotices = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return notices.slice(start, start + pageSize);
  }, [notices, safeCurrentPage, pageSize]);
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
      <h2 className="text-2xl font-bold text-gray-900">공지사항 관리</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">{editingId ? '공지 수정' : '공지 등록'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공지 제목 <span className="text-red-600">*</span></label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="공지 제목"
              className="border rounded-lg px-3 py-2 w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">사용자 화면에 표시될 제목 (권장 2~100자)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작성자</label>
            <input
              value={form.author}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="작성자"
              className="border rounded-lg px-3 py-2 w-full"
            />
            <p className="text-xs text-gray-500 mt-1">미입력 시 기본 작성자를 사용합니다.</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공지 내용 <span className="text-red-600">*</span></label>
          <RichTextEditor
            value={form.content}
            onChange={(next) => setForm((prev) => ({ ...prev, content: next }))}
            placeholder="공지 내용"
            minHeightClassName="min-h-44"
          />
          <p className="text-xs text-gray-500 mt-1">줄바꿈 포함 상세 내용을 입력하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isImportant}
              onChange={(e) => setForm((prev) => ({ ...prev, isImportant: e.target.checked }))}
            />
            중요 공지
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            프론트 노출
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition">
            {editingId ? '수정 저장' : '공지 등록'}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              취소
            </button>
          ) : null}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">공지사항을 불러오는 중...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
          <>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">번호</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">제목</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">작성자</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">노출</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">중요</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">등록일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedNotices.map((notice, index) => (
                <tr
                  key={notice.id}
                  className={`${index % 2 === 1 ? 'bg-lime-50' : 'bg-white'} hover:bg-lime-100 transition`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{notice.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {notice.is_important ? '[중요] ' : ''}
                    {notice.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{notice.author || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{notice.is_active ? '노출' : '비노출'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{notice.is_important ? '중요' : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{new Date(notice.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <button onClick={() => startEdit(notice)} className="text-green-700 hover:text-green-800 font-medium">
                        수정
                      </button>
                      <button onClick={() => handleDelete(notice.id)} className="text-red-600 hover:text-red-700 font-medium">
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedNotices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    등록된 공지사항이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              총 {notices.length}개 중 {(safeCurrentPage - 1) * pageSize + 1}-{Math.min(safeCurrentPage * pageSize, notices.length)}개 표시
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
