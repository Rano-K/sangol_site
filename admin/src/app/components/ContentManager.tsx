import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { CmsFieldEditorPart } from './cms/CmsFieldEditorPart';
import type { CmsFieldConfig } from './cms/CmsFieldEditorCard';
import { groupFieldsIntoParts } from './cms/cmsFieldGrouping';
import { CmsPageOverviewPreview } from './cms/CmsPageWireframe';
import { getFrontPreviewUrl } from './cms/cmsFieldPlacementMeta';
import { resolveCmsFieldLink } from './cms/cmsFieldLinkMeta';
import { API_BASE_URL } from '../lib/apiBaseUrl';
import { CMS_PAGE_TITLES, PAGE_SECTION_SCHEMAS } from '../lib/cmsPageSchemas';

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
  fileUrl?: string;
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
type FieldGroup = {
  id: string;
  title: string;
  description: string;
  fields: FieldConfig[];
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
    description: '첫 화면의 메인 비주얼, 핵심역량 카드 텍스트/이미지, 고객센터 문구를 관리합니다.',
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

const PAGE_FIELD_CONFIGS: Record<string, FieldConfig[]> = {
  'site-layout': [
    { path: 'topMenu.loginLabel', label: '상단 메뉴 > 로그인', description: '상단 우측 로그인 메뉴 문구', type: 'text' },
    {
      path: 'topMenu.loginLink',
      label: '상단 메뉴 > 로그인 이동 경로',
      description: '예: /login',
      type: 'text',
      placeholder: '/login',
    },
    { path: 'topMenu.mypageLabel', label: '상단 메뉴 > 마이페이지', description: '상단 우측 마이페이지 문구', type: 'text' },
    {
      path: 'topMenu.mypageLink',
      label: '상단 메뉴 > 마이페이지 이동 경로',
      description: '예: /mypage',
      type: 'text',
      placeholder: '/mypage',
    },
    { path: 'topMenu.noticeText', label: '상단 공지 문구', description: '헤더 최상단 중앙에 노출되는 혜택 문구', type: 'text' },
    {
      path: 'logo.headerLogoMediaId',
      label: '헤더 로고',
      description: '헤더 좌측 로고. 공용 이미지함에서 선택하거나 업로드하면 DB(media)에 저장됩니다.',
      type: 'image',
      imageValueType: 'mediaId',
    },
    {
      path: 'logo.footerLogoMediaId',
      label: '푸터 로고',
      description: '푸터 로고. 공용 이미지함에서 선택하거나 업로드하면 DB(media)에 저장됩니다.',
      type: 'image',
      imageValueType: 'mediaId',
    },
    {
      path: 'typography.enabled',
      label: '전역 폰트 적용 여부',
      description: '체크하면 업로드한 폰트를 front 전체에 적용합니다.',
      type: 'toggle',
    },
    {
      path: 'typography.fontMediaId',
      label: '전역 한글 폰트',
      description: '제목·본문 등 사이트 전체 한글에 적용됩니다. (woff2 권장)',
      type: 'font',
    },
    {
      path: 'typography.fontMediaIdEn',
      label: '전역 영문·숫자 폰트',
      description: '제목·본문 등 사이트 전체 영문·숫자에 적용됩니다. (woff2 권장)',
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
    { path: 'hero.subtitle', label: '메인 비주얼 > 보조 문구 1', description: '히어로 상단 보조 텍스트', type: 'text' },
    { path: 'hero.title', label: '메인 비주얼 > 메인 문구', description: '히어로 중앙 H1 텍스트 (줄바꿈은 Enter)', type: 'textarea' },
    { path: 'hero.subtitle2', label: '메인 비주얼 > 보조 문구 2', description: '메인 문구(H1) 바로 아래 보조 텍스트', type: 'text' },
    { path: 'heroActions.0.label', label: '히어로 버튼 문구', description: '메인 CTA 버튼 문구', type: 'text' },
    {
      path: 'heroActions.0.link',
      label: '히어로 버튼 이동 경로',
      description: '예: /products/forest',
      type: 'text',
      placeholder: '/products/forest',
    },
    { path: 'heroActions.0.variant', label: '히어로 버튼 스타일', description: 'primary 또는 outline', type: 'text' },
    { path: 'heroImages.0', label: '메인 비주얼 이미지 1', description: '첫 번째 슬라이드 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'heroImages.1', label: '메인 비주얼 이미지 2', description: '두 번째 슬라이드 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'heroImages.2', label: '메인 비주얼 이미지 3', description: '세 번째 슬라이드 배경 이미지', type: 'image', imageValueType: 'url' },
    { path: 'trustBadges.0.title', label: '신뢰배지 1 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.0.desc', label: '신뢰배지 1 설명', description: '짧은 부가설명', type: 'text' },
    {
      path: 'trustBadges.0.iconMediaId',
      label: '신뢰배지 1 아이콘',
      description: '공용 이미지함에서 선택',
      type: 'image',
      imageValueType: 'mediaId',
    },
    { path: 'trustBadges.1.title', label: '신뢰배지 2 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.1.desc', label: '신뢰배지 2 설명', description: '짧은 부가설명', type: 'text' },
    {
      path: 'trustBadges.1.iconMediaId',
      label: '신뢰배지 2 아이콘',
      description: '공용 이미지함에서 선택',
      type: 'image',
      imageValueType: 'mediaId',
    },
    { path: 'trustBadges.2.title', label: '신뢰배지 3 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.2.desc', label: '신뢰배지 3 설명', description: '짧은 부가설명', type: 'text' },
    {
      path: 'trustBadges.2.iconMediaId',
      label: '신뢰배지 3 아이콘',
      description: '공용 이미지함에서 선택',
      type: 'image',
      imageValueType: 'mediaId',
    },
    { path: 'trustBadges.3.title', label: '신뢰배지 4 제목', description: '상단 신뢰배지 타이틀', type: 'text' },
    { path: 'trustBadges.3.desc', label: '신뢰배지 4 설명', description: '짧은 부가설명', type: 'text' },
    {
      path: 'trustBadges.3.iconMediaId',
      label: '신뢰배지 4 아이콘',
      description: '공용 이미지함에서 선택',
      type: 'image',
      imageValueType: 'mediaId',
    },
    { path: 'features.0.title', label: '핵심역량 카드 1 제목', description: '메인 중단 카드 영역 텍스트', type: 'text' },
    { path: 'features.0.desc', label: '핵심역량 카드 1 설명', description: '메인 중단 카드 영역 설명', type: 'textarea' },
    { path: 'features.0.img', label: '핵심역량 카드 1 이미지', description: '메인 중단 카드 이미지', type: 'image', imageValueType: 'url' },
    {
      path: 'features.0.link',
      label: '핵심역량 카드 1 이동 경로',
      description: '예: /business/core-competence',
      type: 'text',
      placeholder: '/business/core-competence',
    },
    { path: 'features.1.title', label: '핵심역량 카드 2 제목', description: '메인 중단 카드 영역 텍스트', type: 'text' },
    { path: 'features.1.desc', label: '핵심역량 카드 2 설명', description: '메인 중단 카드 영역 설명', type: 'textarea' },
    { path: 'features.1.img', label: '핵심역량 카드 2 이미지', description: '메인 중단 카드 이미지', type: 'image', imageValueType: 'url' },
    {
      path: 'features.1.link',
      label: '핵심역량 카드 2 이동 경로',
      description: '예: /company/awards',
      type: 'text',
      placeholder: '/company/awards',
    },
    { path: 'features.2.title', label: '핵심역량 카드 3 제목', description: '메인 중단 카드 영역 텍스트', type: 'text' },
    { path: 'features.2.desc', label: '핵심역량 카드 3 설명', description: '메인 중단 카드 영역 설명', type: 'textarea' },
    { path: 'features.2.img', label: '핵심역량 카드 3 이미지', description: '메인 중단 카드 이미지', type: 'image', imageValueType: 'url' },
    {
      path: 'features.2.link',
      label: '핵심역량 카드 3 이동 경로',
      description: '예: /company/awards',
      type: 'text',
      placeholder: '/company/awards',
    },
    { path: 'features.3.title', label: '핵심역량 카드 4 제목', description: '메인 중단 카드 영역 텍스트', type: 'text' },
    { path: 'features.3.desc', label: '핵심역량 카드 4 설명', description: '메인 중단 카드 영역 설명', type: 'textarea' },
    { path: 'features.3.img', label: '핵심역량 카드 4 이미지', description: '메인 중단 카드 이미지', type: 'image', imageValueType: 'url' },
    {
      path: 'features.3.link',
      label: '핵심역량 카드 4 이동 경로',
      description: '예: /business/farm',
      type: 'text',
      placeholder: '/business/farm',
    },
    { path: 'intro.iconUrl', label: '브랜드 스토리 > 상단 아이콘', description: '리프 아이콘 대신 사용할 이미지(URL)', type: 'image', imageValueType: 'url' },
    { path: 'intro.title', label: '브랜드 스토리 > 제목', description: '예: "신뢰를 바탕으로 건강한 먹거리를 공급합니다"', type: 'text' },
    { path: 'intro.description1', label: '브랜드 스토리 > 본문 1', description: '메인 중단 브랜드 스토리 영역 첫 번째 문단', type: 'textarea' },
    { path: 'intro.description2', label: '브랜드 스토리 > 본문 2', description: '메인 중단 브랜드 스토리 영역 두 번째 문단', type: 'textarea' },
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
  order: [
    {
      path: 'payment.accountName',
      label: '입금 안내 > 계좌명',
      description: '마이페이지 및 주문완료 모달에 노출되는 입금 계좌명',
      type: 'text',
      placeholder: '예: 농업회사법인 (주)산골',
    },
    {
      path: 'payment.accountNumber',
      label: '입금 안내 > 계좌번호',
      description: '마이페이지 및 주문완료 모달에 노출되는 입금 계좌번호',
      type: 'text',
      placeholder: '예: 농협 351-0000-0000-00',
    },
    {
      path: 'payment.requiredNotice',
      label: '입금 안내 > 필수 입금 안내문구',
      description: '빨간색 강조 문구로 노출됩니다.',
      type: 'textarea',
      placeholder: '예: ※ 반드시 입금 후 주문을 확정해 주세요. 미입금 시 출고가 진행되지 않습니다.',
    },
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
    .map((part) => {
      if (/^\d+$/.test(part)) return `${Number(part) + 1}번 항목`;
      const keyMap: Record<string, string> = {
        topMenu: '상단 메뉴',
        logo: '로고',
        typography: '폰트',
        footer: '하단 정보',
        header: '상단 제목 영역',
        consult: '상담 안내 영역',
        privacyText: '개인정보 안내 문구',
        hero: '메인 배너',
        heroActions: '메인 배너 버튼',
        heroImages: '메인 배너 이미지',
        trustBadges: '신뢰 배지',
        features: '주요 기능 안내 카드',
        intro: '첫 화면 상단 소개 영역',
        support: '하단 문의 안내 영역',
        payment: '입금 안내',
      };
      return keyMap[part] || part.replace(/([a-z])([A-Z])/g, '$1 $2');
    })
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

const shouldHideFieldInAdmin = (pageKey: string, path: string): boolean => {
  if (pageKey === 'site-layout' && /^typography\.(heading|body)Font/i.test(path)) return true;
  if (pageKey === 'site-layout' && /^typography\.fontFamilyName/i.test(path)) return true;
  if (pageKey === 'site-layout' && /^logo\.(header|footer)LogoUrl$/i.test(path)) return true;
  if (
    pageKey === 'site-layout' &&
    path.startsWith('logo.') &&
    path !== 'logo.headerLogoMediaId' &&
    path !== 'logo.footerLogoMediaId'
  ) {
    return true;
  }
  // 운영자 화면에서는 미사용 레거시 지도 키를 숨긴다. (실제 지도는 address 기반 렌더링)
  if (pageKey === 'company-location' && /(^|\.)mapKey$/i.test(path)) return true;
  if (pageKey === 'home' && path.startsWith('featuredCards.')) return true;
  if (pageKey === 'home' && path.startsWith('communityPosts.')) return true;
  if (pageKey === 'support' && path.startsWith('faqs.')) return true;
  return false;
};

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
    return [
      {
        path: prefix,
        label: toLabelFromPath(prefix),
        description: /(^|\.)link$/i.test(prefix) ? '클릭 시 이동할 사이트 내부 경로' : '페이지 내부 값',
        type: fieldType,
        imageValueType: fieldType === 'image' ? guessImageValueType(prefix) : undefined,
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

const mergeTemplateSections = (pageKey: string, sections: Record<string, unknown>): Record<string, unknown> => {
  const template = PAGE_SECTION_SCHEMAS[pageKey];
  if (!template) return sections;

  const mergeDeep = (base: unknown, current: unknown): unknown => {
    if (Array.isArray(base)) {
      const currentArray = Array.isArray(current) ? current : [];
      return base.map((item, index) => mergeDeep(item, currentArray[index]));
    }
    if (base && typeof base === 'object') {
      const baseObj = base as Record<string, unknown>;
      const currentObj = current && typeof current === 'object' ? (current as Record<string, unknown>) : {};
      const merged: Record<string, unknown> = { ...currentObj };
      Object.entries(baseObj).forEach(([key, value]) => {
        merged[key] = mergeDeep(value, currentObj[key]);
      });
      return merged;
    }
    if (current === undefined || current === null || current === '') return base;
    return current;
  };

  return mergeDeep(template, sections) as Record<string, unknown>;
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
  if (mediaPath === 'typography.fontMediaId') return 'typography.fontFamilyName';
  if (mediaPath === 'typography.fontMediaIdEn') return 'typography.fontFamilyNameEn';
  return null;
};

/** 제목/본문 분리 폰트 키를 전역 한글·영문 2종으로 정리 */
const normalizeTypographySections = (sections: Record<string, unknown>): Record<string, unknown> => {
  const raw = sections.typography;
  if (!raw || typeof raw !== 'object') return sections;

  const t = raw as Record<string, unknown>;
  const pickMediaId = (...keys: string[]): unknown => {
    for (const key of keys) {
      const v = t[key];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
  };
  const pickFamilyName = (...keys: string[]): unknown => {
    for (const key of keys) {
      const v = t[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };

  const typography: Record<string, unknown> = {
    enabled: t.enabled !== false,
    fontMediaId: pickMediaId('fontMediaId', 'bodyFontMediaId', 'headingFontMediaId'),
    fontMediaIdEn: pickMediaId('fontMediaIdEn', 'bodyFontMediaIdEn', 'headingFontMediaIdEn'),
    fontFamilyName: pickFamilyName('fontFamilyName', 'bodyFontFamilyName', 'headingFontFamilyName'),
    fontFamilyNameEn: pickFamilyName('fontFamilyNameEn', 'bodyFontFamilyNameEn', 'headingFontFamilyNameEn'),
  };

  return { ...sections, typography };
};

/** 로고는 mediaId 2개(헤더·푸터)만 유지하고 URL 등 레거시 키 제거 */
const normalizeLogoSections = (sections: Record<string, unknown>): Record<string, unknown> => {
  const raw = sections.logo;
  if (!raw || typeof raw !== 'object') {
    return { ...sections, logo: { headerLogoMediaId: '', footerLogoMediaId: '' } };
  }
  const logo = raw as Record<string, unknown>;
  const pickId = (...keys: string[]): string | number => {
    for (const key of keys) {
      const v = logo[key];
      if (v !== undefined && v !== null && v !== '') return v as string | number;
    }
    return '';
  };
  return {
    ...sections,
    logo: {
      headerLogoMediaId: pickId('headerLogoMediaId'),
      footerLogoMediaId: pickId('footerLogoMediaId'),
    },
  };
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
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

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
        const templateSections = mergeTemplateSections(pageKey, {});
        const nextSections = normalizeHomeSectionsKeys(pageKey, templateSections);
        setSectionsObject(nextSections);
        setSectionsText(JSON.stringify(nextSections, null, 2));
        setSeoText('{}');
        setPublished(true);
        return;
      }
      throw new Error(data?.error || '페이지 데이터 조회 실패');
    }

    setTitle(data.title || '');
    const normalizedSections = normalizeHomeSectionsKeys(pageKey, (data.sections ?? {}) as Record<string, unknown>);
    const mergedSections = mergeTemplateSections(pageKey, normalizedSections);
    const withLogo = pageKey === 'site-layout' ? normalizeLogoSections(mergedSections) : mergedSections;
    const withTypography =
      pageKey === 'site-layout' ? normalizeTypographySections(withLogo) : withLogo;
    setSectionsObject(withTypography);
    setSectionsText(JSON.stringify(withTypography, null, 2));
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
      const baseSections = advancedMode
        ? (JSON.parse(sectionsText) as Record<string, unknown>)
        : sectionsObject;
      const normalized = normalizeHomeSectionsKeys(selectedKey, baseSections);
      const withLogo = selectedKey === 'site-layout' ? normalizeLogoSections(normalized) : normalized;
      const withTypography =
        selectedKey === 'site-layout' ? normalizeTypographySections(withLogo) : withLogo;
      const sections = withTypography;
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

  const presetPageFields = (PAGE_FIELD_CONFIGS[selectedKey] ?? []).filter(
    (field) => !shouldHideFieldInAdmin(selectedKey, field.path)
  );
  const autoGeneratedFields = collectAutoFieldConfigs(sectionsObject).filter(
    (field) =>
      !presetPageFields.some((preset) => preset.path === field.path) &&
      !shouldHideFieldInAdmin(selectedKey, field.path)
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

  const getCmsMediaFileUrl = (mediaId: number): string =>
    `${apiBaseUrl}/content/public/media/${mediaId}/file`;

  const getMediaPreviewSrc = (item: CmsMedia): string =>
    item.fileUrl?.trim() || getCmsMediaFileUrl(item.id);

  const getImagePreviewSrc = (field: FieldConfig): string => {
    const rawValue = getValueByPath(sectionsObject, field.path);
    if (!rawValue) return '';
    if (field.imageValueType === 'mediaId') {
      const id = Number(rawValue);
      if (!Number.isFinite(id) || id <= 0) return '';
      return getCmsMediaFileUrl(id);
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
    const detailDescriptionMap: Record<string, string> = {
      'header.title': '이 문구는 해당 페이지 상단의 가장 큰 제목(H1)으로 노출됩니다.',
      'header.subtitle': '이 문구는 상단 큰 제목 바로 아래 보조 설명으로 노출됩니다.',
      'header.bannerImage': '이 이미지는 페이지 최상단 배경(배너)으로 노출됩니다.',
      'headOffice.title': '오시는길 페이지의 "본사 카드" 제목으로 표시됩니다.',
      'headOffice.address': '본사 카드 주소 문구 + 지도 위치 생성 기준 주소로 함께 사용됩니다.',
      'headOffice.phone': '본사 카드의 고객센터 전화번호로 노출됩니다.',
      'directStore.title': '오시는길 페이지의 "직영점 카드" 제목으로 표시됩니다.',
      'directStore.address': '직영점 카드 주소 문구 + 지도 위치 생성 기준 주소로 함께 사용됩니다.',
      'directStore.phone': '직영점 카드의 고객센터 전화번호로 노출됩니다.',
      privacyText: '문의폼 하단의 개인정보 안내 문구로 노출됩니다.',
    };
    const pathDescription =
      detailDescriptionMap[field.path] ||
      field.description;
    const orderHint = getFieldOrderHint(field.path);
    const valueTypeHint =
      field.type === 'image'
        ? field.imageValueType === 'mediaId'
          ? ' (미디어 ID가 자동으로 입력됩니다)'
          : ' (파일 URL이 자동으로 입력됩니다)'
        : '';
    return `${pathDescription}${orderHint ? ` · 화면 순서 ${orderHint}` : ''}${valueTypeHint}`;
  };

  const cmsGetValue = (path: string) => getValueByPath(sectionsObject, path);
  const cmsGetImageSrc = (path: string) => {
    const fieldGuess: FieldConfig = {
      path,
      label: '',
      description: '',
      type: 'image',
      imageValueType: guessImageValueType(path),
    };
    return getImagePreviewSrc(fieldGuess);
  };

  const renderFieldPart = (fields: FieldConfig[]) =>
    groupFieldsIntoParts(fields).map((part) => (
      <CmsFieldEditorPart
        key={part.id}
        pageKey={selectedKey}
        part={part}
        getValue={cmsGetValue}
        getRawValue={(path) => getRawValueByPath(sectionsObject, path)}
        getImageSrc={cmsGetImageSrc}
        resolveLink={(path) => resolveCmsFieldLink(selectedKey, path, cmsGetValue)}
        getEnhancedDescription={getEnhancedDescription}
        getImagePreviewSrc={getImagePreviewSrc}
        getMediaFileName={(path) => getMediaNameFromValue(getValueByPath(sectionsObject, path))}
        uploading={uploading}
        onTextChange={updateSectionsFromField}
        onToggleChange={updateSectionsFromField}
        onOpenMediaPicker={setPickerField}
        onClearImage={(path) => updateSectionsFromField(path, '')}
        onUploadImage={(field, file) =>
          onUploadMedia(file, ({ id, url }) =>
            updateSectionsFromField(field.path, field.imageValueType === 'mediaId' ? String(id) : url)
          )
        }
        onUploadFont={(field, file) =>
          onUploadFont(file, ({ id, originalName }) => {
            const nextWithId = setValueByPath(sectionsObject, field.path, String(id));
            const familyPath = getFontFamilyPathByMediaPath(field.path);
            const autoFamily = `Sangol${sanitizeFontFamilyToken(originalName)}${id}`;
            const next = familyPath ? setValueByPath(nextWithId, familyPath, autoFamily) : nextWithId;
            setSectionsObject(next);
            setSectionsText(JSON.stringify(next, null, 2));
          })
        }
      />
    ));

  const displayBaseFields = useMemo(
    () => (selectedKey === 'site-layout' ? layoutGeneralFields : sectionsGuide),
    [selectedKey, layoutGeneralFields, sectionsGuide]
  );
  const displayFieldGroups = useMemo<FieldGroup[]>(() => {
    if (selectedKey === 'site-layout') {
      const groupDefs: Array<{ id: string; title: string; description: string; matcher: (path: string) => boolean }> = [
        {
          id: 'site-top-menu',
          title: '1) 홈페이지 상단 메뉴 영역',
          description: '로그인/마이페이지/상단 공지 등 최상단 메뉴 문구를 관리합니다.',
          matcher: (path) => path.startsWith('topMenu.'),
        },
        {
          id: 'site-logo',
          title: '2) 홈페이지 로고 영역',
          description: '헤더·푸터 로고 각 1개(공용 이미지함 media ID). URL 직접 입력은 사용하지 않습니다.',
          matcher: (path) => path.startsWith('logo.'),
        },
        {
          id: 'site-font',
          title: '3) 전역 폰트 (한글 · 영문)',
          description: '사이트 전체(제목·본문)에 한글 1종, 영문·숫자 1종만 적용합니다.',
          matcher: (path) => path.startsWith('typography.'),
        },
        {
          id: 'site-footer',
          title: '4) 홈페이지 하단 정보 영역',
          description: '대표자/주소/고객센터 등 하단 고정 정보를 관리합니다.',
          matcher: (path) => path.startsWith('footer.'),
        },
      ];
      const grouped = groupDefs.map((def) => ({
        id: def.id,
        title: def.title,
        description: def.description,
        fields:
          def.id === 'site-font'
            ? layoutTypographyFields
            : displayBaseFields.filter((field) => def.matcher(field.path)),
      }));
      return grouped.filter((group) => group.fields.length > 0);
    }

    if (selectedKey === 'support') {
      const groupDefs: Array<{ id: string; title: string; description: string; matcher: (path: string) => boolean }> = [
        {
          id: 'support-header',
          title: '1) 고객센터 상단 소개 영역',
          description: '고객센터 페이지 첫 화면 제목/부제목/배너를 관리합니다.',
          matcher: (path) => path.startsWith('header.'),
        },
        {
          id: 'support-consult',
          title: '2) 상담 정보 영역',
          description: '전화번호, 상담시간, 휴무안내 문구를 관리합니다.',
          matcher: (path) => path.startsWith('consult.'),
        },
        {
          id: 'support-privacy',
          title: '3) 문의폼 안내 영역',
          description: '문의폼 하단 개인정보 안내 문구를 관리합니다.',
          matcher: (path) => path.startsWith('privacyText'),
        },
      ];
      const grouped = groupDefs.map((def) => ({
        id: def.id,
        title: def.title,
        description: def.description,
        fields: displayBaseFields.filter((field) => def.matcher(field.path)),
      }));
      return grouped.filter((group) => group.fields.length > 0);
    }

    if (selectedKey !== 'home') {
      return [
        {
          id: 'page-content',
          title: '1) 화면 구성 항목',
          description: '사용자 화면에서 위에서 아래 순서로 보이는 항목을 관리합니다.',
          fields: displayBaseFields,
        },
      ];
    }

    const groupDefs: Array<{
      id: string;
      title: string;
      description: string;
      matcher: (path: string) => boolean;
    }> = [
      {
        id: 'hero',
        title: '1) 메인 비주얼(최상단)',
        description: '첫 화면 상단 배너 영역입니다. 보조문구, 메인문구, 버튼, 배경 이미지를 수정합니다.',
        matcher: (path) => path.startsWith('hero.') || path.startsWith('heroActions.') || path.startsWith('heroImages.'),
      },
      {
        id: 'trust',
        title: '2) 신뢰 배지',
        description: '메인 비주얼 아래에 보이는 인증/신뢰 카드 영역입니다.',
        matcher: (path) => path.startsWith('trustBadges.'),
      },
      {
        id: 'features',
        title: '3) 핵심역량 카드',
        description: '메인 중단 4개 카드(제목/설명/이미지) 영역입니다.',
        matcher: (path) => path.startsWith('features.'),
      },
      {
        id: 'intro',
        title: '4) 브랜드 스토리 문단',
        description: '상단 아이콘, 제목, 소개 문단 2개를 수정하는 영역입니다.',
        matcher: (path) => path.startsWith('intro.'),
      },
      {
        id: 'support',
        title: '5) 하단 고객센터',
        description: '메인 하단 문의/전화번호 영역입니다.',
        matcher: (path) => path.startsWith('support.'),
      },
    ];

    const grouped = groupDefs.map((def) => ({
      id: def.id,
      title: def.title,
      description: def.description,
      fields: displayBaseFields.filter((field) => def.matcher(field.path)),
    }));

    const usedPaths = new Set(grouped.flatMap((group) => group.fields.map((field) => field.path)));
    const fallbackFields = displayBaseFields.filter((field) => !usedPaths.has(field.path));
    if (fallbackFields.length > 0) {
      grouped.push({
        id: 'others',
        title: '기타 항목',
        description: '현재 화면의 추가 항목입니다.',
        fields: fallbackFields,
      });
    }

    return grouped.filter((group) => group.fields.length > 0);
  }, [displayBaseFields, layoutTypographyFields, selectedKey]);

  const displayGroupKey = useMemo(
    () => `${selectedKey}:${displayFieldGroups.map((group) => group.id).join('|')}`,
    [selectedKey, displayFieldGroups]
  );

  useEffect(() => {
    if (displayFieldGroups.length === 0) {
      setExpandedGroupIds([]);
      return;
    }
    const first = displayFieldGroups[0].id;
    setExpandedGroupIds((prev) => {
      const valid = prev.filter((id) => displayFieldGroups.some((group) => group.id === id));
      return valid.length > 0 ? valid : [first];
    });
  }, [displayGroupKey]);

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
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
    const mediaFileUrl = getCmsMediaFileUrl(selected.id);
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
    const fallback = "'Noto Sans KR', 'Malgun Gothic', sans-serif";
    const globalFamily = `'CmsPreviewGlobal', ${fallback}`;
    const mediaId = Number(t.fontMediaId ?? t.bodyFontMediaId ?? t.headingFontMediaId ?? 0);
    const mediaIdEn = Number(t.fontMediaIdEn ?? t.bodyFontMediaIdEn ?? t.headingFontMediaIdEn ?? 0);
    const koUrl = Number.isFinite(mediaId) && mediaId > 0 ? `${apiBaseUrl}/content/public/media/${mediaId}/file` : '';
    const enUrl = Number.isFinite(mediaIdEn) && mediaIdEn > 0 ? `${apiBaseUrl}/content/public/media/${mediaIdEn}/file` : '';
    return { enabled, globalFamily, koUrl, enUrl };
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

    pushFace('CmsPreviewGlobal', typographyPreview.koUrl, koreanRange);
    pushFace('CmsPreviewGlobal', typographyPreview.enUrl, latinRange);

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
    typographyPreview.koUrl,
    typographyPreview.enUrl,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">프론트 콘텐츠 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          운영자가 실제 화면 기준으로 문구/이미지/아이콘을 수정할 수 있는 관리 화면입니다.
        </p>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">콘텐츠 화면 목록</h3>
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
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSavePage} className="lg:col-span-2 bg-white rounded-xl border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">선택 화면 <span className="text-red-600">*</span></label>
              <input
                value={selectedKey}
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                required
              />
              <p className="text-xs text-gray-500 mt-1">화면 코드는 자동 관리되며, 좌측 목록에서만 선택할 수 있습니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">관리 화면 이름 <span className="text-red-600">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">관리자가 구분하기 위한 이름입니다.</p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            공개 상태
          </label>

          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <h4 className="font-semibold text-green-800 mb-2">사용자 입력 가이드</h4>
            <p className="text-sm text-green-700">
              같은 화면 블록(예: 신뢰배지 1개)은 <strong>한 파트</strong>에 제목·설명·이미지를 함께 수정합니다.
              왼쪽 미리보기의 노란 테두리가 편집 위치이며, <strong className="text-indigo-800">남색 테두리</strong>는 링크가 있는 영역입니다.
              오른쪽에서 값을 수정하면 미리보기에 즉시 반영됩니다.
              이동 URL(<code className="text-xs">.link</code>)은 고정된 항목은 경로만 안내하고, 편집 가능한 항목만 JSON/필드로 노출됩니다.
            </p>
            {selectedKey === 'home' ? (
              <div className="text-sm text-green-700 mt-2 space-y-1">
                <p>인기 상품 영역: 이제 상품관리 DB(`/admin/products`) 데이터를 자동 반영하며, 이 화면에서 별도 편집하지 않습니다.</p>
                <p>핵심역량 카드 항목: 메인 페이지 중단의 "핵심역량 카드 4개"와 1:1로 연결됩니다.</p>
              </div>
            ) : null}
          </div>

          {sectionsGuide.length > 0 && !advancedMode ? (
            <div className="rounded-xl border border-[#DCE8D8] bg-[#F8FBF6] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-[#1A4D2E]">전체 화면 구성도</h4>
                  <p className="text-xs text-[#5F6C60] mt-1">
                    아래에서 항목을 펼치면 해당 영역이 노란색으로 강조됩니다.
                  </p>
                </div>
                <a
                  href={getFrontPreviewUrl(selectedKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A4D2E] px-3 py-1.5 rounded-lg border border-[#C5D4BE] bg-white hover:bg-[#F4F8F1]"
                >
                  실제 페이지에서 확인
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <CmsPageOverviewPreview
                pageKey={selectedKey}
                getValue={cmsGetValue}
                getImageSrc={cmsGetImageSrc}
              />
            </div>
          ) : null}

          <div className="space-y-4">
            {sectionsGuide.length === 0 ? (
              <div className="border rounded-lg p-4 text-sm text-gray-500">
                이 페이지의 내부 텍스트/이미지 값이 아직 없습니다. 고급 모드(JSON)에서 먼저 구조를 추가해 주세요.
              </div>
            ) : null}

            {displayFieldGroups.map((group) => (
              <div key={group.id} className="rounded-xl border border-[#E3E9DE] bg-[#FAFCF8] p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleGroupExpanded(group.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div>
                    <h4 className="text-base font-bold text-[#1A4D2E]">{group.title}</h4>
                    <p className="text-xs text-[#5F6C60] mt-1">{group.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#4F6F52] mt-1">
                    {expandedGroupIds.includes(group.id) ? '접기' : '펼치기'}
                  </span>
                </button>
                <div className={`space-y-4 ${expandedGroupIds.includes(group.id) ? '' : 'hidden'}`}>
                  {group.id === 'site-font' ? (
                    <div className="rounded-lg border border-[#DCE8D8] bg-[#F8FBF6] p-4 space-y-3 mb-2">
                      <p className="text-xs text-[#4F6F52]">
                        한글 1종 · 영문·숫자 1종만 등록합니다. 제목·본문 전체에 동일 적용됩니다.
                        (폰트 라이브러리 {fontMedia.length}개)
                      </p>
                      <div className="rounded-lg border border-[#E4EBDD] bg-white p-4 space-y-2">
                        <p
                          className="text-xl font-bold text-[#1A4D2E]"
                          style={{
                            fontFamily: typographyPreview.enabled
                              ? typographyPreview.globalFamily
                              : "'Noto Sans KR', 'Malgun Gothic', sans-serif",
                          }}
                        >
                          산골 Premium Aa 123
                        </p>
                        <p className="text-xs text-gray-600">
                          적용 {typographyPreview.enabled ? 'ON' : 'OFF'} · 한글{' '}
                          {typographyPreview.koUrl ? '연결' : '미지정'} · 영문{' '}
                          {typographyPreview.enUrl ? '연결' : '미지정'}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {renderFieldPart(group.fields)}
                </div>
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
              <img src={getMediaPreviewSrc(item)} alt={normalizeDisplayFileName(item.originalName)} className="w-full h-28 object-cover rounded-md mb-2" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-700 truncate">{normalizeDisplayFileName(item.originalName)}</p>
                {(mediaUsageMap.byId.get(item.id)?.length || 0) > 0 ||
                (mediaUsageMap.byUrl.get(getMediaPreviewSrc(item))?.length || 0) > 0 ||
                (mediaUsageMap.byUrl.get(item.publicUrl)?.length || 0) > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">사용중</span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 truncate">ID: {item.id}</p>
              <p className="text-xs text-gray-500 truncate">{getMediaPreviewSrc(item)}</p>
              {(() => {
                const idUsages = mediaUsageMap.byId.get(item.id) ?? [];
                const urlUsages = [
                  ...(mediaUsageMap.byUrl.get(getMediaPreviewSrc(item)) ?? []),
                  ...(mediaUsageMap.byUrl.get(item.publicUrl) ?? []),
                ];
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
                  onClick={() => navigator.clipboard.writeText(getMediaPreviewSrc(item))}
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
                  <img src={getMediaPreviewSrc(item)} alt={normalizeDisplayFileName(item.originalName)} className="w-full h-28 object-cover rounded-md mb-2" />
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
