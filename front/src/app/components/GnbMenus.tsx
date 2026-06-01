import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown } from "lucide-react";
import { cn } from "./ui/utils";

const DROPDOWN_PANEL_BASE =
  "absolute top-full left-1/2 -translate-x-1/2 z-[60] mt-0 bg-white shadow-lg border border-gray-100 rounded-lg py-2 transition-all duration-150";

const linkClass = "block px-4 py-2 hover:bg-[#FAFAF7] hover:text-[#1A4D2E] text-sm text-gray-600";

type GnbMenusProps = {
  isFranchiseUser: boolean;
  itemClassName?: string;
  showOrderButton?: boolean;
  orderButtonClassName?: string;
};

type GnbDropdownProps = {
  menuKey: string;
  label: string;
  widthClass: string;
  openKey: string | null;
  onOpen: (key: string) => void;
  onClose: () => void;
  itemClassName: string;
  children: ReactNode;
};

function GnbDropdown({
  menuKey,
  label,
  widthClass,
  openKey,
  onOpen,
  onClose,
  itemClassName,
  children,
}: GnbDropdownProps) {
  const isOpen = openKey === menuKey;

  return (
    <div
      className={itemClassName}
      onMouseEnter={() => onOpen(menuKey)}
      onMouseLeave={onClose}
    >
      <span className="flex items-center gap-1 hover:text-[#1A4D2E] transition-colors whitespace-nowrap">
        {label} <ChevronDown className="w-4 h-4 shrink-0" />
      </span>
      <div
        className={cn(
          DROPDOWN_PANEL_BASE,
          widthClass,
          isOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function GnbMenuLink({ to, onNavigate, children }: { to: string; onNavigate: () => void; children: ReactNode }) {
  return (
    <Link to={to} className={linkClass} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function GnbMenus({
  isFranchiseUser,
  itemClassName = "relative cursor-pointer py-6",
  showOrderButton = true,
  orderButtonClassName = "my-4 inline-flex items-center gap-2 rounded-full bg-[#1A4D2E] px-4 py-2 text-white font-extrabold shadow-[0_6px_16px_rgba(26,77,46,0.28)] hover:bg-[#143924] hover:-translate-y-0.5 transition-all",
}: GnbMenusProps) {
  const location = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    setOpenKey(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [location.pathname, location.search]);

  const closeMenu = () => setOpenKey(null);
  const openMenu = (key: string) => setOpenKey(key);

  return (
    <>
      <GnbDropdown
        menuKey="products"
        label="상품"
        widthClass="w-40"
        openKey={openKey}
        onOpen={openMenu}
        onClose={closeMenu}
        itemClassName={itemClassName}
      >
        <GnbMenuLink to="/products/forest" onNavigate={closeMenu}>
          임산물
        </GnbMenuLink>
        <GnbMenuLink to="/products/agriculture" onNavigate={closeMenu}>
          농산물
        </GnbMenuLink>
        <GnbMenuLink to="/products/manufactured" onNavigate={closeMenu}>
          가공식품
        </GnbMenuLink>
        {isFranchiseUser ? (
          <GnbMenuLink to="/products/wip" onNavigate={closeMenu}>
            재공품
          </GnbMenuLink>
        ) : null}
      </GnbDropdown>

      <GnbDropdown
        menuKey="brand"
        label="브랜드소개"
        widthClass="w-52"
        openKey={openKey}
        onOpen={openMenu}
        onClose={closeMenu}
        itemClassName={itemClassName}
      >
        <p className="px-4 pt-2 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">회사 소개</p>
        <GnbMenuLink to="/company/greeting" onNavigate={closeMenu}>
          인사말
        </GnbMenuLink>
        <GnbMenuLink to="/company/history" onNavigate={closeMenu}>
          연혁
        </GnbMenuLink>
        <GnbMenuLink to="/company/awards" onNavigate={closeMenu}>
          수상/인증
        </GnbMenuLink>
        <GnbMenuLink to="/company/location" onNavigate={closeMenu}>
          오시는길
        </GnbMenuLink>
        <div className="my-1 border-t border-gray-100" />
        <p className="px-4 pt-1 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">사업 소개</p>
        <GnbMenuLink to="/business/philosophy" onNavigate={closeMenu}>
          경영철학
        </GnbMenuLink>
        <GnbMenuLink to="/business/vision" onNavigate={closeMenu}>
          비전
        </GnbMenuLink>
        <GnbMenuLink to="/business/core-competence" onNavigate={closeMenu}>
          핵심역량
        </GnbMenuLink>
        <GnbMenuLink to="/business/farm" onNavigate={closeMenu}>
          농장소개
        </GnbMenuLink>
      </GnbDropdown>

      <GnbDropdown
        menuKey="support"
        label="고객센터"
        widthClass="w-40"
        openKey={openKey}
        onOpen={openMenu}
        onClose={closeMenu}
        itemClassName={itemClassName}
      >
        <GnbMenuLink to="/support/notice" onNavigate={closeMenu}>
          공지사항
        </GnbMenuLink>
        <GnbMenuLink to="/support/inquiry" onNavigate={closeMenu}>
          온라인문의
        </GnbMenuLink>
        <GnbMenuLink to="/support/faq" onNavigate={closeMenu}>
          FAQ
        </GnbMenuLink>
      </GnbDropdown>

      <GnbDropdown
        menuKey="community"
        label="커뮤니티"
        widthClass="w-40"
        openKey={openKey}
        onOpen={openMenu}
        onClose={closeMenu}
        itemClassName={itemClassName}
      >
        <GnbMenuLink to="/community/story" onNavigate={closeMenu}>
          산골소통방
        </GnbMenuLink>
        <GnbMenuLink to="/community/concert" onNavigate={closeMenu}>
          산골이야기
        </GnbMenuLink>
        <GnbMenuLink to="/community/small-music" onNavigate={closeMenu}>
          작은음악회
        </GnbMenuLink>
      </GnbDropdown>

      {showOrderButton ? (
        <Link to="/order" className={orderButtonClassName} onClick={closeMenu}>
          <span className="inline-flex h-2 w-2 rounded-full bg-[#D1A24A] animate-pulse" />
          가맹점주문
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tracking-wide">B2B</span>
        </Link>
      ) : null}
    </>
  );
}
