import { FRONT_PREVIEW_ORIGIN } from './cmsFieldPlacementMeta';

const ROUTE_LABELS: Record<string, string> = {
  '/': '메인 홈',
  '/login': '로그인',
  '/mypage': '마이페이지',
  '/order': '가맹점 주문',
  '/products': '상품 목록',
  '/products/forest': '상품 · 임산물',
  '/products/agriculture': '상품 · 농산물',
  '/products/manufactured': '상품 · 가공식품',
  '/products/wip': '상품 · 재공품',
  '/company/greeting': '회사소개 · 인사말',
  '/company/history': '회사소개 · 연혁',
  '/company/awards': '회사소개 · 수상·인증',
  '/company/location': '회사소개 · 오시는 길',
  '/business/philosophy': '사업소개 · 경영철학',
  '/business/vision': '사업소개 · 비전',
  '/business/core-competence': '사업소개 · 핵심역량',
  '/business/farm': '사업소개 · 농장소개',
  '/support': '고객센터',
  '/support/notice': '고객센터 · 공지사항',
  '/support/inquiry': '고객센터 · 온라인문의',
  '/support/faq': '고객센터 · FAQ',
  '/community/story': '커뮤니티 · 산골소통방',
  '/community/concert': '커뮤니티 · 작은음악회',
  '/community/small-music': '커뮤니티 · 작은음악회',
};

const SIBLING_LINK_PREFIXES = ['features', 'heroActions', 'featuredCards', 'communityPosts'] as const;

export type CmsFieldLinkInfo = {
  href: string;
  routeLabel: string;
  previewUrl: string;
  isFixed: boolean;
  kind: 'internal' | 'external' | 'mailto' | 'tel';
  isNavigation: boolean;
};

const formatRouteLabel = (href: string): string => {
  if (!href) return '경로 미지정';
  if (ROUTE_LABELS[href]) return ROUTE_LABELS[href];
  const base = href.split('?')[0];
  if (ROUTE_LABELS[base]) return ROUTE_LABELS[base];
  return '사이트 내부 페이지';
};

const buildPreviewUrl = (href: string, kind: CmsFieldLinkInfo['kind']): string => {
  if (kind === 'mailto' || kind === 'tel') return href;
  if (kind === 'external') return href;
  if (href.startsWith('/')) return `${FRONT_PREVIEW_ORIGIN}${href}`;
  return href;
};

const resolveSiblingLinkPath = (fieldPath: string): string | null => {
  for (const prefix of SIBLING_LINK_PREFIXES) {
    const match = fieldPath.match(new RegExp(`^${prefix}\\.(\\d+)\\.`));
    if (match) return `${prefix}.${match[1]}.link`;
  }
  return null;
};

export const resolveCmsFieldLink = (
  pageKey: string,
  fieldPath: string,
  getValue: (path: string) => string
): CmsFieldLinkInfo | null => {
  if (fieldPath === 'topMenu.loginLink' || fieldPath === 'topMenu.mypageLink') {
    const href = getValue(fieldPath).trim();
    if (!href) return null;
    return {
      href,
      routeLabel: formatRouteLabel(href),
      previewUrl: buildPreviewUrl(href, 'internal'),
      isFixed: false,
      kind: 'internal',
      isNavigation: true,
    };
  }

  if (fieldPath === 'footer.email') {
    const email = getValue(fieldPath).trim();
    if (!email) return null;
    return {
      href: `mailto:${email}`,
      routeLabel: '이메일 앱 열기',
      previewUrl: `mailto:${email}`,
      isFixed: false,
      kind: 'mailto',
      isNavigation: true,
    };
  }

  if (
    fieldPath === 'footer.csPhone' ||
    fieldPath === 'support.phone' ||
    fieldPath.startsWith('consult.phone') ||
    fieldPath.endsWith('.phone')
  ) {
    const phone = getValue(fieldPath).replace(/[^\d+]/g, '');
    if (!phone) return null;
    return {
      href: `tel:${phone}`,
      routeLabel: '전화 앱 연결',
      previewUrl: `tel:${phone}`,
      isFixed: false,
      kind: 'tel',
      isNavigation: true,
    };
  }

  const linkPaths: string[] = [];
  if (/(^|\.)link$/i.test(fieldPath)) {
    linkPaths.push(fieldPath);
  }
  const sibling = resolveSiblingLinkPath(fieldPath);
  if (sibling) linkPaths.push(sibling);

  for (const path of linkPaths) {
    const href = getValue(path).trim();
    if (!href) continue;
    const isExternal = /^https?:\/\//i.test(href);
    const kind: CmsFieldLinkInfo['kind'] = isExternal ? 'external' : 'internal';
    return {
      href,
      routeLabel: isExternal ? '외부 웹사이트' : formatRouteLabel(href),
      previewUrl: buildPreviewUrl(href, kind),
      isFixed: false,
      kind,
      isNavigation: true,
    };
  }

  return null;
};

export const isFixedLinkField = (_path: string): boolean => false;

export const isCmsNavigationLinkField = (
  pageKey: string,
  fieldPath: string,
  getValue: (path: string) => string
): boolean => {
  const info = resolveCmsFieldLink(pageKey, fieldPath, getValue);
  return Boolean(info?.isNavigation);
};
