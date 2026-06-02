/**
 * site-layout CMS 초기 콘텐츠 — 헤더 상단 메뉴·푸터·로고
 * 예전 front/Layout.tsx 하드코딩·sangol-website-text.txt 기준
 */
export const SITE_LAYOUT_CMS_DEFAULT_SECTIONS: Record<string, unknown> = {
  topMenu: {
    loginLabel: '가맹점 로그인',
    loginLink: '/login',
    mypageLabel: '마이페이지',
    mypageLink: '/mypage',
    noticeText: '신규가맹점 첫 구매 10% 할인',
  },
  logo: {
    headerLogoMediaId: '',
    footerLogoMediaId: '',
  },
  typography: {
    enabled: true,
    fontMediaId: '',
    fontMediaIdEn: '',
    fontFamilyName: '',
    fontFamilyNameEn: '',
  },
  footer: {
    ownerName: '정현철',
    address: '강원특별자치도 화천군 사내면 검단길 213-49',
    csPhone: '1522-4680',
    fax: '02-784-8222',
    email: 'sangol2017@naver.com',
    copyright: 'Copyright(c) 농업법인㈜산골. All Rights Reserved.',
  },
};

export const SITE_LAYOUT_MEDIA_BINDINGS = [
  { field: 'headerLogoMediaId', originalName: 'logo.png' },
  { field: 'footerLogoMediaId', originalName: 'ft_logo.png' },
] as const;
