export const FRONT_ROUTE_BY_PAGE: Record<string, string> = {
  'site-layout': '/',
  home: '/',
  'company-greeting': '/company/greeting',
  'company-history': '/company/history',
  'company-awards': '/company/awards',
  'company-location': '/company/location',
  'business-philosophy': '/business/philosophy',
  'business-vision': '/business/vision',
  'business-core-competence': '/business/core-competence',
  'business-farm': '/business/farm',
  support: '/support',
  order: '/mypage',
};

export const FRONT_PREVIEW_ORIGIN =
  (import.meta.env.VITE_FRONT_PREVIEW_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:5173';

export function getFrontPreviewUrl(pageKey: string): string {
  const path = FRONT_ROUTE_BY_PAGE[pageKey] || '/';
  return `${FRONT_PREVIEW_ORIGIN}${path}`;
}

export function getPlacementHint(pageKey: string, path: string): string {
  if (path.startsWith('topMenu.notice')) return '헤더 최상단 녹색 띠 — 혜택·공지 문구';
  if (path.startsWith('topMenu.')) return '헤더 우측 — 로그인·마이페이지 버튼';
  if (path.startsWith('logo.header')) return '헤더 좌측 — 로고 (DB media)';
  if (path.startsWith('logo.footer')) return '푸터 — 로고 (DB media)';
  if (path.startsWith('typography.fontMediaIdEn')) return '사이트 전체 — 영문·숫자 폰트';
  if (path.startsWith('typography.fontMediaId')) return '사이트 전체 — 한글 폰트';
  if (path.startsWith('typography.enabled')) return '사이트 전체 — 폰트 적용 ON/OFF';
  if (path.startsWith('typography.')) return '사이트 전체 — 전역 폰트';
  if (path.startsWith('footer.')) return '페이지 하단 — 회사 정보·연락처';
  if (path.startsWith('header.banner') || path === 'headerBannerImage') return '페이지 최상단 — 배경 배너 이미지';
  if (path.startsWith('header.')) return '페이지 최상단 — 제목·부제목';
  if (path.startsWith('headOffice.')) return '오시는 길 — 본사(농장) 카드';
  if (path.startsWith('directStore.')) return '오시는 길 — 직영점 카드';
  if (path.startsWith('consult.')) return '고객센터 — 우측 상담 안내 박스';
  if (path.startsWith('privacyText')) return '고객센터 — 문의폼 하단 동의 문구';
  if (path.startsWith('payment.')) return '주문·마이페이지 — 입금 안내 모달/박스';
  if (path.startsWith('heroImages.')) return '메인 첫 화면 — 슬라이드 배경 사진';
  if (path.startsWith('heroActions.')) return '메인 첫 화면 — CTA 버튼';
  if (path.startsWith('hero.subtitle2')) return '메인 첫 화면 — 큰 제목 바로 아래';
  if (path.startsWith('hero.')) return '메인 첫 화면 — 히어로 문구';
  if (path.startsWith('trustBadges.')) return '메인 — 히어로 아래 신뢰 배지 4칸';
  if (path.startsWith('features.')) return '메인 — 핵심역량 카드 4개';
  if (path.startsWith('intro.')) return '메인 — 브랜드 스토리 문단';
  if (path.startsWith('support.') && pageKey === 'home') return '메인 하단 — 고객센터 유도';
  if (path.startsWith('philosophies.')) return '경영철학 — 카드 이미지';
  if (path.startsWith('competencies.')) return '핵심역량 — 카드 이미지';
  if (path.startsWith('message') || path.startsWith('body.')) return '페이지 본문 — 텍스트 영역';
  return pageKey === 'site-layout' ? '모든 페이지 공통' : '해당 페이지 본문';
}

function indexedRegion(path: string, prefix: string, slotPrefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const match = path.match(new RegExp(`^${prefix.replace('.', '\\.')}(\\d+)`));
  if (!match) return null;
  return `${slotPrefix}-${match[1]}`;
}

export function resolveHighlightRegion(pageKey: string, path: string): string {
  if (path === '__overview__') return '__none__';

  if (pageKey === 'site-layout') {
    if (path.startsWith('topMenu.notice')) return 'notice-bar';
    if (path.startsWith('topMenu.')) return 'header-auth';
    if (path.startsWith('logo.header')) return 'header-logo';
    if (path.startsWith('logo.footer')) return 'footer-logo';
    if (path.startsWith('typography.')) return 'global-frame';
    if (path.startsWith('footer.')) return 'footer-info';
    return 'global-frame';
  }

  if (pageKey === 'home') {
    const trust = indexedRegion(path, 'trustBadges.', 'trust');
    if (trust) return trust;
    const feature = indexedRegion(path, 'features.', 'feature');
    if (feature) return feature;
    if (path.startsWith('heroImages.')) return 'hero-bg';
    if (path.startsWith('heroActions.')) return 'hero-cta';
    if (path.startsWith('hero.subtitle2')) return 'hero-sub2';
    if (path.startsWith('hero.')) return 'hero-text';
    if (path.startsWith('intro.')) return 'intro';
    if (path.startsWith('support.')) return 'home-support';
    return 'hero-text';
  }

  if (pageKey === 'support') {
    if (path.startsWith('header.banner')) return 'banner';
    if (path.startsWith('header.')) return 'header-text';
    if (path.startsWith('consult.')) return 'consult';
    if (path.startsWith('privacy')) return 'privacy';
    return 'header-text';
  }

  if (pageKey === 'order') {
    if (path.startsWith('payment.')) return 'payment';
    return 'payment';
  }

  if (pageKey === 'company-location') {
    if (path.startsWith('header.')) return path.includes('banner') ? 'banner' : 'header-text';
    if (path.startsWith('headOffice.')) return 'head-office';
    if (path.startsWith('directStore.')) return 'direct-store';
    return 'header-text';
  }

  if (pageKey === 'business-philosophy') {
    const card = indexedRegion(path, 'philosophies.', 'philosophy-card');
    if (card) return card;
    if (path.startsWith('header.') || path.startsWith('intro.')) return 'header-text';
    return 'philosophy-card-0';
  }

  if (pageKey === 'business-core-competence') {
    const card = indexedRegion(path, 'competencies.', 'competence-card');
    if (card) return card;
    if (path.startsWith('header.') || path.startsWith('intro.')) return 'header-text';
    return 'competence-card-0';
  }

  if (path === 'headerBannerImage' || path.startsWith('header.banner')) return 'banner';
  if (path.startsWith('header.')) return 'header-text';
  if (path.startsWith('body.') || path.startsWith('message')) return 'body';

  return 'body';
}

export function truncatePreviewText(value: string, max = 48): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}
