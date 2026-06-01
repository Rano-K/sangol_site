import type { CSSProperties, ReactNode } from 'react';
import { resolveHighlightRegion, truncatePreviewText } from './cmsFieldPlacementMeta';

type WireframeBodyProps = {
  pageKey: string;
  highlightRegion: string;
  sections: Record<string, unknown>;
  getValue: (path: string) => string;
  getImageSrc: (path: string) => string;
  compact?: boolean;
};

type CmsPageWireframeProps = {
  pageKey: string;
  activePath: string;
  sections?: Record<string, unknown>;
  getValue: (path: string) => string;
  getImageSrc: (path: string) => string;
  compact?: boolean;
  showLegend?: boolean;
  activeLinkHref?: string;
};

type ZoneProps = {
  id: string;
  highlightRegion: string;
  className?: string;
  label?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

const BRAND = {
  green: '#1A4D2E',
  greenLight: '#2D6A4F',
  cream: '#FAFAF7',
  mint: '#E8F0E6',
  muted: '#5F6C60',
};

function Zone({ id, highlightRegion, className = '', label, style, children }: ZoneProps) {
  const active = highlightRegion === id;
  return (
    <div
      data-zone={id}
      style={style}
      className={`relative rounded transition-all duration-200 ${className} ${
        active
          ? 'ring-2 ring-amber-400 ring-offset-1 bg-amber-50/90 shadow-sm z-10'
          : 'ring-1 ring-transparent'
      }`}
    >
      {active ? (
        <span className="absolute -top-2 left-1 z-20 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500 text-white shadow">
          여기
        </span>
      ) : null}
      {label ? (
        <span className={`block text-[8px] font-medium mb-0.5 ${active ? 'text-amber-800' : 'text-[#6B7B6E]'}`}>
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function MiniBrowserChrome({ title, compact }: { title: string; compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 border-b border-[#DCE8D8] bg-white ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
    >
      <span className="w-2 h-2 rounded-full bg-[#E57373]" />
      <span className="w-2 h-2 rounded-full bg-[#FFD54F]" />
      <span className="w-2 h-2 rounded-full bg-[#81C784]" />
      <span className={`flex-1 text-center truncate text-[#4F6F52] ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
        {title}
      </span>
    </div>
  );
}

function LiveText({ value, placeholder, className = '' }: { value: string; placeholder: string; className?: string }) {
  const text = truncatePreviewText(value || placeholder, 56);
  const empty = !value?.trim();
  return (
    <p className={`leading-tight ${empty ? 'opacity-50 italic' : ''} ${className}`}>{text}</p>
  );
}

function LiveImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-[#E8EDE5] text-[#6B7B6E] text-[8px] border border-dashed border-[#B8C9B0] ${className}`}
      >
        이미지
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover border border-[#C5D4BE] ${className}`} />;
}

function SiteLayoutFrame({ highlightRegion, getValue, getImageSrc, compact }: Omit<WireframeBodyProps, 'pageKey' | 'sections'>) {
  return (
    <Zone id="global-frame" highlightRegion={highlightRegion} className="flex flex-col" style={{ background: BRAND.cream }}>
      <Zone id="notice-bar" highlightRegion={highlightRegion} className="px-2 py-1 text-center text-white text-[9px]" style={{ background: BRAND.green }}>
        <LiveText value={getValue('topMenu.noticeText')} placeholder="상단 공지 문구" />
      </Zone>
      <Zone
        id="header-logo"
        highlightRegion={highlightRegion}
        className="flex items-center gap-2 px-2 py-1.5 border-b border-[#DCE8D8] bg-white"
      >
        <LiveImage
          src={getImageSrc('logo.headerLogoMediaId')}
          alt="헤더 로고"
          className={compact ? 'h-5 w-14 rounded' : 'h-6 w-16 rounded'}
        />
        <div className="flex-1 flex gap-1 justify-center opacity-40">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="h-1 w-6 rounded bg-[#C5D4BE]" />
          ))}
        </div>
        <Zone id="header-auth" highlightRegion={highlightRegion} className="flex gap-1 shrink-0">
          <span className="text-[8px] px-1 py-0.5 rounded border border-[#C5D4BE] text-[#1A4D2E]">
            <LiveText value={getValue('topMenu.loginLabel')} placeholder="로그인" className="text-[8px]" />
          </span>
          <span className="text-[8px] px-1 py-0.5 rounded border border-[#C5D4BE] text-[#1A4D2E]">
            <LiveText value={getValue('topMenu.mypageLabel')} placeholder="마이페이지" className="text-[8px]" />
          </span>
        </Zone>
      </Zone>
      <div className={`flex-1 ${compact ? 'h-16' : 'h-20'} bg-gradient-to-b from-[#F0F4EE] to-[#E8EDE5] flex items-center justify-center`}>
        <span className="text-[9px] text-[#8A9A8C]">페이지 본문</span>
      </div>
      <Zone
        id="footer-logo"
        highlightRegion={highlightRegion}
        className="px-2 py-1 border-t border-[#DCE8D8] bg-[#1A4D2E] flex items-start gap-2"
      >
        <LiveImage src={getImageSrc('logo.footerLogoMediaId')} alt="푸터 로고" className="h-4 w-10 rounded opacity-90" />
        <Zone id="footer-info" highlightRegion={highlightRegion} className="flex-1 text-[8px] text-white/90 space-y-0.5">
          <LiveText value={getValue('footer.ownerName')} placeholder="대표자명" className="text-[8px] text-white" />
          <LiveText value={getValue('footer.address')} placeholder="주소" className="text-[8px] text-white/80" />
          <LiveText value={getValue('footer.csPhone')} placeholder="고객센터" className="text-[8px] text-white/80" />
        </Zone>
      </Zone>
    </Zone>
  );
}

function HomeFrame({ highlightRegion, getValue, getImageSrc, compact }: Omit<WireframeBodyProps, 'pageKey' | 'sections'>) {
  const heroImg =
    getImageSrc('heroImages.0') || getImageSrc('heroImages.1') || getImageSrc('heroImages.2');
  return (
    <div className="flex flex-col gap-1 p-1" style={{ background: BRAND.cream }}>
      <Zone
        id="hero-bg"
        highlightRegion={highlightRegion}
        className={`relative overflow-hidden rounded-md ${compact ? 'h-20' : 'h-24'}`}
      >
        <LiveImage src={heroImg} alt="히어로" className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-black/35 p-2 flex flex-col justify-center text-white">
          <Zone id="hero-text" highlightRegion={highlightRegion}>
            <LiveText
              value={getValue('hero.subtitle')}
              placeholder="보조 문구"
              className={`text-white/90 ${compact ? 'text-[8px]' : 'text-[9px]'}`}
            />
            <LiveText
              value={getValue('hero.title')}
              placeholder="메인 제목"
              className={`font-bold text-white mt-0.5 ${compact ? 'text-[10px]' : 'text-[11px]'}`}
            />
            <Zone id="hero-sub2" highlightRegion={highlightRegion}>
              <LiveText
                value={getValue('hero.subtitle2')}
                placeholder="보조 문구 2"
                className={`text-white/80 ${compact ? 'text-[8px]' : 'text-[9px]'}`}
              />
            </Zone>
          </Zone>
          <Zone id="hero-cta" highlightRegion={highlightRegion} className="mt-1">
            <span className="inline-block text-[8px] px-2 py-0.5 rounded-full bg-white text-[#1A4D2E] font-semibold">
              <LiveText value={getValue('heroActions.0.label')} placeholder="CTA 버튼" className="text-[8px] text-[#1A4D2E]" />
            </span>
          </Zone>
        </div>
      </Zone>
      <div className="grid grid-cols-4 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <Zone
            key={i}
            id={`trust-${i}`}
            highlightRegion={highlightRegion}
            className="bg-white rounded p-1 text-center border border-[#E3E9DE]"
          >
            <LiveImage
              src={getValue(`trustBadges.${i}.iconUrl`)?.startsWith('http') ? getValue(`trustBadges.${i}.iconUrl`) : ''}
              alt={`배지${i + 1}`}
              className="h-4 w-4 mx-auto rounded"
            />
            <LiveText
              value={getValue(`trustBadges.${i}.title`)}
              placeholder={`배지${i + 1}`}
              className="text-[7px] font-semibold text-[#1A4D2E] mt-0.5"
            />
          </Zone>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <Zone
            key={i}
            id={`feature-${i}`}
            highlightRegion={highlightRegion}
            className="bg-white rounded overflow-hidden border border-[#E3E9DE] flex"
          >
            <LiveImage
              src={getImageSrc(`features.${i}.img`)}
              alt={`카드${i + 1}`}
              className="w-8 h-full shrink-0"
            />
            <div className="p-1 flex-1 min-w-0">
              <LiveText
                value={getValue(`features.${i}.title`)}
                placeholder="카드 제목"
                className="text-[7px] font-bold text-[#1A4D2E]"
              />
            </div>
          </Zone>
        ))}
      </div>
      <Zone id="intro" highlightRegion={highlightRegion} className="bg-white rounded p-1.5 border border-[#E3E9DE] text-center">
        <LiveImage src={getImageSrc('intro.iconUrl')} alt="아이콘" className="h-4 w-4 mx-auto rounded-full mb-0.5" />
        <LiveText value={getValue('intro.title')} placeholder="브랜드 제목" className="text-[8px] font-semibold text-[#1A4D2E]" />
      </Zone>
      <Zone id="home-support" highlightRegion={highlightRegion} className="rounded p-1.5 text-white text-center" style={{ background: BRAND.green }}>
        <LiveText value={getValue('support.phone')} placeholder="1522-4680" className="text-[9px] font-bold text-white" />
        <LiveText value={getValue('support.notice')} placeholder="상담 안내" className="text-[7px] text-white/80" />
      </Zone>
    </div>
  );
}

function BannerPageFrame({
  highlightRegion,
  getValue,
  getImageSrc,
  bannerPath,
  titlePath,
  subtitlePath,
  bodyLabel = '본문',
}: {
  highlightRegion: string;
  getValue: (path: string) => string;
  getImageSrc: (path: string) => string;
  bannerPath: string;
  titlePath?: string;
  subtitlePath?: string;
  bodyLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-1" style={{ background: BRAND.cream }}>
      <Zone id="banner" highlightRegion={highlightRegion} className="relative h-14 rounded-md overflow-hidden">
        <LiveImage src={getImageSrc(bannerPath)} alt="배너" className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2">
          <Zone id="header-text" highlightRegion={highlightRegion} className="text-center w-full">
            {titlePath ? (
              <LiveText value={getValue(titlePath)} placeholder="페이지 제목" className="text-[10px] font-bold text-white" />
            ) : null}
            {subtitlePath ? (
              <LiveText value={getValue(subtitlePath)} placeholder="부제목" className="text-[8px] text-white/85" />
            ) : null}
          </Zone>
        </div>
      </Zone>
      <Zone id="body" highlightRegion={highlightRegion} className="bg-white rounded p-2 border border-[#E3E9DE] min-h-[40px]">
        <span className="text-[8px] text-[#8A9A8C]">{bodyLabel}</span>
      </Zone>
    </div>
  );
}

function SupportFrame({ highlightRegion, getValue, getImageSrc }: Omit<WireframeBodyProps, 'pageKey' | 'sections' | 'compact'>) {
  return (
    <div className="flex flex-col gap-1 p-1" style={{ background: BRAND.cream }}>
      <Zone id="banner" highlightRegion={highlightRegion} className="h-12 rounded-md overflow-hidden relative">
        <LiveImage src={getImageSrc('header.bannerImage')} alt="배너" className="absolute inset-0 w-full h-full" />
        <Zone id="header-text" highlightRegion={highlightRegion} className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center text-white">
          <LiveText value={getValue('header.title')} placeholder="고객센터" className="text-[10px] font-bold text-white" />
          <LiveText value={getValue('header.subtitle')} placeholder="부제목" className="text-[8px] text-white/85" />
        </Zone>
      </Zone>
      <div className="flex gap-1">
        <div className="flex-1 bg-white rounded border border-[#E3E9DE] p-1 min-h-[36px]">
          <span className="text-[8px] text-[#8A9A8C]">문의 폼</span>
        </div>
        <Zone
          id="consult"
          highlightRegion={highlightRegion}
          className="w-[42%] shrink-0 rounded p-1 border border-[#C5D4BE] bg-[#F4F8F2]"
        >
          <LiveText value={getValue('consult.phone')} placeholder="전화" className="text-[9px] font-bold text-[#1A4D2E]" />
          <LiveText value={getValue('consult.weekday')} placeholder="평일" className="text-[7px] text-[#5F6C60]" />
          <LiveText value={getValue('consult.closed')} placeholder="휴무" className="text-[7px] text-[#5F6C60]" />
        </Zone>
      </div>
      <Zone id="privacy" highlightRegion={highlightRegion} className="bg-white rounded p-1 border border-dashed border-[#C5D4BE]">
        <LiveText value={getValue('privacyText')} placeholder="개인정보 안내" className="text-[7px] text-[#5F6C60]" />
      </Zone>
    </div>
  );
}

function OrderFrame({ highlightRegion, getValue }: Pick<WireframeBodyProps, 'highlightRegion' | 'getValue'>) {
  return (
    <div className="p-2 flex items-center justify-center min-h-[100px]" style={{ background: '#E8EDE5' }}>
      <Zone
        id="payment"
        highlightRegion={highlightRegion}
        className="w-[85%] bg-white rounded-lg shadow border border-[#DCE8D8] p-2 space-y-1"
      >
        <p className="text-[9px] font-bold text-[#1A4D2E] text-center">입금 안내</p>
        <LiveText value={getValue('payment.accountName')} placeholder="계좌명" className="text-[8px] text-center" />
        <LiveText
          value={getValue('payment.accountNumber')}
          placeholder="계좌번호"
          className="text-[8px] font-mono text-center text-[#1A4D2E]"
        />
        <LiveText
          value={getValue('payment.requiredNotice')}
          placeholder="필수 안내"
          className="text-[7px] text-red-700 text-center"
        />
      </Zone>
    </div>
  );
}

function LocationFrame({ highlightRegion, getValue, getImageSrc }: Omit<WireframeBodyProps, 'pageKey' | 'sections' | 'compact'>) {
  return (
    <div className="flex flex-col gap-1 p-1" style={{ background: BRAND.cream }}>
      <Zone id="banner" highlightRegion={highlightRegion} className="h-10 rounded-md overflow-hidden relative">
        <LiveImage src={getImageSrc('header.bannerImage')} alt="배너" className="absolute inset-0 w-full h-full" />
        <Zone id="header-text" highlightRegion={highlightRegion} className="absolute inset-0 bg-black/35 flex items-center justify-center">
          <LiveText value={getValue('header.title')} placeholder="오시는 길" className="text-[10px] font-bold text-white" />
        </Zone>
      </Zone>
      <div className="grid grid-cols-2 gap-1">
        <Zone id="head-office" highlightRegion={highlightRegion} className="bg-white rounded p-1 border border-[#E3E9DE]">
          <LiveText value={getValue('headOffice.title')} placeholder="본사" className="text-[8px] font-bold text-[#1A4D2E]" />
          <LiveText value={getValue('headOffice.address')} placeholder="주소" className="text-[7px] text-[#5F6C60]" />
          <div className="h-6 mt-0.5 rounded bg-[#E8EDE5] flex items-center justify-center text-[7px] text-[#8A9A8C]">지도</div>
        </Zone>
        <Zone id="direct-store" highlightRegion={highlightRegion} className="bg-white rounded p-1 border border-[#E3E9DE]">
          <LiveText value={getValue('directStore.title')} placeholder="직영점" className="text-[8px] font-bold text-[#1A4D2E]" />
          <LiveText value={getValue('directStore.address')} placeholder="주소" className="text-[7px] text-[#5F6C60]" />
          <div className="h-6 mt-0.5 rounded bg-[#E8EDE5] flex items-center justify-center text-[7px] text-[#8A9A8C]">지도</div>
        </Zone>
      </div>
    </div>
  );
}

function CardGridFrame({
  highlightRegion,
  getValue,
  getImageSrc,
  prefix,
  regionPrefix,
  count,
}: {
  highlightRegion: string;
  getValue: (path: string) => string;
  getImageSrc: (path: string) => string;
  prefix: string;
  regionPrefix: string;
  count: number;
}) {
  const cols = count <= 3 ? count : 2;
  return (
    <div className="p-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, background: BRAND.cream }}>
      {Array.from({ length: count }, (_, i) => (
        <Zone
          key={i}
          id={`${regionPrefix}-${i}`}
          highlightRegion={highlightRegion}
          className="bg-white rounded overflow-hidden border border-[#E3E9DE]"
        >
          <LiveImage src={getImageSrc(`${prefix}.${i}.imageUrl`)} alt={`${i + 1}`} className="h-12 w-full" />
          <p className="text-[7px] text-center py-0.5 text-[#5F6C60]">{i + 1}번 카드</p>
        </Zone>
      ))}
    </div>
  );
}

function renderPageBody(props: WireframeBodyProps) {
  const { pageKey, highlightRegion, getValue, getImageSrc, compact } = props;

  switch (pageKey) {
    case 'site-layout':
      return <SiteLayoutFrame highlightRegion={highlightRegion} getValue={getValue} getImageSrc={getImageSrc} compact={compact} />;
    case 'home':
      return <HomeFrame highlightRegion={highlightRegion} getValue={getValue} getImageSrc={getImageSrc} compact={compact} />;
    case 'support':
      return <SupportFrame highlightRegion={highlightRegion} getValue={getValue} getImageSrc={getImageSrc} />;
    case 'order':
      return <OrderFrame highlightRegion={highlightRegion} getValue={getValue} />;
    case 'company-location':
      return <LocationFrame highlightRegion={highlightRegion} getValue={getValue} getImageSrc={getImageSrc} />;
    case 'business-philosophy':
      return (
        <div className="flex flex-col gap-1">
          <BannerPageFrame
            highlightRegion={highlightRegion}
            getValue={getValue}
            getImageSrc={getImageSrc}
            bannerPath="header.bannerImage"
            titlePath="header.title"
            subtitlePath="header.subtitle"
            bodyLabel="철학 소개"
          />
          <CardGridFrame
            highlightRegion={highlightRegion}
            getValue={getValue}
            getImageSrc={getImageSrc}
            prefix="philosophies"
            regionPrefix="philosophy-card"
            count={3}
          />
        </div>
      );
    case 'business-core-competence':
      return (
        <div className="flex flex-col gap-1">
          <BannerPageFrame
            highlightRegion={highlightRegion}
            getValue={getValue}
            getImageSrc={getImageSrc}
            bannerPath="header.bannerImage"
            titlePath="header.title"
            subtitlePath="header.subtitle"
          />
          <CardGridFrame
            highlightRegion={highlightRegion}
            getValue={getValue}
            getImageSrc={getImageSrc}
            prefix="competencies"
            regionPrefix="competence-card"
            count={4}
          />
        </div>
      );
    case 'company-greeting':
    case 'company-history':
    case 'company-awards':
    case 'business-vision':
    case 'business-farm':
      return (
        <BannerPageFrame
          highlightRegion={highlightRegion}
          getValue={getValue}
          getImageSrc={getImageSrc}
          bannerPath={pageKey.startsWith('company-') ? 'headerBannerImage' : 'header.bannerImage'}
          titlePath="header.title"
          subtitlePath="header.subtitle"
        />
      );
    default:
      return (
        <BannerPageFrame
          highlightRegion={highlightRegion}
          getValue={getValue}
          getImageSrc={getImageSrc}
          bannerPath="header.bannerImage"
          titlePath="header.title"
          subtitlePath="header.subtitle"
        />
      );
  }
}

const PAGE_PREVIEW_TITLES: Record<string, string> = {
  'site-layout': '공통 레이아웃 (모든 페이지)',
  home: '메인 홈 (/)',
  support: '고객센터',
  order: '입금 안내 (마이페이지)',
  'company-greeting': '인사말',
  'company-history': '연혁',
  'company-awards': '수상·인증',
  'company-location': '오시는 길',
  'business-philosophy': '경영철학',
  'business-vision': '비전',
  'business-core-competence': '핵심역량',
  'business-farm': '농장소개',
};

export function CmsPageWireframe({
  pageKey,
  activePath,
  sections: _sections,
  getValue,
  getImageSrc,
  compact = false,
  showLegend = false,
  activeLinkHref,
}: CmsPageWireframeProps) {
  const highlightRegion = resolveHighlightRegion(pageKey, activePath);
  const title = PAGE_PREVIEW_TITLES[pageKey] || pageKey;

  return (
    <div
      className={`rounded-xl border border-[#DCE8D8] overflow-hidden bg-white shadow-sm ${
        compact ? 'max-w-[220px]' : 'w-full'
      }`}
    >
      <MiniBrowserChrome title={title} compact={compact} />
      <div className={compact ? 'max-h-[200px] overflow-y-auto' : ''}>{renderPageBody({ pageKey, highlightRegion, sections: {}, getValue, getImageSrc, compact })}</div>
      {activeLinkHref ? (
        <div
          className="px-2 py-1 border-t border-indigo-200 bg-indigo-50 text-[8px] text-indigo-900 font-mono truncate"
          title={activeLinkHref}
        >
          이동 ↗ {activeLinkHref}
        </div>
      ) : null}
      {showLegend ? (
        <div className="px-2 py-1.5 border-t border-[#E3E9DE] bg-[#F7FBF5] flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-[#5F6C60]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded ring-2 ring-amber-400 bg-amber-50" />
            노란 테두리 = 편집 위치
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-indigo-500" />
            남색 카드 = 링크·이동 경로
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function CmsPageOverviewPreview({
  pageKey,
  getValue,
  getImageSrc,
}: {
  pageKey: string;
  getValue: (path: string) => string;
  getImageSrc: (path: string) => string;
}) {
  return (
    <CmsPageWireframe
      pageKey={pageKey}
      activePath="__overview__"
      sections={{}}
      getValue={getValue}
      getImageSrc={getImageSrc}
      compact={false}
      showLegend
    />
  );
}
