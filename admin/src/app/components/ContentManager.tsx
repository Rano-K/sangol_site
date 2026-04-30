import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type CmsPage = {
  pageKey: string;
  title: string | null;
  sections: Record<string, unknown>;
  seo: Record<string, unknown>;
  published: boolean;
  updatedAt: string;
};

type CmsMedia = {
  id: number;
  originalName: string;
  publicUrl: string;
  createdAt: string;
  mimeType?: string;
  sizeBytes?: number;
};
type MediaUsage = {
  pageKey: string;
  pageLabel: string;
  path: string;
};

interface ContentManagerProps {
  token: string;
}

type FieldType = 'text' | 'textarea' | 'image' | 'font' | 'toggle';
type FieldConfig = {
  path: string;
  label: string;
  description: string;
  type: FieldType;
  imageValueType?: 'url' | 'mediaId';
  placeholder?: string;
  disabled?: boolean;
};

const PRESET_PAGE_KEYS = [
  'site-layout',
  'home',
  'company-greeting',
  'company-history',
  'company-awards',
  'company-location',
  'business-philosophy',
  'business-vision',
  'business-core-competence',
  'business-farm',
  'support',
  'order',
];
const PRESET_PAGE_KEY_SET = new Set(PRESET_PAGE_KEYS);

const PAGE_KEY_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  'site-layout': {
    label: '공통 레이아웃',
    description: '헤더, 푸터, 로고, 회사 기본 정보를 관리합니다.',
  },
  home: {
    label: '메인 홈',
    description: '첫 화면의 메인 비주얼, 배경 이미지, 고객센터 문구를 관리합니다.',
  },
  'company-greeting': {
    label: '회사소개 - 인사말',
    description: '대표 인사말 페이지의 상단 배경 이미지를 관리합니다.',
  },
  'company-history': {
    label: '회사소개 - 연혁',
    description: '회사 연혁 페이지의 상단 배경 이미지를 관리합니다.',
  },
  'company-awards': {
    label: '회사소개 - 수상 및 인증',
    description: '수상/인증 페이지의 상단 배경 이미지를 관리합니다.',
  },
  'company-location': {
    label: '회사소개 - 오시는 길',
    description: '본사와 직영점 주소, 전화번호, 상단 배너를 관리합니다.',
  },
  'business-philosophy': {
    label: '사업소개 - 경영철학',
    description: '경영철학 페이지에 노출되는 문구와 이미지를 관리합니다.',
  },
  'business-vision': {
    label: '사업소개 - 비전',
    description: '비전 페이지의 상단 배경 이미지를 관리합니다.',
  },
  'business-core-competence': {
    label: '사업소개 - 핵심역량',
    description: '핵심역량 페이지에 노출되는 문구와 이미지를 관리합니다.',
  },
  'business-farm': {
    label: '사업소개 - 농장소개',
    description: '농장소개 페이지의 상단 배경 이미지를 관리합니다.',
  },
  support: {
    label: '고객센터',
    description: '고객센터 상단 문구, 상담 시간, 개인정보 동의 문구를 관리합니다.',
  },
  order: {
    label: '주문 페이지',
    description: '주문 화면에 노출되는 안내 문구와 콘텐츠를 관리합니다.',
  },
};

const FIXED_LINK_VALUES_BY_PAGE: Record<string, Record<string, string>> = {
  home: {
    'features.0.link': '/business/core-competence',
    'features.1.link': '/company/awards',
    'features.2.link': '/company/awards',
    'features.3.link': '/business/farm',
    'featuredCards.0.link': '/products/forest',
    'featuredCards.1.link': '/products/agriculture',
    'featuredCards.2.link': '/products/forest',
    'featuredCards.3.link': '/products/manufactured',
    'communityPosts.0.link': '/community/story',
    'communityPosts.1.link': '/community/story',
    'communityPosts.2.link': '/community/concert',
    'communityPosts.3.link': '/community/story',
  },
};

