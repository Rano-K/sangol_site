import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { API_BASE_URL } from '../lib/apiBaseUrl';
import { getPlainTextFromHtml, sanitizeRichHtml } from '../lib/sanitizeHtml';

type FaqItem = {
  id: number;
  category: string;
  q: string;
  a: string;
};

type SupportPage = {
  title: string | null;
  sections: Record<string, unknown>;
  seo: Record<string, unknown>;
  published: boolean;
};

interface FaqManagerProps {
  token: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

const DEFAULT_SUPPORT_SECTIONS: Record<string, unknown> = {
  header: {
    title: '고객센터',
    subtitle: '무엇을 도와드릴까요? 산골의 고객센터입니다.',
  },
  consult: {
    phone: '1522-4680',
    weekday: '09:00 - 18:00',
    lunch: '12:00 - 13:00',
    closed: '주말 및 공휴일 휴무',
  },
  privacyText:
    '1. 수집하는 개인정보 항목: 이름, 연락처, 이메일\n2. 수집 및 이용 목적: 문의 내역 확인 및 답변 처리, 처리 내역 안내\n3. 보유 및 이용 기간: 문의 처리 완료 후 3년간 보관',
  faqs: [],
};

export function FaqManager({ token }: FaqManagerProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [supportPage, setSupportPage] = useState<SupportPage | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [form, setForm] = useState<FaqItem>({ id: 0, category: '일반', q: '', a: '' });

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadSupportPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/content/admin/pages/support`, { headers: authHeaders });
      const data = await response.json();
      if (response.status === 404) {
        const initial: SupportPage = {
          title: '고객센터',
          sections: DEFAULT_SUPPORT_SECTIONS,
          seo: {},
          published: true,
        };
        setSupportPage(initial);
        setFaqs([]);
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'FAQ 페이지 조회 실패');
      const sections = (data.sections ?? {}) as Record<string, unknown>;
      const nextFaqs = Array.isArray(sections.faqs) ? (sections.faqs as FaqItem[]) : [];
      setSupportPage({
        title: data.title ?? '고객센터',
        sections,
        seo: (data.seo ?? {}) as Record<string, unknown>,
        published: Boolean(data.published),
      });
      setFaqs(nextFaqs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'FAQ 페이지 조회 중 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveFaqs = async (nextFaqs: FaqItem[]) => {
    if (!supportPage) return;
    const nextSections = { ...supportPage.sections, faqs: nextFaqs };

    const response = await fetch(`${apiBaseUrl}/content/admin/pages/support`, {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: supportPage.title ?? '고객센터',
        sections: nextSections,
        seo: supportPage.seo ?? {},
        published: supportPage.published ?? true,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'FAQ 저장 실패');
    }
    setSupportPage({
      title: data?.page?.title ?? supportPage.title,
      sections: (data?.page?.sections ?? nextSections) as Record<string, unknown>,
      seo: (data?.page?.seo ?? supportPage.seo) as Record<string, unknown>,
      published: Boolean(data?.page?.published ?? supportPage.published),
    });
    setFaqs(nextFaqs);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ id: 0, category: '일반', q: '', a: '' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supportPage) return;
    try {
      const sanitizedAnswer = sanitizeRichHtml(form.a);
      const answerPlainText = getPlainTextFromHtml(sanitizedAnswer);
      const trimmed = {
        ...form,
        category: form.category.trim(),
        q: form.q.trim(),
        a: sanitizedAnswer,
      };
      if (!trimmed.category || !trimmed.q || !answerPlainText) {
        window.alert('카테고리, 질문, 답변을 입력해 주세요.');
        return;
      }

      const nextFaqs =
        editingId === null
          ? [...faqs, { ...trimmed, id: Date.now() }]
          : faqs.map((item) => (item.id === editingId ? { ...item, ...trimmed } : item));

      await saveFaqs(nextFaqs);
      window.alert(editingId === null ? 'FAQ가 등록되었습니다.' : 'FAQ가 수정되었습니다.');
      resetForm();
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'FAQ 저장 중 오류');
    }
  };

  const startEdit = (item: FaqItem) => {
    setEditingId(item.id);
    setForm({ ...item, a: sanitizeRichHtml(item.a) });
  };

  const removeFaq = async (id: number) => {
    const ok = window.confirm('이 FAQ를 삭제할까요?');
    if (!ok) return;
    try {
      const nextFaqs = faqs.filter((item) => item.id !== id);
      await saveFaqs(nextFaqs);
      if (editingId === id) resetForm();
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : 'FAQ 삭제 중 오류');
    }
  };

  const totalPages = Math.max(1, Math.ceil(faqs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedFaqs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return faqs.slice(start, start + pageSize);
  }, [faqs, safeCurrentPage, pageSize]);
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
      <h2 className="text-2xl font-bold text-gray-900">자주 묻는 질문(FAQ) 관리</h2>

      {loading ? <div className="text-sm text-gray-500">FAQ 데이터를 불러오는 중...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">{editingId === null ? 'FAQ 등록' : 'FAQ 수정'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 <span className="text-red-600">*</span></label>
            <input
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="카테고리 (예: 상품, 배송, 주문)"
              className="border rounded-lg px-3 py-2 w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">FAQ 필터 탭 이름으로 사용됩니다.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">질문 <span className="text-red-600">*</span></label>
            <input
              value={form.q}
              onChange={(e) => setForm((prev) => ({ ...prev, q: e.target.value }))}
              placeholder="질문"
              className="border rounded-lg px-3 py-2 w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">사용자가 목록에서 보게 되는 질문 문구</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">답변 <span className="text-red-600">*</span></label>
          <RichTextEditor
            value={form.a}
            onChange={(next) => setForm((prev) => ({ ...prev, a: next }))}
            placeholder="답변"
            minHeightClassName="min-h-32"
          />
          <p className="text-xs text-gray-500 mt-1">상세 답변을 입력하세요. 줄바꿈 가능합니다.</p>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition">
            {editingId === null ? 'FAQ 등록' : 'FAQ 수정'}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              취소
            </button>
          ) : null}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">번호</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">카테고리</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">질문</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">답변</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pagedFaqs.map((item, idx) => (
              <tr
                key={item.id}
                className={`${idx % 2 === 1 ? 'bg-lime-50' : 'bg-white'} hover:bg-lime-100 transition`}
              >
                <td className="px-6 py-4 text-sm text-gray-700">{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.category}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.q}</td>
                <td className="px-6 py-4 text-sm text-gray-700 max-w-[420px] truncate">{item.a}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => startEdit(item)} className="text-green-700 hover:text-green-800 font-medium">
                      수정
                    </button>
                    <button onClick={() => removeFaq(item.id)} className="text-red-600 hover:text-red-700 font-medium">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pagedFaqs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                  등록된 FAQ가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            총 {faqs.length}개 중 {(safeCurrentPage - 1) * pageSize + 1}-{Math.min(safeCurrentPage * pageSize, faqs.length)}개 표시
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
      </div>
    </div>
  );
}
