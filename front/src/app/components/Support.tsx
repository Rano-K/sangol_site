import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import { Search, ChevronDown, ChevronUp, Check, MessageSquare, HelpCircle, Bell } from "lucide-react";
import { useCmsPage } from "../hooks/useCmsPage";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type NoticeRow = { id: number; title: string; content: string; is_important: boolean; created_at: string };
type FaqRow = { id: number; category: string; q: string; a: string };

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toSafeNoticeHtml = (content: string): string => {
  const raw = String(content || "");
  const hasHtmlTag = /<[^>]+>/.test(raw);
  if (!hasHtmlTag) {
    return escapeHtml(raw).replace(/\n/g, "<br />");
  }
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
};

function NoticeList({ notices }: { notices: NoticeRow[] }) {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [openNoticeId, setOpenNoticeId] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(notices.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedNotices = notices.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
    setOpenNoticeId(null);
  }, [notices.length]);

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-[#1A4D2E] pb-4">공지사항</h2>
      <div className="flex flex-col">
        {pagedNotices.map((notice) => {
          const isOpen = openNoticeId === notice.id;
          return (
          <div key={notice.id} className="border-b border-gray-100 -mx-4">
            <button
              type="button"
              onClick={() => setOpenNoticeId(isOpen ? null : notice.id)}
              className="group w-full py-5 px-4 flex items-center gap-4 hover:bg-[#FAFAF7] rounded-xl transition-colors text-left"
            >
              <div className="flex-shrink-0 w-16">
                {notice.is_important ? (
                  <span className="bg-[#1A4D2E] text-white text-xs font-bold px-3 py-1.5 rounded-full block text-center shadow-sm">
                    공지
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full block text-center">
                    일반
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-[15px] group-hover:text-[#1A4D2E] transition-colors truncate ${notice.is_important ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {notice.title}
                </h3>
              </div>
              <div className="text-sm text-gray-400 font-medium shrink-0">
                {new Date(notice.created_at).toLocaleDateString()}
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isOpen ? 'bg-[#1A4D2E] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-[#E8DFCA] group-hover:text-[#1A4D2E]'}`}>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 pb-4 px-4' : 'max-h-0 opacity-0 px-4'}`}>
              <div
                className="rounded-xl border border-[#E8DFCA] bg-[#FAFAF7] p-4 text-sm text-gray-700 leading-relaxed [&_blockquote]:border-l-4 [&_blockquote]:border-[#1A4D2E]/30 [&_blockquote]:pl-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{
                  __html: notice.content?.trim() ? toSafeNoticeHtml(notice.content) : "공지 내용이 없습니다.",
                }}
              >
              </div>
            </div>
          </div>
          );
        })}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-colors ${
                page === currentPage
                  ? "border-[#1A4D2E] bg-[#1A4D2E] font-bold text-white shadow-sm"
                  : "border-gray-200 font-medium text-gray-500 hover:border-[#1A4D2E] hover:text-[#1A4D2E]"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InquiryForm({ privacyText }: { privacyText: string }) {
  const [agreed, setAgreed] = useState(false);
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "title" | "content", string>>>({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    inquiryType: "general",
    title: "",
    content: "",
  });

  const validateForm = () => {
    const nextErrors: Partial<Record<"name" | "phone" | "email" | "title" | "content", string>> = {};
    const nameRegex = /^[가-힣a-zA-Z\s]{2,20}$/;
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nameRegex.test(form.name.trim())) {
      nextErrors.name = "이름 형식: 한글/영문 2~20자 (예: 홍길동, Hong Gildong)";
    }
    if (!phoneRegex.test(form.phone.trim())) {
      nextErrors.phone = "연락처 형식: 010-1234-5678 또는 01012345678";
    }
    if (!emailRegex.test(form.email.trim())) {
      nextErrors.email = "이메일 형식: example@email.com";
    }
    if (form.title.trim().length < 2 || form.title.trim().length > 100) {
      nextErrors.title = "제목 형식: 2~100자";
    }
    if (form.content.trim().length < 10) {
      nextErrors.content = "내용 형식: 10자 이상 작성";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toastMessage]);

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">온라인 문의</h2>
      <p className="text-gray-500 mb-8 pb-4 border-b-2 border-[#1A4D2E]">무엇을 도와드릴까요? 궁금하신 점을 남겨주시면 빠르게 답변해 드리겠습니다.</p>
      
      <form className="space-y-6" onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        if (!agreed) return;
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
          const normalizedPhone = form.phone.replace(/[^0-9]/g, "").replace(
            /^(\d{3})(\d{3,4})(\d{4})$/,
            "$1-$2-$3"
          );
          const response = await fetch(`${apiBaseUrl}/inquiries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: normalizedPhone,
              email: form.email.trim(),
              subject: `[${form.inquiryType}] ${form.title.trim()}`,
              message: form.content.trim(),
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            const validationMessage =
              Array.isArray(data?.errors) && data.errors.length > 0
                ? String(data.errors[0]?.msg || "문의 접수 실패")
                : data?.error || "문의 접수 실패";
            setToastVariant("error");
            setToastMessage(validationMessage);
            setToastVisible(true);
            return;
          }
          setToastVariant("success");
          setToastMessage("문의가 성공적으로 접수되었습니다.");
          setToastVisible(true);
          setErrors({});
          setForm({ name: "", phone: "", email: "", inquiryType: "general", title: "", content: "" });
          setAgreed(false);
        } finally {
          setIsSubmitting(false);
        }
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700 ml-1">
              이름 <span className="text-red-600">* 필수</span>
            </label>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} type="text" placeholder="홍길동" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all placeholder:text-gray-400" required />
            <p className="text-xs text-gray-500">예: 홍길동 / Hong Gildong</p>
            {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
          </div>
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700 ml-1">
              연락처 <span className="text-red-600">* 필수</span>
            </label>
            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} type="tel" placeholder="010-1234-5678" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all placeholder:text-gray-400" required />
            <p className="text-xs text-gray-500">예: 010-1234-5678 또는 01012345678</p>
            {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700 ml-1">
              이메일 <span className="text-red-600">* 필수</span>
            </label>
            <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} type="text" inputMode="email" placeholder="example@email.com" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all placeholder:text-gray-400" required />
            <p className="text-xs text-gray-500">형식: 아이디@도메인 (예: hello@sangol.com)</p>
            {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
          </div>
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700 ml-1">
              문의 유형 <span className="text-red-600">* 필수</span>
            </label>
            <div className="relative">
              <select value={form.inquiryType} onChange={(e) => setForm((prev) => ({ ...prev, inquiryType: e.target.value }))} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all appearance-none text-gray-700 font-medium" required>
                <option value="general">일반 문의</option>
                <option value="b2b">가맹점(B2B) 문의</option>
                <option value="product">상품 문의</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500">문의 분류를 선택하면 더 빠른 답변이 가능합니다.</p>
          </div>
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-bold text-gray-700 ml-1">
            제목 <span className="text-red-600">* 필수</span>
          </label>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} type="text" placeholder="문의 제목을 입력해주세요" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all placeholder:text-gray-400" required />
          <p className="text-xs text-gray-500">형식: 2~100자</p>
          {errors.title ? <p className="text-xs text-red-600">{errors.title}</p> : null}
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-bold text-gray-700 ml-1">
            내용 <span className="text-red-600">* 필수</span>
          </label>
          <textarea value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} rows={6} placeholder="문의하실 내용을 상세히 적어주세요." className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all resize-none placeholder:text-gray-400 leading-relaxed" required />
          <p className="text-xs text-gray-500">형식: 최소 10자 이상</p>
          {errors.content ? <p className="text-xs text-red-600">{errors.content}</p> : null}
        </div>

        {/* Privacy Policy */}
        <div className="space-y-3 pt-4 border-t border-gray-100 mt-8">
          <label className="text-sm font-bold text-gray-800 ml-1">
            개인정보 수집 및 이용 동의 <span className="text-red-600">* 필수</span>
          </label>
          <div className="h-32 overflow-y-auto p-5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-500 leading-relaxed custom-scrollbar">
            {privacyText.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br />
              </span>
            ))}
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-4 group w-fit">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${agreed ? 'bg-[#1A4D2E] border-[#1A4D2E]' : 'bg-white border-gray-300 group-hover:border-[#1A4D2E]'}`}>
              {agreed && <Check className="w-4 h-4 text-white stroke-[3]" />}
            </div>
            <input type="checkbox" className="hidden" checked={agreed} onChange={() => setAgreed(!agreed)} />
            <span className="text-sm font-bold text-gray-700 group-hover:text-[#1A4D2E] transition-colors select-none">개인정보 수집 및 이용에 동의합니다. (필수)</span>
          </label>
        </div>

        <div className="pt-6">
          <button 
            type="submit" 
            className="w-full py-4 bg-[#1A4D2E] hover:bg-[#123A21] text-white font-bold rounded-xl text-lg shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed" 
            disabled={!agreed || isSubmitting}
          >
            {isSubmitting ? "접수 중..." : "문의 접수하기"}
          </button>
        </div>
      </form>

      {toastVisible && toastMessage ? (
        <div className="fixed bottom-6 right-6 z-[70] transition-opacity duration-200">
          <div
            className={`max-w-sm rounded-xl border px-4 py-3 shadow-xl backdrop-blur bg-white/95 ${
              toastVariant === "error" ? "border-red-200" : "border-[#DDE7D4]"
            }`}
          >
            <p className={`text-sm font-medium ${toastVariant === "error" ? "text-red-700" : "text-[#1A4D2E]"}`}>
              {toastMessage}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FaqList({ faqs }: { faqs: FaqRow[] }) {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const categories = ["전체", ...Array.from(new Set(faqs.map((faq) => faq.category)))];

  const filteredFaqs = faqs.filter(faq => {
    const matchCategory = activeCategory === "전체" || faq.category === activeCategory;
    const matchSearch = faq.q.includes(searchQuery) || faq.a.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-[#1A4D2E] pb-4">자주 묻는 질문</h2>
      
      {/* Search Bar */}
      <div className="relative mb-8 group">
        <input 
          type="text" 
          placeholder="궁금하신 내용을 검색해보세요" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-4 py-4 bg-[#FAFAF7] border border-[#E8DFCA] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] outline-none transition-all text-[15px] font-medium placeholder-gray-400 shadow-sm"
        />
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#1A4D2E] transition-colors" />
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setOpenId(null); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              activeCategory === cat 
                ? "bg-[#4F6F52] text-white shadow-md ring-2 ring-[#4F6F52] ring-offset-2 ring-offset-white" 
                : "bg-white text-gray-500 border border-gray-200 hover:border-[#4F6F52] hover:text-[#4F6F52]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      <div className="border-t border-gray-200">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map(faq => (
            <div key={faq.id} className="border-b border-gray-200">
              <button 
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full text-left py-6 px-2 flex items-center justify-between hover:bg-[#FAFAF7] transition-colors focus:outline-none group rounded-xl my-1"
              >
                <div className="flex items-center gap-4 pr-4">
                  <span className="text-[#1A4D2E] font-extrabold text-2xl w-8 text-center">Q</span>
                  <div>
                    <span className="text-[11px] font-bold text-white bg-[#4F6F52]/80 px-2 py-0.5 rounded-md mb-2 inline-block shadow-sm tracking-wide">{faq.category}</span>
                    <span className="text-[16px] block font-bold text-gray-800 group-hover:text-[#1A4D2E] transition-colors leading-snug">{faq.q}</span>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${openId === faq.id ? 'bg-[#1A4D2E] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-[#E8DFCA] group-hover:text-[#1A4D2E]'}`}>
                  {openId === faq.id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openId === faq.id ? "max-h-[500px] opacity-100 mb-4" : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-6 bg-[#FAFAF7] rounded-xl flex items-start gap-4 mx-2 border border-[#E8DFCA] shadow-inner">
                  <span className="text-[#4F6F52] font-extrabold text-2xl w-8 text-center mt-0.5">A</span>
                  <p className="text-gray-700 leading-relaxed text-[15px] pt-1.5 font-medium">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
            <HelpCircle className="w-12 h-12 opacity-20" />
            <p className="font-medium text-gray-500">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Support() {
  const { tab } = useParams();
  const activeTab = tab || "notice";
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const { data } = useCmsPage("support");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, string>;
  const consult = (sections.consult ?? {}) as Record<string, string>;
  const privacyText =
    String(sections.privacyText || "") ||
    "1. 수집하는 개인정보 항목: 이름, 연락처, 이메일\n2. 수집 및 이용 목적: 문의 내역 확인 및 답변 처리, 처리 내역 안내\n3. 보유 및 이용 기간: 문의 처리 완료 후 3년간 보관\n* 귀하는 개인정보 수집 및 이용에 거부할 권리가 있으나, 거부 시 문의 접수 및 답변이 제한될 수 있습니다.";
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const faqs =
    Array.isArray(sections.faqs) && sections.faqs.length > 0
      ? (sections.faqs as FaqRow[])
      : [];

  useEffect(() => {
    const run = async () => {
      const response = await fetch(`${apiBaseUrl}/notices`);
      const payload = await response.json();
      if (response.ok) setNotices(payload);
    };
    run();
  }, [apiBaseUrl]);

  return (
    <div className="flex-1 bg-[#FAFAF7] flex flex-col min-h-screen">
       {/* Header Banner */}
      <div className="bg-[#1A4D2E] text-white py-16 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay"
          style={{
            backgroundImage: header.bannerImage ? `url('${header.bannerImage}')` : 'none',
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{header.title || "고객센터"}</h1>
          <p className="text-[#E8DFCA] text-lg font-medium">{header.subtitle || "무엇을 도와드릴까요? 산골의 고객센터입니다."}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 w-full flex-1 flex flex-col md:flex-row gap-10">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-72 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8DFCA] overflow-hidden sticky top-28 z-10">
            <div className="p-6 bg-[#4F6F52] text-white">
              <h2 className="text-xl font-bold">고객지원</h2>
            </div>
            <nav className="flex flex-col py-2">
              <Link 
                to="/support/notice"
                className={`px-6 py-4 flex items-center gap-3 text-[15px] font-bold transition-all border-l-4 ${activeTab === 'notice' ? 'text-[#1A4D2E] bg-[#FAFAF7] border-[#1A4D2E]' : 'text-gray-500 hover:bg-gray-50 border-transparent hover:text-gray-800'}`}
              >
                <Bell className={`w-5 h-5 ${activeTab === 'notice' ? 'text-[#1A4D2E]' : 'text-gray-400'}`} />
                공지사항
              </Link>
              <Link 
                to="/support/inquiry"
                className={`px-6 py-4 flex items-center gap-3 text-[15px] font-bold transition-all border-l-4 ${activeTab === 'inquiry' ? 'text-[#1A4D2E] bg-[#FAFAF7] border-[#1A4D2E]' : 'text-gray-500 hover:bg-gray-50 border-transparent hover:text-gray-800'}`}
              >
                <MessageSquare className={`w-5 h-5 ${activeTab === 'inquiry' ? 'text-[#1A4D2E]' : 'text-gray-400'}`} />
                온라인 문의
              </Link>
              <Link 
                to="/support/faq"
                className={`px-6 py-4 flex items-center gap-3 text-[15px] font-bold transition-all border-l-4 ${activeTab === 'faq' ? 'text-[#1A4D2E] bg-[#FAFAF7] border-[#1A4D2E]' : 'text-gray-500 hover:bg-gray-50 border-transparent hover:text-gray-800'}`}
              >
                <HelpCircle className={`w-5 h-5 ${activeTab === 'faq' ? 'text-[#1A4D2E]' : 'text-gray-400'}`} />
                자주 묻는 질문 (FAQ)
              </Link>
            </nav>
          </div>
          
          <div className="bg-[#F0F2EB] rounded-2xl p-6 border border-[#D5DCCC] shadow-sm sticky top-[420px]">
            <h3 className="text-[#1A4D2E] font-bold mb-2 text-sm">고객센터 상담시간</h3>
            <p className="text-3xl font-extrabold text-gray-800 mb-3 tracking-tight">{consult.phone || "-"}</p>
            <div className="text-sm text-gray-600 space-y-1.5 font-medium">
              <p className="flex justify-between"><span>평일</span> <span className="text-gray-800 font-bold">{consult.weekday || "09:00 - 18:00"}</span></p>
              <p className="flex justify-between"><span>점심</span> <span className="text-gray-800 font-bold">{consult.lunch || "12:00 - 13:00"}</span></p>
              <p className="text-[#1A4D2E] pt-2 border-t border-[#D5DCCC] mt-2 font-bold">{consult.closed || "주말 및 공휴일 휴무"}</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-white rounded-2xl shadow-sm border border-[#E8DFCA] p-8 md:p-12 min-h-[600px]">
          {activeTab === 'notice' && <NoticeList notices={notices} />}
          {activeTab === 'inquiry' && <InquiryForm privacyText={privacyText} />}
          {activeTab === 'faq' && <FaqList faqs={faqs} />}
        </main>
      </div>
    </div>
  );
}