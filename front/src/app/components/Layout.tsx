import React, { FormEvent, useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router";
import { ChevronDown, Heart, Menu, Phone, Search, ShoppingCart, User } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { useShopping } from "../hooks/useShopping";
import { useAuth } from "../hooks/useAuth";

export function Layout() {
  const navigate = useNavigate();
  const { data } = useCmsPage("site-layout");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const topMenu = (sections.topMenu ?? {}) as Record<string, string>;
  const footer = (sections.footer ?? {}) as Record<string, string>;
  const logo = (sections.logo ?? {}) as Record<string, string>;
  const headerLogo = getCmsMediaFileUrl(logo.headerLogoMediaId ? Number(logo.headerLogoMediaId) : null) || "";
  const footerLogo = getCmsMediaFileUrl(logo.footerLogoMediaId ? Number(logo.footerLogoMediaId) : null) || "";
  const topNotice = topMenu.noticeText || "신규가맹점 첫 구매 10% 할인";
  const { wishlistCount, cartCount } = useShopping();
  const { user, isAuthenticated, logout } = useAuth();
  const isFranchiseUser = user?.role === "franchise";
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const typography = (sections.typography ?? {}) as Record<string, unknown>;
    const enabled = typography.enabled !== false;
    const baseFallback = "'Noto Sans KR', 'Malgun Gothic', sans-serif";

    const bodyFontFamilyNameRaw = String(typography.bodyFontFamilyName ?? typography.fontFamilyName ?? "").trim();
    const bodyFontFamilyNameEnRaw = String(typography.bodyFontFamilyNameEn ?? typography.fontFamilyNameEn ?? "").trim();
    const headingFontFamilyNameRaw = String(typography.headingFontFamilyName ?? "").trim();
    const headingFontFamilyNameEnRaw = String(typography.headingFontFamilyNameEn ?? "").trim();
    const bodyFallback = baseFallback;
    const headingFallback = bodyFallback;

    const bodyMediaId = Number(typography.bodyFontMediaId ?? typography.fontMediaId ?? 0);
    const bodyMediaIdEn = Number(typography.bodyFontMediaIdEn ?? typography.fontMediaIdEn ?? 0);
    const headingMediaId = Number(typography.headingFontMediaId ?? 0);
    const headingMediaIdEn = Number(typography.headingFontMediaIdEn ?? 0);
    const bodyFontFamilyName =
      bodyFontFamilyNameRaw || (Number.isFinite(bodyMediaId) && bodyMediaId > 0 ? `SangolAutoBody${bodyMediaId}` : "");
    const bodyFontFamilyNameEn =
      bodyFontFamilyNameEnRaw || (Number.isFinite(bodyMediaIdEn) && bodyMediaIdEn > 0 ? `SangolAutoBodyEn${bodyMediaIdEn}` : bodyFontFamilyName);
    const headingFontFamilyName =
      headingFontFamilyNameRaw || (Number.isFinite(headingMediaId) && headingMediaId > 0 ? `SangolAutoHeading${headingMediaId}` : "");
    const headingFontFamilyNameEn =
      headingFontFamilyNameEnRaw || (Number.isFinite(headingMediaIdEn) && headingMediaIdEn > 0 ? `SangolAutoHeadingEn${headingMediaIdEn}` : headingFontFamilyName);
    const bodyFontUrl = getCmsMediaFileUrl(Number.isFinite(bodyMediaId) && bodyMediaId > 0 ? bodyMediaId : null);
    const bodyFontUrlEn = getCmsMediaFileUrl(Number.isFinite(bodyMediaIdEn) && bodyMediaIdEn > 0 ? bodyMediaIdEn : null);
    const headingFontUrl = getCmsMediaFileUrl(Number.isFinite(headingMediaId) && headingMediaId > 0 ? headingMediaId : null);
    const headingFontUrlEn = getCmsMediaFileUrl(Number.isFinite(headingMediaIdEn) && headingMediaIdEn > 0 ? headingMediaIdEn : null);

    const koreanRange = "U+1100-11FF, U+3130-318F, U+AC00-D7AF";
    const latinRange = "U+0000-00FF, U+0100-024F";

    const styleId = "cms-global-font-face";
    const prev = document.getElementById(styleId);
    if (prev?.parentNode) prev.parentNode.removeChild(prev);

    const defaultFamily = "'Noto Sans KR', 'Malgun Gothic', sans-serif";
    const bodyFamilyValue = enabled
      ? (bodyFontFamilyName ? `'${bodyFontFamilyName}', ${bodyFallback}` : bodyFallback)
      : defaultFamily;
    const headingFamilyValue = enabled
      ? (headingFontFamilyName ? `'${headingFontFamilyName}', ${headingFallback}` : bodyFamilyValue)
      : defaultFamily;

    document.documentElement.style.setProperty("--cms-front-font-family", bodyFamilyValue);
    document.documentElement.style.setProperty("--cms-front-font-body-family", bodyFamilyValue);
    document.documentElement.style.setProperty("--cms-front-font-heading-family", headingFamilyValue);

    const blocks: string[] = [];
    if (enabled && bodyFontFamilyName && bodyFontUrl) {
      blocks.push(`
        @font-face {
          font-family: '${bodyFontFamilyName}';
          src: url('${bodyFontUrl}') format('woff2'),
               url('${bodyFontUrl}') format('woff'),
               url('${bodyFontUrl}') format('truetype'),
               url('${bodyFontUrl}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${koreanRange};
        }
      `);
    }
    if (enabled && bodyFontFamilyNameEn && bodyFontUrlEn) {
      blocks.push(`
        @font-face {
          font-family: '${bodyFontFamilyName}';
          src: url('${bodyFontUrlEn}') format('woff2'),
               url('${bodyFontUrlEn}') format('woff'),
               url('${bodyFontUrlEn}') format('truetype'),
               url('${bodyFontUrlEn}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${latinRange};
        }
      `);
    }
    if (enabled && headingFontFamilyName && headingFontUrl) {
      blocks.push(`
        @font-face {
          font-family: '${headingFontFamilyName}';
          src: url('${headingFontUrl}') format('woff2'),
               url('${headingFontUrl}') format('woff'),
               url('${headingFontUrl}') format('truetype'),
               url('${headingFontUrl}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${koreanRange};
        }
      `);
    }
    if (enabled && headingFontFamilyNameEn && headingFontUrlEn) {
      blocks.push(`
        @font-face {
          font-family: '${headingFontFamilyName}';
          src: url('${headingFontUrlEn}') format('woff2'),
               url('${headingFontUrlEn}') format('woff'),
               url('${headingFontUrlEn}') format('truetype'),
               url('${headingFontUrlEn}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${latinRange};
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

  const goToShoppingSection = (tab: "cart" | "wishlist") => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/mypage" } });
      return;
    }
    navigate(`/mypage?tab=${tab}`);
  };

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
          <p className="text-center font-medium text-[#F7F3E7]">{topNotice}</p>
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
      <header className="bg-white border-b border-[#E8DFCA] sticky top-0 z-40 shadow-sm">
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
            {!isFranchiseUser ? (
              <>
                <button
                  type="button"
                  onClick={() => goToShoppingSection("wishlist")}
                  className="relative p-2 rounded-full hover:bg-[#F4F6EF] transition-colors"
                  aria-label="찜 목록"
                >
                  <Heart className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
                    {wishlistCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => goToShoppingSection("cart")}
                  className="relative p-2 rounded-full hover:bg-[#F4F6EF] transition-colors"
                  aria-label="장바구니"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#1A4D2E] text-white text-[10px] leading-4 text-center">
                    {cartCount}
                  </span>
                </button>
              </>
            ) : null}
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

        <div className="max-w-7xl mx-auto px-6 flex justify-end">
          <nav className="hidden lg:flex gap-8 text-[15px] font-semibold text-[#4F6F52]">
            <div className="relative group cursor-pointer py-6">
              <span className="flex items-center gap-1 hover:text-[#1A4D2E] transition-colors">회사소개 <ChevronDown className="w-4 h-4" /></span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-lg border border-gray-100 rounded-lg py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/company/greeting" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">인사말</Link>
                <Link to="/company/history" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">연혁</Link>
                <Link to="/company/awards" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">수상,인증</Link>
                <Link to="/company/location" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">오시는길</Link>
              </div>
            </div>

            <div className="relative group cursor-pointer py-6">
              <span className="flex items-center gap-1 hover:text-[#1A4D2E] transition-colors">사업분야 <ChevronDown className="w-4 h-4" /></span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-lg border border-gray-100 rounded-lg py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/business/philosophy" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">경영철학</Link>
                <Link to="/business/vision" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">비전</Link>
                <Link to="/business/core-competence" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">핵심역량</Link>
                <Link to="/business/farm" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">농장소개</Link>
              </div>
            </div>

            <div className="relative group cursor-pointer py-6">
              <span className="flex items-center gap-1 hover:text-[#1A4D2E] transition-colors">상품소개 <ChevronDown className="w-4 h-4" /></span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-lg border border-gray-100 rounded-lg py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/products/forest" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">임산물</Link>
                <Link to="/products/agriculture" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">농산물</Link>
                <Link to="/products/manufactured" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">제품</Link>
              </div>
            </div>

            <div className="relative group cursor-pointer py-6">
              <span className="flex items-center gap-1 hover:text-[#1A4D2E] transition-colors">고객센터 <ChevronDown className="w-4 h-4" /></span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-lg border border-gray-100 rounded-lg py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/support/notice" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">공지사항</Link>
                <Link to="/support/inquiry" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">온라인문의</Link>
                <Link to="/support/faq" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">FAQ</Link>
              </div>
            </div>

            <div className="relative group cursor-pointer py-6">
              <span className="flex items-center gap-1 hover:text-[#1A4D2E] transition-colors">커뮤니티 <ChevronDown className="w-4 h-4" /></span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-lg border border-gray-100 rounded-lg py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/community/story" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">산골이야기</Link>
                <Link to="/community/concert" className="block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600">작은음악회</Link>
              </div>
            </div>

            <Link to="/order" className="py-6 hover:text-[#1A4D2E] font-bold text-[#1A4D2E] transition-colors">
              가맹점주문
            </Link>
          </nav>
        </div>

        {/* Mobile/Tablet GNB */}
        <nav className="lg:hidden border-t border-[#E8DFCA] bg-white">
          <div className="px-4 py-3 overflow-x-auto">
            <div className="min-w-max flex items-center gap-6 text-[15px] font-semibold text-[#4F6F52]">
              <Link to="/company/greeting" className="whitespace-nowrap hover:text-[#1A4D2E] transition-colors">
                회사소개
              </Link>
              <Link to="/business/philosophy" className="whitespace-nowrap hover:text-[#1A4D2E] transition-colors">
                사업분야
              </Link>
              <Link to="/products/forest" className="whitespace-nowrap hover:text-[#1A4D2E] transition-colors">
                상품소개
              </Link>
              <Link to="/support/notice" className="whitespace-nowrap hover:text-[#1A4D2E] transition-colors">
                고객센터
              </Link>
              <Link to="/community/story" className="whitespace-nowrap hover:text-[#1A4D2E] transition-colors">
                커뮤니티
              </Link>
              <Link to="/order" className="whitespace-nowrap font-bold text-[#1A4D2E]">
                가맹점주문
              </Link>
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