const PAGE_FIELD_CONFIGS: Record<string, FieldConfig[]> = {
  'site-layout': [
    { path: 'topMenu.loginLabel', label: '상단 메뉴 > 로그인', description: '상단 우측 로그인 메뉴 문구', type: 'text' },
    { path: 'topMenu.mypageLabel', label: '상단 메뉴 > 마이페이지', description: '상단 우측 마이페이지 문구', type: 'text' },
    { path: 'topMenu.noticeText', label: '상단 공지 문구', description: '헤더 최상단 중앙에 노출되는 혜택 문구', type: 'text' },
    { path: 'logo.headerLogoUrl', label: '헤더 로고 이미지', description: '헤더 좌측 로고 이미지 URL', type: 'image', imageValueType: 'url' },
    { path: 'logo.footerLogoUrl', label: '푸터 로고 이미지', description: '푸터 로고 이미지 URL', type: 'image', imageValueType: 'url' },
    {
      path: 'typography.enabled',
      label: '전역 폰트 적용 여부',
      description: '체크하면 업로드한 폰트를 front 전체에 적용합니다.',
      type: 'toggle',
    },
    {
      path: 'typography.fontMediaId',
      label: '전역 한글 폰트 파일',
      description: '한글 텍스트용 전역 폰트 파일을 업로드하면 자동으로 연결됩니다.',
      type: 'font',
    },
    {
      path: 'typography.fontMediaIdEn',
      label: '전역 영문 폰트 파일',
      description: '영문/숫자 텍스트용 전역 폰트 파일을 업로드하면 자동으로 연결됩니다.',
      type: 'font',
    },
    {
      path: 'typography.headingFontMediaId',
      label: '제목(H1~H3) 한글 폰트 파일',
      description: '제목 한글 텍스트용 폰트 파일을 업로드하면 자동으로 연결됩니다.',
      type: 'font',
    },
    {
      path: 'typography.headingFontMediaIdEn',
      label: '제목(H1~H3) 영문 폰트 파일',
      description: '제목 영문/숫자 텍스트용 폰트 파일을 업로드하면 자동으로 연결됩니다.',
      type: 'font',
    },
    {
      path: 'typography.bodyFontMediaId',
      label: '본문 한글 폰트 파일',
      description: '본문 한글 텍스트용 폰트 파일을 업로드하면 자동으로 연결됩니다.',
      type: 'font',
    },
    {
      path: 'typography.bodyFontMediaIdEn',
      label: '본문 영문 폰트 파일',
      description: '본문 영문/숫자 텍스트용 폰트 파일을 업로드하면 자동으로 연결됩니다.',
      type: 'font',
    },
    { path: 'footer.ownerName', label: '대표자명', description: '푸터 회사 정보의 대표자명', type: 'text' },
    { path: 'footer.address', label: '주소', description: '푸터 회사 주소', type: 'text' },
    { path: 'footer.csPhone', label: '고객센터 번호', description: '푸터 고객센터 전화번호', type: 'text' },
    { path: 'footer.fax', label: '팩스 번호', description: '푸터 팩스 번호', type: 'text' },
    { path: 'footer.email', label: '이메일', description: '푸터 대표 이메일', type: 'text' },
    { path: 'footer.copyright', label: '저작권 문구', description: '푸터 하단 저작권 문구', type: 'text' },
  ],
  home: [
    { path: 'hero.subtitle', label: '메인 비주얼 > 보조 문구', description: '히어로 상단 보조 텍스트', type: 'text' },
    { path: 'hero.title', label: '메인 비주얼 > 메인 문구', description: '줄바꿈은 Enter로 입력', type: 'textarea' },
    { path: 'heroActions.0.label', label: '히어로 버튼 1 문구', description: '기본 CTA 버튼 문구', type: 'text' },
    { path: 'heroActions.0.link', label: '히어로 버튼 1 링크', description: '예: /products/forest', type: 'text' },
    { path: 'heroActions.0.variant', label: '히어로 버튼 1 스타일', description: 'primary 또는 outline', type: 'text' },
    { path: 'heroActions.1.label', label: '히어로 버튼 2 문구', description: '보조 CTA 버튼 문구', type: 'text' },
    { path: 'heroActions.1.link', label: '히어로 버튼 2 링크', description: '예: /order', type: 'text' },
    { path: 'heroActions.1.variant', label: '히어로 버튼 2 스타일', description: 'primary 또는 outline', type: 'text' },
    { path: 'heroImages.0', label: '메인 비주얼 이미지 1', description: '첫 번째 슬라이드 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'heroImages.1', label: '메인 비주얼 이미지 2', description: '두 번째 슬라이드 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'heroImages.2', label: '메인 비주얼 이미지 3', description: '세 번째 슬라이드 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'trustBadges.0.title', label: '신뢰배지 1 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.0.desc', label: '신뢰배지 1 설명', description: '짧은 부가설명', type: 'text' },
    { path: 'trustBadges.1.title', label: '신뢰배지 2 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.1.desc', label: '신뢰배지 2 설명', description: '짧은 부가설명', type: 'text' },
    { path: 'trustBadges.2.title', label: '신뢰배지 3 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.2.desc', label: '신뢰배지 3 설명', description: '짧은 부가설명', type: 'text' },
    { path: 'trustBadges.3.title', label: '신뢰배지 4 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.3.desc', label: '신뢰배지 4 설명', description: '짧은 부가설명', type: 'text' },
    { path: 'features.0.img', label: '홈 카드(핵심역량) 이미지 1', description: '첫 번째 카드 이미지', type: 'image', imageValueType: 'url' },
    { path: 'features.1.img', label: '홈 카드(핵심역량) 이미지 2', description: '두 번째 카드 이미지', type: 'image', imageValueType: 'url' },
    { path: 'features.2.img', label: '홈 카드(핵심역량) 이미지 3', description: '세 번째 카드 이미지', type: 'image', imageValueType: 'url' },
    { path: 'features.3.img', label: '홈 카드(핵심역량) 이미지 4', description: '네 번째 카드 이미지', type: 'image', imageValueType: 'url' },
    { path: 'featuredCards.0.img', label: '홈 카드(추천상품 홍보) 이미지 1', description: '첫 번째 추천상품 홍보 카드 이미지 (실상품 DB와 별개)', type: 'image', imageValueType: 'url' },
    { path: 'featuredCards.1.img', label: '홈 카드(추천상품 홍보) 이미지 2', description: '두 번째 추천상품 홍보 카드 이미지 (실상품 DB와 별개)', type: 'image', imageValueType: 'url' },
    { path: 'featuredCards.2.img', label: '홈 카드(추천상품 홍보) 이미지 3', description: '세 번째 추천상품 홍보 카드 이미지 (실상품 DB와 별개)', type: 'image', imageValueType: 'url' },
    { path: 'featuredCards.3.img', label: '홈 카드(추천상품 홍보) 이미지 4', description: '네 번째 추천상품 홍보 카드 이미지 (실상품 DB와 별개)', type: 'image', imageValueType: 'url' },
    { path: 'support.phone', label: '홈 고객센터 전화번호', description: '홈 하단 문의영역의 대표번호', type: 'text' },
    { path: 'support.notice', label: '홈 고객센터 안내문구', description: '줄바꿈은 Enter로 입력', type: 'textarea' },
  ],
  support: [
    { path: 'header.title', label: '고객센터 제목', description: '고객센터 페이지 상단 제목', type: 'text' },
    { path: 'header.subtitle', label: '고객센터 부제목', description: '고객센터 페이지 상단 부제목', type: 'text' },
    { path: 'header.bannerImage', label: '고객센터 배너 이미지', description: '고객센터 상단 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'consult.phone', label: '상담 전화번호', description: '사이드 상담 박스의 대표번호', type: 'text' },
    { path: 'consult.weekday', label: '평일 상담시간', description: '예: 09:00 - 18:00', type: 'text' },
    { path: 'consult.lunch', label: '점심시간', description: '예: 12:00 - 13:00', type: 'text' },
    { path: 'consult.closed', label: '휴무 안내', description: '예: 주말 및 공휴일 휴무', type: 'text' },
    { path: 'privacyText', label: '개인정보 동의 문구', description: '문의폼 하단 안내 문구', type: 'textarea' },
  ],
  'company-location': [
    { path: 'header.title', label: '오시는길 제목', description: '페이지 상단 제목', type: 'text' },
    { path: 'header.subtitle', label: '오시는길 부제목', description: '페이지 상단 설명', type: 'text' },
    { path: 'header.bannerImage', label: '오시는길 배너 이미지', description: '페이지 상단 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'headOffice.title', label: '본사 카드 제목', description: '예: 본사 (농장)', type: 'text' },
    { path: 'headOffice.address', label: '본사 주소', description: '본사 카드 주소', type: 'text' },
    { path: 'headOffice.phone', label: '본사 전화번호', description: '본사 카드 전화번호', type: 'text' },
    { path: 'directStore.title', label: '직영점 카드 제목', description: '예: 직영점 : 잠실 콩밭', type: 'text' },
    { path: 'directStore.address', label: '직영점 주소', description: '직영점 카드 주소', type: 'text' },
    { path: 'directStore.phone', label: '직영점 전화번호', description: '직영점 카드 전화번호', type: 'text' },
  ],
  'company-greeting': [
    { path: 'headerBannerImage', label: '인사말 배경 이미지', description: '인사말 상단 배너 배경 이미지', type: 'image', imageValueType: 'url' },
  ],
  'company-history': [
    { path: 'headerBannerImage', label: '연혁 배경 이미지', description: '연혁 상단 배너 배경 이미지', type: 'image', imageValueType: 'url' },
  ],
  'company-awards': [
    { path: 'headerBannerImage', label: '수상/인증 배경 이미지', description: '수상/인증 상단 배너 배경 이미지', type: 'image', imageValueType: 'url' },
  ],
  'business-vision': [
    { path: 'headerBannerImage', label: '비전 배경 이미지', description: '비전 상단 배너 배경 이미지', type: 'image', imageValueType: 'url' },
  ],
  'business-philosophy': [
    { path: 'philosophies.0.imageUrl', label: '경영철학 카드 이미지 1', description: '첫 번째 철학 이미지', type: 'image', imageValueType: 'url' },
    { path: 'philosophies.1.imageUrl', label: '경영철학 카드 이미지 2', description: '두 번째 철학 이미지', type: 'image', imageValueType: 'url' },
    { path: 'philosophies.2.imageUrl', label: '경영철학 카드 이미지 3', description: '세 번째 철학 이미지', type: 'image', imageValueType: 'url' },
  ],
  'business-core-competence': [
    { path: 'competencies.0.imageUrl', label: '핵심역량 카드 이미지 1', description: '첫 번째 역량 이미지', type: 'image', imageValueType: 'url' },
    { path: 'competencies.1.imageUrl', label: '핵심역량 카드 이미지 2', description: '두 번째 역량 이미지', type: 'image', imageValueType: 'url' },
    { path: 'competencies.2.imageUrl', label: '핵심역량 카드 이미지 3', description: '세 번째 역량 이미지', type: 'image', imageValueType: 'url' },
    { path: 'competencies.3.imageUrl', label: '핵심역량 카드 이미지 4', description: '네 번째 역량 이미지', type: 'image', imageValueType: 'url' },
  ],
  'business-farm': [
    { path: 'headerBannerImage', label: '농장소개 배경 이미지', description: '농장소개 상단 배너 배경 이미지', type: 'image', imageValueType: 'url' },
  ],
};

const toLabelFromPath = (path: string): string =>
  path
    .split('.')
    .map((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .join(' > ');

const guessImageValueType = (path: string): 'url' | 'mediaId' => {
  if (/mediaid$/i.test(path) || /mediaIds?(\.|$)/i.test(path)) return 'mediaId';
  return 'url';
};

const guessFieldType = (path: string, value: unknown): FieldType => {
  if (typeof value === 'boolean') return 'toggle';
  if (/font(mediaid|id)?$/i.test(path) || /typography\.font/i.test(path)) return 'font';
  if (typeof value === 'string' && value.length > 120) return 'textarea';
  if (typeof value === 'string' && /image|img|banner|logo|thumbnail|url/i.test(path)) return 'image';
  if (typeof value === 'number' && /mediaid$/i.test(path)) return 'image';
  return 'text';
};

const isFixedLinkField = (path: string): boolean => /(^|\.)link$/i.test(path);

const collectAutoFieldConfigs = (obj: unknown, prefix = '', depth = 0): FieldConfig[] => {
  if (depth > 5 || obj === null || obj === undefined) return [];

  if (Array.isArray(obj)) {
    return obj.flatMap((item, index) =>
      collectAutoFieldConfigs(item, prefix ? `${prefix}.${index}` : String(index), depth + 1)
    );
  }

  if (typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
      collectAutoFieldConfigs(value, prefix ? `${prefix}.${key}` : key, depth + 1)
    );
  }

  if (['string', 'number', 'boolean'].includes(typeof obj)) {
    const fieldType = guessFieldType(prefix, obj);
    const disabled = isFixedLinkField(prefix);
    return [
      {
        path: prefix,
        label: toLabelFromPath(prefix),
        description: disabled ? '화면 이동 경로는 코드에서 고정되어 수정할 수 없습니다.' : '페이지 내부 값',
        type: fieldType,
        imageValueType: fieldType === 'image' ? guessImageValueType(prefix) : undefined,
        disabled,
      },
    ];
  }

  return [];
};

const getRawValueByPath = (obj: Record<string, unknown>, path: string): unknown => {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return '';
    if (Array.isArray(current)) {
      const index = Number(key);
      current = Number.isNaN(index) ? undefined : current[index];
      continue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const getValueByPath = (obj: Record<string, unknown>, path: string): string => {
  const current = getRawValueByPath(obj, path);
  if (current === null || current === undefined) return '';
  return String(current);
};

const setValueByPath = (obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const draft = JSON.parse(JSON.stringify(obj || {})) as Record<string, unknown>;
  const keys = path.split('.');
  let current: Record<string, unknown> | unknown[] = draft;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const isLast = i === keys.length - 1;
    const nextKey = keys[i + 1];

    if (Array.isArray(current)) {
      const idx = Number(key);
      if (Number.isNaN(idx)) break;
      if (isLast) {
        current[idx] = value;
      } else {
        if (current[idx] === undefined || current[idx] === null || typeof current[idx] !== 'object') {
          current[idx] = Number.isNaN(Number(nextKey)) ? {} : [];
        }
        current = current[idx] as Record<string, unknown> | unknown[];
      }
      continue;
    }

    if (isLast) {
      current[key] = value;
    } else {
      const next = current[key];
      if (next === undefined || next === null || typeof next !== 'object') {
        current[key] = Number.isNaN(Number(nextKey)) ? {} : [];
      }
      current = current[key] as Record<string, unknown> | unknown[];
    }
  }
  return draft;
};

const applyFixedLinkValues = (pageKey: string, sections: Record<string, unknown>): Record<string, unknown> => {
  const fixedLinks = FIXED_LINK_VALUES_BY_PAGE[pageKey];
  if (!fixedLinks) return sections;

  return Object.entries(fixedLinks).reduce(
    (nextSections, [path, value]) => setValueByPath(nextSections, path, value),
    sections
  );
};

const normalizeHomeSectionsKeys = (pageKey: string, sections: Record<string, unknown>): Record<string, unknown> => {
  if (pageKey !== 'home') return sections;
  const next = JSON.parse(JSON.stringify(sections || {})) as Record<string, unknown>;
  const hasFeaturedCards = Array.isArray(next.featuredCards);
  const hasLegacyProducts = Array.isArray(next.products);
  if (!hasFeaturedCards && hasLegacyProducts) {
    next.featuredCards = next.products;
  }
  if (Object.prototype.hasOwnProperty.call(next, 'products')) {
    delete next.products;
  }
  return next;
};

const sanitizeFontFamilyToken = (raw: string): string =>
  raw
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40) || 'Custom';

const normalizeDisplayFileName = (raw: string): string => {
  if (!raw) return raw;
  const hasLikelyMojibake = /[ÃÂÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(raw);
  if (!hasLikelyMojibake) return raw;
  try {
    const bytes = Uint8Array.from([...raw].map((char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8').decode(bytes).trim();
    if (!decoded || decoded.includes('�')) return raw;
    return decoded;
  } catch (_error) {
    return raw;
  }
};

const getFontFamilyPathByMediaPath = (mediaPath: string): string | null => {
  if (mediaPath === 'typography.headingFontMediaId') return 'typography.headingFontFamilyName';
  if (mediaPath === 'typography.headingFontMediaIdEn') return 'typography.headingFontFamilyNameEn';
  if (mediaPath === 'typography.bodyFontMediaId') return 'typography.bodyFontFamilyName';
  if (mediaPath === 'typography.bodyFontMediaIdEn') return 'typography.bodyFontFamilyNameEn';
  if (mediaPath === 'typography.fontMediaId') return 'typography.fontFamilyName';
  if (mediaPath === 'typography.fontMediaIdEn') return 'typography.fontFamilyNameEn';
  return null;
};

export function ContentManager({ token }: ContentManagerProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [selectedKey, setSelectedKey] = useState('home');
  const [title, setTitle] = useState('');
  const [sectionsObject, setSectionsObject] = useState<Record<string, unknown>>({});
  const [sectionsText, setSectionsText] = useState('{}');
  const [seoText, setSeoText] = useState('{}');
  const [published, setPublished] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [media, setMedia] = useState<CmsMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [mediaQuery, setMediaQuery] = useState('');
  const [pickerField, setPickerField] = useState<FieldConfig | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const isAllowedPageKey = (pageKey: string): boolean => PRESET_PAGE_KEY_SET.has(pageKey);

  const loadPages = async () => {
    const response = await fetch(`${apiBaseUrl}/content/admin/pages`, { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '페이지 목록 조회 실패');
    setPages(data);
  };

  const loadMedia = async () => {
    const response = await fetch(`${apiBaseUrl}/content/admin/media`, { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '이미지 목록 조회 실패');
    setMedia(data);
  };

  const loadPageDetail = async (pageKey: string) => {
    const response = await fetch(`${apiBaseUrl}/content/admin/pages/${pageKey}`, { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 404) {
        setTitle('');
        setSectionsObject({});
        setSectionsText('{}');
        setSeoText('{}');
        setPublished(true);
        return;
      }
      throw new Error(data?.error || '페이지 데이터 조회 실패');
    }

    setTitle(data.title || '');
    const normalizedSections = normalizeHomeSectionsKeys(pageKey, (data.sections ?? {}) as Record<string, unknown>);
    const nextSections = applyFixedLinkValues(pageKey, normalizedSections);
    setSectionsObject(nextSections);
    setSectionsText(JSON.stringify(nextSections, null, 2));
    setSeoText(JSON.stringify(data.seo ?? {}, null, 2));
    setPublished(Boolean(data.published));
  };

  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([loadPages(), loadMedia(), loadPageDetail(selectedKey)]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '초기 데이터 로딩 실패');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectPage = async (pageKey: string) => {
    if (!isAllowedPageKey(pageKey)) {
      setError('허용되지 않은 페이지 키입니다. 프리셋 페이지에서만 편집할 수 있습니다.');
      return;
    }
    setSelectedKey(pageKey);
    setMessage('');
    setError('');
    try {
      await loadPageDetail(pageKey);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : '페이지 로딩 실패');
    }
  };

  const onSavePage = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      if (!isAllowedPageKey(selectedKey)) {
        throw new Error('허용되지 않은 페이지 키입니다. 프리셋 페이지만 저장할 수 있습니다.');
      }
      const sections = applyFixedLinkValues(selectedKey, normalizeHomeSectionsKeys(selectedKey, JSON.parse(sectionsText)));
      const seo = JSON.parse(seoText);

      const response = await fetch(`${apiBaseUrl}/content/admin/pages/${selectedKey}`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, sections, seo, published }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '저장 실패');

      setMessage('저장되었습니다.');
      await loadPages();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '저장 중 오류');
    }
  };

  const onUploadMedia = async (
    file: File | null,
    onUploaded?: (uploaded: { id: number; url: string }) => void
  ) => {
    if (!file) return;

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${apiBaseUrl}/content/admin/media/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '업로드 실패');

      setMessage('이미지가 업로드되었습니다.');
      await loadMedia();
      const publicUrl = data?.media?.publicUrl as string | undefined;
      const mediaId = Number(data?.media?.id);
      if (publicUrl && Number.isFinite(mediaId) && onUploaded) {
        onUploaded({ id: mediaId, url: publicUrl });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '업로드 중 오류');
    } finally {
      setUploading(false);
    }
  };

  const onUploadFont = async (
    file: File | null,
    onUploaded?: (uploaded: { id: number; url: string; originalName: string }) => void
  ) => {
    if (!file) return;

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('font', file);

      const response = await fetch(`${apiBaseUrl}/content/admin/media/upload-font`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '폰트 업로드 실패');

      setMessage('폰트가 업로드되었습니다.');
      await loadMedia();
      const publicUrl = data?.media?.publicUrl as string | undefined;
      const mediaId = Number(data?.media?.id);
      const originalName = String(data?.media?.originalName || file.name || '');
      if (publicUrl && Number.isFinite(mediaId) && onUploaded) {
        onUploaded({ id: mediaId, url: publicUrl, originalName });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '폰트 업로드 중 오류');
    } finally {
      setUploading(false);
    }
  };

  const presetPageFields = PAGE_FIELD_CONFIGS[selectedKey] ?? [];
  const autoGeneratedFields = collectAutoFieldConfigs(sectionsObject).filter(
    (field) => !presetPageFields.some((preset) => preset.path === field.path)
  );
  const pageFields = [...presetPageFields, ...autoGeneratedFields];
  const sectionsGuide = pageFields;
  const layoutGeneralFields =
    selectedKey === 'site-layout'
      ? sectionsGuide.filter((field) => !field.path.startsWith('typography.'))
      : sectionsGuide;
  const layoutTypographyFields =
    selectedKey === 'site-layout'
      ? sectionsGuide.filter((field) => field.path.startsWith('typography.'))
      : [];

  const getImagePreviewSrc = (field: FieldConfig): string => {
    const rawValue = getValueByPath(sectionsObject, field.path);
    if (!rawValue) return '';
    if (field.imageValueType === 'mediaId') {
      const id = Number(rawValue);
      if (!Number.isFinite(id)) return '';
      return `${apiBaseUrl}/content/public/media/${id}/file`;
    }
    return rawValue;
  };
  const getMediaNameFromValue = (rawValue: string): string => {
    const id = Number(rawValue);
    if (!Number.isFinite(id)) return '연결된 파일 없음';
    const matched = media.find((m) => Number(m.id) === id);
    return matched?.originalName ? normalizeDisplayFileName(matched.originalName) : '연결된 파일 없음';
  };

  const getFieldOrderHint = (path: string): string => {
    const match = path.match(/\.(\d+)(\.|$)/);
    if (!match) return '';
    const order = Number(match[1]) + 1;
    return Number.isFinite(order) ? `${order}번 슬롯` : '';
  };

  const getEnhancedDescription = (field: FieldConfig): string => {
    const orderHint = getFieldOrderHint(field.path);
    const valueTypeHint =
      field.type === 'image'
        ? field.imageValueType === 'mediaId'
          ? ' (미디어 ID가 자동으로 입력됩니다)'
          : ' (파일 URL이 자동으로 입력됩니다)'
        : '';
    return `${field.description}${orderHint ? ` · ${orderHint}` : ''}${valueTypeHint}`;
  };

  const filteredMedia = useMemo(() => {
    const q = mediaQuery.trim().toLowerCase();
    if (!q) return media;
    return media.filter((item) => {
      const inName = normalizeDisplayFileName(item.originalName).toLowerCase().includes(q);
      const inUrl = item.publicUrl.toLowerCase().includes(q);
      const inId = String(item.id).includes(q);
      return inName || inUrl || inId;
    });
  }, [media, mediaQuery]);
  const imageMedia = useMemo(
    () => media.filter((item) => String(item.mimeType || '').toLowerCase().startsWith('image/')),
    [media]
  );
  const fontMedia = useMemo(
    () =>
      media.filter((item) => {
        const mime = String(item.mimeType || '').toLowerCase();
        const name = String(item.originalName || '').toLowerCase();
        return (
          mime.startsWith('font/') ||
          mime.includes('x-font') ||
          mime === 'application/font-woff' ||
          name.endsWith('.woff2') ||
          name.endsWith('.woff') ||
          name.endsWith('.ttf') ||
          name.endsWith('.otf')
        );
      }),
    [media]
  );
  const filteredImageMedia = useMemo(() => {
    const q = mediaQuery.trim().toLowerCase();
    if (!q) return imageMedia;
    return imageMedia.filter((item) => {
      const inName = normalizeDisplayFileName(item.originalName).toLowerCase().includes(q);
      const inUrl = item.publicUrl.toLowerCase().includes(q);
      const inId = String(item.id).includes(q);
      return inName || inUrl || inId;
    });
  }, [imageMedia, mediaQuery]);

  const mediaUsageMap = useMemo(() => {
    const byId = new Map<number, MediaUsage[]>();
    const byUrl = new Map<string, MediaUsage[]>();

    const addUsage = (id: number | null, url: string | null, usage: MediaUsage) => {
      if (id && Number.isFinite(id) && id > 0) {
        const prev = byId.get(id) ?? [];
        byId.set(id, [...prev, usage]);
      }
      if (url) {
        const prev = byUrl.get(url) ?? [];
        byUrl.set(url, [...prev, usage]);
      }
    };

    const walk = (value: unknown, pageKey: string, pageLabel: string, path = 'sections') => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, pageKey, pageLabel, `${path}.${index}`));
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
          walk(v, pageKey, pageLabel, `${path}.${k}`)
        );
        return;
      }
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        addUsage(value, null, { pageKey, pageLabel, path });
        return;
      }
      if (typeof value === 'string') {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber) && asNumber > 0) addUsage(asNumber, null, { pageKey, pageLabel, path });
        if (value.includes('/content/public/media/') || value.includes('/uploads/cms/')) {
          addUsage(null, value, { pageKey, pageLabel, path });
        }
      }
    };

    pages.forEach((p) => {
      walk(
        p.sections,
        p.pageKey,
        PAGE_KEY_DESCRIPTIONS[p.pageKey]?.label || p.pageKey
      );
    });

    // 저장 전 편집중 데이터도 사용처 계산에 포함
    walk(
      sectionsObject,
      selectedKey,
      PAGE_KEY_DESCRIPTIONS[selectedKey]?.label || selectedKey
    );

    return { byId, byUrl };
  }, [pages, sectionsObject, selectedKey]);

  const updateSectionsFromField = (path: string, value: unknown) => {
    const next = setValueByPath(sectionsObject, path, value);
    setSectionsObject(next);
    setSectionsText(JSON.stringify(next, null, 2));
  };

  const applyMediaToField = (field: FieldConfig, selected: CmsMedia) => {
    if (field.type !== 'image') return;
    const mediaFileUrl = `${apiBaseUrl}/content/public/media/${selected.id}/file`;
    const nextValue = field.imageValueType === 'mediaId' ? String(selected.id) : mediaFileUrl;
    updateSectionsFromField(field.path, nextValue);
    setMessage(`"${field.label}" 항목에 공용 이미지가 연결되었습니다.`);
    setPickerField(null);
  };

  const deleteMediaItem = async (mediaId: number) => {
    setMessage('');
    setError('');
    try {
      const target = media.find((m) => m.id === mediaId);
      const idUsages = mediaUsageMap.byId.get(mediaId) ?? [];
      const urlUsages = target ? mediaUsageMap.byUrl.get(target.publicUrl) ?? [] : [];
      const mergedUsageMap = new Map<string, MediaUsage>();
      [...idUsages, ...urlUsages].forEach((usage) => {
        const key = `${usage.pageKey}:${usage.path}`;
        mergedUsageMap.set(key, usage);
      });
      const usages = [...mergedUsageMap.values()];
      if (usages.length > 0) {
        const preview = usages
          .slice(0, 6)
          .map((u) => `- ${u.pageLabel} (${u.pageKey}) / ${u.path}`)
          .join('\n');
        const overflow = usages.length > 6 ? `\n외 ${usages.length - 6}건` : '';
        const shouldDelete = window.confirm(
          `이 이미지는 현재 콘텐츠에서 사용 중입니다.\n\n${preview}${overflow}\n\n그래도 삭제할까요?`
        );
        if (!shouldDelete) return;
      }

      const response = await fetch(`${apiBaseUrl}/content/admin/media/${mediaId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '이미지 삭제 실패');
      setMessage('공용 이미지함에서 이미지가 삭제되었습니다.');
      await loadMedia();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '이미지 삭제 중 오류');
    }
  };

  const typographyPreview = (() => {
    const t = (sectionsObject.typography ?? {}) as Record<string, unknown>;
    const enabled = t.enabled !== false;
    const bodyFallback = "'Noto Sans KR', 'Malgun Gothic', sans-serif";
    const headingFallback = "'Noto Sans KR', 'Malgun Gothic', sans-serif";
    const bodyFamily = `'CmsPreviewBody', ${bodyFallback}`;
    const headingFamily = `'CmsPreviewHeading', 'CmsPreviewBody', ${headingFallback}`;
    const bodyMediaId = Number(t.bodyFontMediaId ?? t.fontMediaId ?? 0);
    const bodyMediaIdEn = Number(t.bodyFontMediaIdEn ?? t.fontMediaIdEn ?? 0);
    const headingMediaId = Number(t.headingFontMediaId ?? 0);
    const headingMediaIdEn = Number(t.headingFontMediaIdEn ?? 0);
    const bodyUrl = Number.isFinite(bodyMediaId) && bodyMediaId > 0 ? `${apiBaseUrl}/content/public/media/${bodyMediaId}/file` : '';
    const bodyUrlEn = Number.isFinite(bodyMediaIdEn) && bodyMediaIdEn > 0 ? `${apiBaseUrl}/content/public/media/${bodyMediaIdEn}/file` : '';
    const headingUrl = Number.isFinite(headingMediaId) && headingMediaId > 0 ? `${apiBaseUrl}/content/public/media/${headingMediaId}/file` : '';
    const headingUrlEn = Number.isFinite(headingMediaIdEn) && headingMediaIdEn > 0 ? `${apiBaseUrl}/content/public/media/${headingMediaIdEn}/file` : '';
    return { enabled, bodyFamily, headingFamily, bodyUrl, bodyUrlEn, headingUrl, headingUrlEn };
  })();

  useEffect(() => {
    const styleId = 'cms-font-preview-style';
    const prev = document.getElementById(styleId);
    if (prev?.parentNode) prev.parentNode.removeChild(prev);
    if (!typographyPreview.enabled) return;

    const koreanRange = 'U+1100-11FF, U+3130-318F, U+AC00-D7AF';
    const latinRange = 'U+0000-00FF, U+0100-024F';
    const blocks: string[] = [];
    const pushFace = (family: string, url: string, range: string) => {
      if (!url) return;
      blocks.push(`
        @font-face {
          font-family: '${family}';
          src: url('${url}') format('woff2'),
               url('${url}') format('woff'),
               url('${url}') format('truetype'),
               url('${url}') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
          unicode-range: ${range};
        }
      `);
    };

    pushFace('CmsPreviewBody', typographyPreview.bodyUrl, koreanRange);
    pushFace('CmsPreviewBody', typographyPreview.bodyUrlEn, latinRange);
    pushFace('CmsPreviewHeading', typographyPreview.headingUrl, koreanRange);
    pushFace('CmsPreviewHeading', typographyPreview.headingUrlEn, latinRange);

    if (blocks.length === 0) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = blocks.join('\n');
    document.head.appendChild(style);

    return () => {
      const current = document.getElementById(styleId);
      if (current?.parentNode) current.parentNode.removeChild(current);
    };
  }, [
    typographyPreview.enabled,
    typographyPreview.bodyUrl,
    typographyPreview.bodyUrlEn,
    typographyPreview.headingUrl,
    typographyPreview.headingUrlEn,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">프론트 콘텐츠 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          페이지별 콘텐츠를 폼으로 관리하고, 공용 이미지함에서 원하는 이미지를 바로 연결할 수 있습니다.
        </p>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">페이지 키</h3>
          <div className="space-y-2">
            {PRESET_PAGE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectPage(key)}
                className={`w-full text-left px-3 py-2 rounded-lg border ${
                  selectedKey === key ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-200'
                }`}
              >
                <span className="block text-sm font-semibold">
                  {PAGE_KEY_DESCRIPTIONS[key]?.label || key}
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  {PAGE_KEY_DESCRIPTIONS[key]?.description || '직접 추가한 페이지 콘텐츠입니다.'}
                </span>
                <span className="block text-xs text-gray-400 mt-1 font-mono">{key}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSavePage} className="lg:col-span-2 bg-white rounded-xl border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">페이지 키 <span className="text-red-600">*</span></label>
              <input
                value={selectedKey}
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                required
              />
              <p className="text-xs text-gray-500 mt-1">페이지 키는 프리셋 목록에서만 선택할 수 있습니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">타이틀 <span className="text-red-600">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">관리자 식별용 페이지 제목</p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            공개 상태
          </label>

          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <h4 className="font-semibold text-green-800 mb-2">사용자 입력 가이드</h4>
            <p className="text-sm text-green-700">
              JSON을 직접 수정하지 않아도 되도록 항목을 풀어서 보여드립니다. 각 입력칸 설명을 보고 텍스트를 입력하면 됩니다.
              이미지는 각 항목에서 직접 업로드하거나, 하단 공용 이미지함에서 선택해 연결할 수 있습니다.
            </p>
            {selectedKey === 'home' ? (
              <p className="text-sm text-green-700 mt-2">
                참고: 홈의 `추천상품` 항목은 메인 화면 홍보 카드용입니다. 실제 상품 정보(가격/재고/상품명)는 상품관리 DB에서 관리됩니다.
              </p>
            ) : null}
          </div>

          {selectedKey === 'site-layout' ? (
            <div className="rounded-lg border border-[#DCE8D8] bg-[#F8FBF6] p-4 space-y-3">
              <h4 className="font-semibold text-[#1A4D2E]">폰트 미리보기 샘플</h4>
              <p className="text-xs text-[#4F6F52]">한글/영문/숫자를 동시에 미리 확인해 시인성과 브랜드 톤을 비교하세요.</p>
              <div className="rounded-lg border border-[#E4EBDD] bg-white p-4">
                <p
                  className="text-2xl font-bold text-[#1A4D2E] mb-2"
                  style={{ fontFamily: typographyPreview.enabled ? typographyPreview.headingFamily : "'Noto Sans KR', 'Malgun Gothic', sans-serif" }}
                >
                  산골 Premium Headline Aa 123
                </p>
                <p style={{ fontFamily: typographyPreview.enabled ? typographyPreview.bodyFamily : "'Noto Sans KR', 'Malgun Gothic', sans-serif" }} className="text-sm text-gray-700 leading-relaxed">
                  한글: 자연의 건강함을 전합니다. / English: Fresh from SANGOL. / Numbers: 0123456789
                </p>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>적용 상태: {typographyPreview.enabled ? 'ON' : 'OFF'}</p>
                <p>본문(한글) 폰트 파일: {typographyPreview.bodyUrl || '미지정'}</p>
                <p>본문(영문) 폰트 파일: {typographyPreview.bodyUrlEn || '미지정'}</p>
                <p>제목(한글) 폰트 파일: {typographyPreview.headingUrl || '미지정'}</p>
                <p>제목(영문) 폰트 파일: {typographyPreview.headingUrlEn || '미지정'}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {sectionsGuide.length === 0 ? (
              <div className="border rounded-lg p-4 text-sm text-gray-500">
                이 페이지의 내부 텍스트/이미지 값이 아직 없습니다. 고급 모드(JSON)에서 먼저 구조를 추가해 주세요.
              </div>
            ) : null}

            {selectedKey === 'site-layout' && layoutTypographyFields.length > 0 ? (
              <div className="rounded-xl border border-[#D7E4D6] bg-[#F7FBF5] p-4 space-y-4">
                <div>
                  <h4 className="text-base font-bold text-[#1A4D2E]">폰트 설정</h4>
                  <p className="text-xs text-[#4F6F52] mt-1">
                    공통 레이아웃 최상단에서 전역 타이포그래피를 먼저 설정하세요.
                  </p>
                  <p className="text-xs text-[#4F6F52] mt-1">등록된 폰트 파일: {fontMedia.length}개</p>
                </div>
                {layoutTypographyFields.map((field) => (
                  <div key={field.path || field.label} className="border rounded-lg p-4 bg-white">
                    <p className="text-sm font-semibold text-gray-800">{field.label}</p>
                  <p className="text-xs text-gray-500 mt-1 mb-2">{getEnhancedDescription(field)}</p>

                    {field.path ? (
                      <>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={getValueByPath(sectionsObject, field.path)}
                            onChange={(e) => updateSectionsFromField(field.path, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                            className={`w-full border rounded-lg px-3 py-2 text-sm min-h-24 ${
                              field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                            }`}
                          />
                        ) : field.type === 'toggle' ? (
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            {(() => {
                              const raw = getRawValueByPath(sectionsObject, field.path);
                              const checked = field.path.endsWith('.enabled') ? raw !== false : Boolean(raw);
                              return (
                                <>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => updateSectionsFromField(field.path, e.target.checked)}
                                    disabled={field.disabled}
                                  />
                                  {checked ? '사용' : '미사용'}
                                </>
                              );
                            })()}
                          </label>
                        ) : field.type === 'font' ? (
                          <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-200 text-violet-900 font-semibold">폰트 파일</span>
                              <span className="text-xs text-violet-700">웹폰트 전용</span>
                            </div>
                            <p className="mt-1">
                              현재 연결 파일: <span className="font-medium">{getMediaNameFromValue(getValueByPath(sectionsObject, field.path))}</span>
                            </p>
                          </div>
                        ) : (
                          <input
                            value={getValueByPath(sectionsObject, field.path)}
                            onChange={(e) => updateSectionsFromField(field.path, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                            className={`w-full border rounded-lg px-3 py-2 text-sm ${
                              field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                            }`}
                          />
                        )}

                        {field.type === 'font' ? (
                          <div className="mt-3 space-y-2">
                            <input
                              type="file"
                              accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                              onChange={(e) =>
                              onUploadFont(e.target.files?.[0] || null, ({ id, originalName }) => {
                                const nextWithId = setValueByPath(sectionsObject, field.path, String(id));
                                const familyPath = getFontFamilyPathByMediaPath(field.path);
                                const autoFamily = `Sangol${sanitizeFontFamilyToken(originalName)}${id}`;
                                const next = familyPath ? setValueByPath(nextWithId, familyPath, autoFamily) : nextWithId;
                                setSectionsObject(next);
                                setSectionsText(JSON.stringify(next, null, 2));
                              })
                            }
                              disabled={uploading || field.disabled}
                              className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500">
                              폰트 업로드 가이드: woff2 권장, 최대 20MB. 업로드 후 front 전역 폰트에 자동 반영됩니다.
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {(selectedKey === 'site-layout' ? layoutGeneralFields : sectionsGuide).map((field) => (
              <div key={field.path || field.label} className="border rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-800">{field.label}</p>
                <p className="text-xs text-gray-500 mt-1 mb-2">{getEnhancedDescription(field)}</p>

                {field.path ? (
                  <>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={getValueByPath(sectionsObject, field.path)}
                        onChange={(e) => updateSectionsFromField(field.path, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={field.disabled}
                        className={`w-full border rounded-lg px-3 py-2 text-sm min-h-24 ${
                          field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                      />
                    ) : field.type === 'toggle' ? (
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        {(() => {
                          const raw = getRawValueByPath(sectionsObject, field.path);
                          const checked = field.path.endsWith('.enabled') ? raw !== false : Boolean(raw);
                          return (
                            <>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => updateSectionsFromField(field.path, e.target.checked)}
                                disabled={field.disabled}
                              />
                              {checked ? '사용' : '미사용'}
                            </>
                          );
                        })()}
                      </label>
                    ) : field.type === 'font' ? (
                      <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-200 text-violet-900 font-semibold">폰트 파일</span>
                          <span className="text-xs text-violet-700">웹폰트 전용</span>
                        </div>
                        <p className="mt-1">
                          현재 연결 파일: <span className="font-medium">{getMediaNameFromValue(getValueByPath(sectionsObject, field.path))}</span>
                        </p>
                      </div>
                    ) : (
                      <input
                        value={getValueByPath(sectionsObject, field.path)}
                        onChange={(e) => updateSectionsFromField(field.path, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={field.disabled}
                        className={`w-full border rounded-lg px-3 py-2 text-sm ${
                          field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                      />
                    )}

                    {field.type === 'image' ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            onUploadMedia(e.target.files?.[0] || null, ({ id, url }) =>
                              updateSectionsFromField(field.path, field.imageValueType === 'mediaId' ? String(id) : url)
                            )
                          }
                          disabled={uploading || field.disabled}
                          className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPickerField(field)}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
                            disabled={field.disabled}
                          >
                            공용 이미지함에서 선택
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSectionsFromField(field.path, '')}
                            className="px-3 py-1.5 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                            disabled={field.disabled}
                          >
                            연결 해제
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          선택 안내: "공용 이미지함에서 선택"을 누르면 업로드된 이미지 목록에서 바로 연결할 수 있습니다.
                        </p>
                        {getImagePreviewSrc(field) ? (
                          <img
                            src={getImagePreviewSrc(field)}
                            alt={field.label}
                            className="h-24 w-auto rounded border object-cover"
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {field.type === 'font' ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="file"
                          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                          onChange={(e) =>
                            onUploadFont(e.target.files?.[0] || null, ({ id, originalName }) => {
                              const nextWithId = setValueByPath(sectionsObject, field.path, String(id));
                              const familyPath = getFontFamilyPathByMediaPath(field.path);
                              const autoFamily = `Sangol${sanitizeFontFamilyToken(originalName)}${id}`;
                              const next = familyPath ? setValueByPath(nextWithId, familyPath, autoFamily) : nextWithId;
                              setSectionsObject(next);
                              setSectionsText(JSON.stringify(next, null, 2));
                            })
                          }
                          disabled={uploading || field.disabled}
                          className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500">
                          폰트 업로드 가이드: woff2 권장, 최대 20MB. 업로드 후 front 전역 폰트에 자동 반영됩니다.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} />
              고급 모드(JSON 직접 편집)
            </label>
          </div>

          {advancedMode ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">sections (JSON) <span className="text-red-600">*</span></label>
                <textarea
                  value={sectionsText}
                  onChange={(e) => {
                    setSectionsText(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                      setSectionsObject(parsed);
                    } catch (_error) {
                      // JSON 입력중 임시 에러는 저장 시점에 검증
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm min-h-52"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">seo (JSON) <span className="text-red-600">*</span></label>
                <textarea
                  value={seoText}
                  onChange={(e) => setSeoText(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm min-h-28"
                  required
                />
              </div>
            </>
          ) : null}

          <button type="submit" className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg">
            저장
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-4">
        <h3 className="font-semibold text-gray-800">이미지 라이브러리</h3>
        <p className="text-xs text-gray-500">
          공용 이미지함입니다. 업로드 후 각 이미지 항목에서 "공용 이미지함에서 선택"으로 재사용할 수 있습니다.
        </p>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
          사용 팁: 이미지 순서를 숫자로 외우지 않아도 됩니다. 각 항목에서 파일명/썸네일을 보고 선택하면 자동 연결됩니다.
        </div>
        <input
          value={mediaQuery}
          onChange={(e) => setMediaQuery(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="이미지 검색 (파일명, URL, ID)"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onUploadMedia(e.target.files?.[0] || null)}
          disabled={uploading}
          className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredImageMedia.map((item) => (
            <div key={item.id} className="border rounded-lg p-3">
              <img src={item.publicUrl} alt={normalizeDisplayFileName(item.originalName)} className="w-full h-28 object-cover rounded-md mb-2" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-700 truncate">{normalizeDisplayFileName(item.originalName)}</p>
                {(mediaUsageMap.byId.get(item.id)?.length || 0) > 0 ||
                (mediaUsageMap.byUrl.get(item.publicUrl)?.length || 0) > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">사용중</span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 truncate">ID: {item.id}</p>
              <p className="text-xs text-gray-500 truncate">{item.publicUrl}</p>
              {(() => {
                const idUsages = mediaUsageMap.byId.get(item.id) ?? [];
                const urlUsages = mediaUsageMap.byUrl.get(item.publicUrl) ?? [];
                const usageCount = new Set(
                  [...idUsages, ...urlUsages].map((u) => `${u.pageKey}:${u.path}`)
                ).size;
                if (usageCount === 0) return null;
                const sample = [...idUsages, ...urlUsages][0];
                return (
                  <p className="text-[11px] text-green-700 mt-1 truncate">
                    사용처 {usageCount}건 · 예: {sample.pageLabel} / {sample.path}
                  </p>
                );
              })()}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(item.publicUrl)}
                  className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                >
                  URL 복사
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(String(item.id))}
                  className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                >
                  ID 복사
                </button>
                <button
                  type="button"
                  onClick={() => void deleteMediaItem(item.id)}
                  className="px-2 py-1 text-[11px] rounded border border-red-200 text-red-700 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pickerField ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[80vh] overflow-hidden rounded-xl bg-white border shadow-xl">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">공용 이미지 선택</p>
                <p className="text-xs text-gray-500 mt-1">
                  대상 항목: {pickerField.label} ({getFieldOrderHint(pickerField.path) || '단일 항목'})
                </p>
              </div>
              <button type="button" onClick={() => setPickerField(null)} className="text-sm px-3 py-1 border rounded-md">
                닫기
              </button>
            </div>
            <div className="p-4 border-b">
              <input
                value={mediaQuery}
                onChange={(e) => setMediaQuery(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="선택할 이미지 검색 (파일명, URL, ID)"
              />
            </div>
            <div className="p-4 overflow-auto max-h-[60vh] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredImageMedia.map((item) => (
                <button
                  key={`picker-${item.id}`}
                  type="button"
                  onClick={() => applyMediaToField(pickerField, item)}
                  className="text-left border rounded-lg p-3 hover:border-green-300 hover:bg-green-50/30"
                >
                  <img src={item.publicUrl} alt={normalizeDisplayFileName(item.originalName)} className="w-full h-28 object-cover rounded-md mb-2" />
                  <p className="text-xs font-medium text-gray-800 truncate">{normalizeDisplayFileName(item.originalName)}</p>
                  <p className="text-[11px] text-gray-500 truncate">ID: {item.id}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
