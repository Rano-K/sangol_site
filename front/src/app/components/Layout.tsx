import React, { FormEvent, useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router";
import { Menu, Phone, Search, User } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { CMS_IMAGE_FALLBACK } from "../lib/cmsImageFallback";
import { useAuth } from "../hooks/useAuth";
import { GnbMenus } from "./GnbMenus";

const KOREAN_UNICODE_RANGE = "U+1100-11FF, U+3130-318F, U+AC00-D7AF";
const LATIN_UNICODE_RANGE = "U+0000-00FF, U+0100-024F";
const DEFAULT_FONT_STACK = "'Noto Sans KR', 'Malgun Gothic', sans-serif";

function resolveGlobalTypography(typography: Record<string, unknown>) {
  const mediaId = Number(typography.fontMediaId ?? typography.bodyFontMediaId ?? typography.headingFontMediaId ?? 0);
  const mediaIdEn = Number(
    typography.fontMediaIdEn ?? typography.bodyFontMediaIdEn ?? typography.headingFontMediaIdEn ?? 0
  );
  const familyNameRaw = String(
    typography.fontFamilyName ?? typography.bodyFontFamilyName ?? typography.headingFontFamilyName ?? ""
  ).trim();
  const familyNameEnRaw = String(
    typography.fontFamilyNameEn ??
      typography.bodyFontFamilyNameEn ??
      typography.headingFontFamilyNameEn ??
      ""
  ).trim();

  const familyName =
    familyNameRaw || (Number.isFinite(mediaId) && mediaId > 0 ? `SangolGlobal${mediaId}` : "");
  const familyNameEn =
    familyNameEnRaw ||
    (Number.isFinite(mediaIdEn) && mediaIdEn > 0 ? `SangolGlobalEn${mediaIdEn}` : familyName);
  const fontUrl = getCmsMediaFileUrl(Number.isFinite(mediaId) && mediaId > 0 ? mediaId : null);
  const fontUrlEn = getCmsMediaFileUrl(Number.isFinite(mediaIdEn) && mediaIdEn > 0 ? mediaIdEn : null);

  return { familyName, familyNameEn, fontUrl, fontUrlEn };
}

export function Layout() {
  const navigate = useNavigate();
  const { data } = useCmsPage("site-layout");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const topMenu = (sections.topMenu ?? {}) as Record<string, string>;
  const footer = (sections.footer ?? {}) as Record<string, string>;
  const logo = (sections.logo ?? {}) as Record<string, string>;
  const headerLogoMediaId = Number(logo.headerLogoMediaId);
  const footerLogoMediaId = Number(logo.footerLogoMediaId);
  const headerLogo =
    getCmsMediaFileUrl(Number.isFinite(headerLogoMediaId) && headerLogoMediaId > 0 ? headerLogoMediaId : null) ||
    CMS_IMAGE_FALLBACK;
  const footerLogo =
    getCmsMediaFileUrl(Number.isFinite(footerLogoMediaId) && footerLogoMediaId > 0 ? footerLogoMediaId : null) ||
    CMS_IMAGE_FALLBACK;
  const topNotice = String(topMenu.noticeText ?? "").trim();
  const { user, isAuthenticated, logout } = useAuth();
  const isFranchiseUser = user?.role === "franchise";
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const typography = (sections.typography ?? {}) as Record<string, unknown>;
    const enabled = typography.enabled !== false;
    const { familyName, familyNameEn, fontUrl, fontUrlEn } = resolveGlobalTypography(typography);

    const styleId = "cms-global-font-face";
    const prev = document.getElementById(styleId);
    if (prev?.parentNode) prev.parentNode.removeChild(prev);

    const globalFamilyValue = enabled
      ? familyName
        ? `'${familyName}', ${DEFAULT_FONT_STACK}`
        : DEFAULT_FONT_STACK
      : DEFAULT_FONT_STACK;

    document.documentElement.style.setProperty("--cms-front-font-family", globalFamilyValue);
    document.documentElement.style.setProperty("--cms-front-font-body-family", globalFamilyValue);
    document.documentElement.style.setProperty("--cms-front-font-heading-family", globalFamilyValue);

    const blocks: string[] = [];
    if (enabled && familyName && fontUrl) {
      blocks.push(`
        @font-face {
          font-family: '${familyName}';
          src: url('${fontUrl}') format('woff2'),
               url('${fontUrl}') format('woff'),
               url('${fontUrl}') format('truetype'),
               url('${fontUrl}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${KOREAN_UNICODE_RANGE};
        }
      `);
    }
    if (enabled && familyNameEn && fontUrlEn) {
      blocks.push(`
        @font-face {
          font-family: '${familyName}';
          src: url('${fontUrlEn}') format('woff2'),
               url('${fontUrlEn}') format('woff'),
               url('${fontUrlEn}') format('truetype'),
               url('${fontUrlEn}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${LATIN_UNICODE_RANGE};
        }
      `);
    }
    if (blocks.length === 0) return;

    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = blocks.join("\n");
    document.head.appendChild(styleEl);

    return () => {
      const current = document.getElementById(styleId);
      if (current?.parentNode) current.parentNode.removeChild(current);
    };
  }, [sections.typography]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const keyword = searchKeyword.trim();
    if (!keyword) {
      navigate("/products");
      return;
    }
    navigate(`/products?q=${encodeURIComponent(keyword)}`);
    setIsMobileSearchOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-slate-800 font-sans flex flex-col">
      {/* Top Utility Nav */}
      <div className="bg-gradient-to-r from-[#1A4D2E] to-[#2d5016] text-[#E8DFCA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 grid grid-cols-1 md:grid-cols-3 gap-1 items-center text-[11px] sm:text-xs">
          <div className="hidden md:flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            <span>{footer.csPhone ? `고객센터 ${footer.csPhone}` : "고객센터"}</span>
          </div>
          {topNotice ? (
            <p className="text-center font-medium text-[#F7F3E7]">{topNotice}</p>
          ) : (
            <div className="hidden md:block" aria-hidden />
          )}
          <div className="flex justify-center md:justify-end items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-[#F5F2E4] whitespace-nowrap">{user?.name || "사용자"}님</span>
                <span className="opacity-50">|</span>
                <Link to="/mypage" className="hover:text-white transition-colors whitespace-nowrap">
                  {topMenu.mypageLabel || "마이페이지"}
                </Link>
                <span className="opacity-50">|</span>
                <button type="button" onClick={logout} className="hover:text-white transition-colors whitespace-nowrap">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-white transition-colors whitespace-nowrap">
                  {topMenu.loginLabel || "가맹점 로그인"}
                </Link>
                <span className="opacity-50">|</span>
                <Link to="/mypage" className="hover:text-white transition-colors whitespace-nowrap">
                  {topMenu.mypageLabel || "마이페이지"}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main GNB */}
      <header className="bg-white border-b border-[#E8DFCA] sticky top-0 z-40 shadow-sm overflow-visible">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-24 flex items-center gap-3 md:gap-5">
          <Link to="/" className="flex items-center gap-2 text-[#1A4D2E]">
            <img src={headerLogo} alt="SANGOL 로고" className="h-10 w-auto object-contain" />
          </Link>

          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div className="w-full rounded-full border border-[#DCE2D2] bg-[#F6F8F2] px-5 py-2.5 flex items-center gap-3">
              <Search className="w-4 h-4 text-[#6E7769]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="상품명, 카테고리 검색..."
                className="w-full bg-transparent text-sm text-[#1F2A1D] placeholder:text-[#8A9385] outline-none"
              />
              <button
                type="submit"
                className="shrink-0 px-4 py-1.5 rounded-full bg-[#1A4D2E] text-white text-xs font-semibold hover:bg-[#2d5016] transition-colors"
              >
                검색
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5 md:gap-2 text-[#4F6F52]">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-full hover:bg-[#F4F6EF] transition-colors"
              aria-label="검색"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/mypage")}
              className="p-2 rounded-full hover:bg-[#F4F6EF] transition-colors"
              aria-label="마이페이지"
            >
              <User className="w-4 h-4" />
            </button>
            <button type="button" className="md:hidden p-2 rounded-full hover:bg-[#F4F6EF] transition-colors" aria-label="메뉴">
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isMobileSearchOpen ? (
          <div className="md:hidden px-4 pb-3">
            <form onSubmit={submitSearch} className="w-full">
              <div className="w-full rounded-full border border-[#DCE2D2] bg-[#F6F8F2] px-4 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#6E7769]" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="상품명, 카테고리 검색..."
                  className="w-full bg-transparent text-sm text-[#1F2A1D] placeholder:text-[#8A9385] outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 px-3 py-1 rounded-full bg-[#1A4D2E] text-white text-xs font-semibold hover:bg-[#2d5016] transition-colors"
                >
                  검색
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="hidden md:block max-w-7xl mx-auto px-4 md:px-6 border-t border-[#E8DFCA]/70">
          <nav className="flex flex-wrap items-center justify-end gap-6 lg:gap-8 text-[15px] font-semibold text-[#4F6F52] py-2">
            <GnbMenus isFranchiseUser={isFranchiseUser} itemClassName="relative py-4" />
          </nav>
        </div>

        <nav className="md:hidden border-t border-[#E8DFCA] bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] font-semibold text-[#4F6F52]">
              <GnbMenus isFranchiseUser={isFranchiseUser} itemClassName="relative py-2" />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#2D3F30] text-[#E8DFCA] py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="inline-flex">
              <img
                src={footerLogo}
                alt="SANGOL 푸터 로고"
                className="h-12 w-auto object-contain mb-6"
              />
            </Link>
            <div className="text-sm space-y-2 opacity-80 leading-relaxed">
              <p>대표자명 : {footer.ownerName || "-"}</p>
              <p>주소 : {footer.address || "-"}</p>
            </div>
          </div>
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm opacity-80">
            <div className="space-y-2">
              <h3 className="font-bold text-white text-lg mb-4">Contact Info</h3>
              <p>고객센터 : {footer.csPhone || "-"}</p>
              <p>팩스 번호 : {footer.fax || "-"}</p>
              <p>이메일 : {footer.email || "-"}</p>
            </div>
            <div className="space-y-2 sm:text-right">
              <p className="pt-8 opacity-60">{footer.copyright || "-"}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}