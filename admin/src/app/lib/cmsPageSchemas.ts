/**
 * CMS pages empty structure only — no marketing copy.
 * DB is the source of truth; admin merges this shape when keys are missing.
 */
export const PAGE_SECTION_SCHEMAS: Record<string, Record<string, unknown>> = {
  'site-layout': {
    topMenu: {
      loginLabel: '',
      loginLink: '',
      mypageLabel: '',
      mypageLink: '',
      noticeText: '',
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
      ownerName: '',
      address: '',
      csPhone: '',
      fax: '',
      email: '',
      copyright: '',
    },
  },
  home: {
    hero: { subtitle: '', title: '', subtitle2: '' },
    heroImages: ['', '', ''],
    heroActions: [{ label: '', link: '', variant: 'primary' }],
    trustBadges: [
      { title: '', desc: '', iconMediaId: '', iconUrl: '' },
      { title: '', desc: '', iconMediaId: '', iconUrl: '' },
      { title: '', desc: '', iconMediaId: '', iconUrl: '' },
      { title: '', desc: '', iconMediaId: '', iconUrl: '' },
    ],
    features: [
      { title: '', desc: '', link: '', img: '' },
      { title: '', desc: '', link: '', img: '' },
      { title: '', desc: '', link: '', img: '' },
      { title: '', desc: '', link: '', img: '' },
    ],
    intro: { iconUrl: '', title: '', description1: '', description2: '' },
    support: { phone: '', notice: '' },
  },
  order: {
    payment: { accountName: '', accountNumber: '', requiredNotice: '' },
  },
  'company-greeting': {
    headerTitle: '',
    headerSubtitle: '',
    messageTitle: '',
    headerBannerImage: '',
    body: { lead: '', paragraphs: ['', '', ''], closingThanks: '', closingSign: '' },
  },
  'company-history': {
    header: { title: '', subtitle: '' },
    body: { title: '', subtitle: '' },
    headerBannerImage: '',
  },
  'company-awards': {
    header: { title: '', subtitle: '' },
    body: { title: '', subtitle: '' },
    headerBannerImage: '',
    certMediaIds: ['', '', ''],
  },
  'company-location': {
    header: { title: '', subtitle: '', bannerImage: '' },
    headOffice: { title: '', subTitle: '', address: '', phone: '', fax: '' },
    directStore: { title: '', subTitle: '', address: '', phone: '', fax: '' },
    table: { title: '', subtitle: '', dateText: '' },
  },
  'business-philosophy': {
    header: { title: '', subtitle: '' },
    intro: { title: '', description: '' },
    philosophies: [
      { title: '', description: '', imageUrl: '' },
      { title: '', description: '', imageUrl: '' },
      { title: '', description: '', imageUrl: '' },
    ],
  },
  'business-vision': {
    header: { title: '', subtitle: '' },
    headerBannerImage: '',
    visionPillars: [
      { step: '', title: '', description: '' },
      { step: '', title: '', description: '' },
      { step: '', title: '', description: '' },
    ],
  },
  'business-core-competence': {
    header: { title: '', subtitle: '' },
    intro: { title: '', description: '' },
    competencies: [
      { num: '', title: '', description: '', imageUrl: '' },
      { num: '', title: '', description: '', imageUrl: '' },
      { num: '', title: '', description: '', imageUrl: '' },
      { num: '', title: '', description: '', imageUrl: '' },
    ],
  },
  'business-farm': {
    header: { title: '', subtitle: '' },
    body: { title: '', description: '' },
    headerBannerImage: '',
  },
  support: {
    header: { title: '', subtitle: '', bannerImage: '' },
    consult: { phone: '', weekday: '', lunch: '', closed: '' },
    privacyText: '',
    faqs: [],
  },
};

export const CMS_PAGE_TITLES: Record<string, string> = {
  'site-layout': '사이트 공통',
  home: '메인 홈',
  'company-greeting': '인사말',
  'company-history': '연혁',
  'company-awards': '수상 및 인증',
  'company-location': '오시는 길',
  'business-philosophy': '경영철학',
  'business-vision': '비전',
  'business-core-competence': '핵심역량',
  'business-farm': '농장소개',
  support: '고객센터',
  order: '주문 페이지',
};
