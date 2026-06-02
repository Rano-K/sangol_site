/**
 * GNB 「브랜드소개」 하위 8개 페이지 CMS 초기 콘텐츠
 * (회사소개 4 + 사업소개 4) — 예전 front 하드코딩·기존 사이트 문구 기준
 */
export const BRAND_INTRO_PAGE_KEYS = [
  'company-greeting',
  'company-history',
  'company-awards',
  'company-location',
  'business-philosophy',
  'business-vision',
  'business-core-competence',
  'business-farm',
] as const;

export type BrandIntroPageKey = (typeof BRAND_INTRO_PAGE_KEYS)[number];

export const BRAND_INTRO_CMS_DEFAULTS: Record<BrandIntroPageKey, Record<string, unknown>> = {
  'company-greeting': {
    headerTitle: '인사말',
    headerSubtitle: '자연의 가치를 지키는 농업법인 (주)산골입니다.',
    messageTitle: '신뢰로 키우고,\n명품으로 보답하겠습니다.',
    headerBannerImage: '',
    mainImageMediaId: '',
    body: {
      lead: '안녕하십니까. 농업법인 (주)산골 대표이사 정현철입니다.',
      paragraphs: [
        '저는 오랜 금융기관 생활을 통해 삶에서 가장 중요한 가치는 "신뢰"임을 배웠습니다. 은퇴 후 고향인 두메산골로 돌아와 농업인의 길을 걷게 된 것도, 바로 그 신뢰를 지켜내기 위함이었습니다.',
        '농업에서 신뢰란 곧 고객이 믿고 선택할 수 있는 품질이며, 이는 곧 "명품"으로 이어집니다. 강원도 화천 깊은 산골의 맑은 공기와 청정 토양에서 자란 산양삼, 산더덕, 표고버섯 등은 자연의 선물과 저희의 정성이 더해져, 명실상부한 명품으로 자리매김하고 있습니다.',
        '앞으로도 (주)산골은 고객 여러분께 다른 어디에서도 경험할 수 없는 최상의 농·임산물을 제공하기 위해 땀과 열정을 다할 것입니다. 신뢰로 키우고, 명품으로 보답하는 (주)산골을 기억해 주시기 바랍니다.',
      ],
      closingThanks: '감사합니다.',
      closingSign: '농업 법인회사 (주)산골 임직원 일동',
    },
  },
  'company-history': {
    header: {
      title: '연혁',
      subtitle: '자연과 함께 걸어온 (주)산골의 발자취입니다.',
    },
    body: {
      title: '농업회사법인 (주)산골 연혁',
      subtitle: '2017년 설립부터 현재까지, 신뢰와 정직으로 성장해온 기록입니다.',
    },
    headerBannerImage: '',
    historyImageMediaId: '',
  },
  'company-awards': {
    header: {
      title: '수상 및 인증',
      subtitle: '엄격한 기준을 통과한 산골의 자부심입니다.',
    },
    body: {
      title: '국가가 인정한 프리미엄 임산물',
      subtitle: '청정 숲에서 자란 우수한 품질을 증명하는 인증 내역과 혜택 안내입니다.',
    },
    headerBannerImage: '',
    certMediaIds: ['', '', ''],
  },
  'company-location': {
    header: {
      title: '오시는 길',
      subtitle: '본사·직영점 및 가맹점 안내',
      bannerImage: '',
    },
    headOffice: {
      title: '본사(농장)',
      subTitle: '강원도 화천군 사내면',
      address: '강원도 화천군 사내면 검단길 213-49',
      phone: '1522-4680',
      fax: '02-784-8222',
    },
    directStore: {
      title: '직영점 : 잠실 콩밭',
      subTitle: '서울 송파구 잠실',
      address: '서울특별시 송파구 석촌호수로84 107호',
      phone: '1522-4680',
      fax: '02-784-8222',
    },
    table: {
      title: '가맹점 현황',
      subtitle: '',
      dateText: '2024년 9월 19일 기준',
    },
  },
  'business-philosophy': {
    header: {
      title: '경영철학',
      subtitle: '농업회사법인 (주)산골이 추구하는 변하지 않는 가치',
      bannerImage: '',
    },
    intro: {
      title: '자연과 사람이 함께 만드는\n프리미엄 임산물',
      description:
        '(주)산골은 자연의 순리를 따르며, 바른 먹거리를 통해 고객의 건강한 삶과\n지속 가능한 미래를 책임집니다.',
    },
    philosophies: [
      {
        title: '자연 그대로의 가치를 지킨다',
        description:
          '산골의 맑은 공기와 물을 먹고 자란 청정 임산물만을 고집하여, 자연이 주는 건강함 그대로를 고객의 식탁까지 전합니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1552248734-c547a6a264e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmlzdGluZSUyMG1vdW50YWluJTIwZm9yZXN0fGVufDF8fHx8MTc3MzU4NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        title: '사람과 자연의 조화',
        description:
          '자연을 훼손하지 않는 지속 가능한 농법을 연구하며, 인간과 자연이 함께 공존하고 상생하는 건강한 생태계를 만들어 갑니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1764918895542-b8c42d80fc6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVzdCUyMG5hdHVyZSUyMGhhbmRzfGVufDF8fHx8MTc3MzU4NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        title: '정직과 신뢰',
        description:
          '눈속임 없는 바른 공정과 철저한 품질 관리를 통해, 언제나 믿고 먹을 수 있는 최고의 프리미엄 브랜드로서의 책임을 다합니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1760562232244-460858cca10b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjBob2xkaW5nJTIwaGFydmVzdHxlbnwxfHx8fDE3NzM1ODQ3NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      },
    ],
  },
  'business-vision': {
    header: {
      title: '비전',
      subtitle: '(주)산골이 만들어가는 숲과 사람의 지속가능한 내일',
      bannerImage: '',
    },
    headerBannerImage: '',
    visionImageMediaId: '',
    visionPillars: [
      {
        step: '01',
        title: '두메산골 고냉지 임산물,\n농산물 브랜드',
        description:
          '청정 자연을 품은 고냉지에서 자란 프리미엄 임산물과 농산물을 발굴하여, 소비자에게 가장 신선하고 건강한 먹거리를 제공하는 대표 브랜드로 도약합니다.',
      },
      {
        step: '02',
        title: 'K-푸드 프리미엄\n임산물 브랜드 구축',
        description:
          '우수한 우리 임산물의 본연의 가치를 재조명하고 현대적 감각을 더해, 국내를 넘어 세계 시장에서도 인정받는 K-푸드 프리미엄 명품 브랜드로 성장합니다.',
      },
      {
        step: '03',
        title: '지속가능한 체험, 가공,\n관광 농업',
        description:
          '단순 1차 생산을 넘어 가공, 체험, 관광을 융합한 6차 산업 생태계를 실현하며, 지역 사회와 상생하고 환경을 생각하는 지속 가능한 미래 농업을 이끕니다.',
      },
    ],
  },
  'business-core-competence': {
    header: {
      title: '핵심 역량',
      subtitle: '자연이 허락한 최고의 재료와 깐깐한 고집이 만든 자부심',
      bannerImage: '',
    },
    intro: {
      title: '자연과 사람이 피워낸\n프리미엄의 완성',
      description:
        '(주)산골은 깨끗한 자연이 주는 잠재력에 타협 없는 기술력과 관리 시스템을 더해,\n독보적인 프리미엄 임산물의 새로운 기준을 제시합니다.',
    },
    competencies: [
      {
        num: '01',
        title: '청정 원산지 경쟁력',
        description: '오염되지 않은 천혜의 자연환경에서 자라나 임산물 본연의 깊고 진한 맛과 향을 자랑합니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1598768539067-5bb6c024a1e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmlzdGluZSUyMG1vdW50YWluJTIwdmFsbGV5fGVufDF8fHx8MTc3MzU4NTExMnww&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        num: '02',
        title: '두메산골 고냉지에서\n자란 K-푸드',
        description: '큰 일교차와 맑은 바람이 빚어낸 고랭지 특유의 탁월한 품질로 세계인의 입맛을 사로잡습니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1754810940745-25668d27581e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBhZ3JpY3VsdHVyZSUyMG1vdW50YWlufGVufDF8fHx8MTc3MzU4NTExMnww&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        num: '03',
        title: '친환경 유기농 재배 기술',
        description: '화학비료 없이 자연과 공존하는 생태 농법을 고집하여 땅의 기운을 살리고 건강함을 더합니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1763844599737-be3850c60cea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmdhbmljJTIwZmFybWluZyUyMHNvaWwlMjBoYW5kc3xlbnwxfHx8fDE3NzM1ODUxMTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        num: '04',
        title: '프리미엄 임산물\n품질관리',
        description: '수확부터 가공, 포장에 이르기까지 엄격한 검수 기준을 적용해 최고만을 선별합니다.',
        imageUrl:
          'https://images.unsplash.com/photo-1758533696874-587c4e62940c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxxdWFsaXR5JTIwaW5zcGVjdGlvbiUyMGhhcnZlc3R8ZW58MXx8fHwxNzczNTg1MTEyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      },
    ],
  },
  'business-farm': {
    header: {
      title: '농장 소개',
      subtitle: '자연 그대로의 방식을 고집하는 산골의 청정 농장',
      bannerImage: '',
    },
    body: {
      title: '자연과 사람이 피워낸\n건강한 먹거리',
      description:
        '농업 법인(주)산골은 청정 두메산골에서 가장 친환경적인 방식으로 재배하며,\n정직과 신뢰를 바탕으로 자연의 가치를 지키고 건강과 행복을 더합니다.',
    },
    headerBannerImage: '',
    farmImageMediaId: '',
  },
};

/** seed/cms-assets 파일명 → cms_pages 필드 */
export const BRAND_INTRO_MEDIA_BINDINGS: Record<
  BrandIntroPageKey,
  Array<{ field: string; originalName: string; arrayIndex?: number }>
> = {
  'company-greeting': [{ field: 'mainImageMediaId', originalName: 'sub1_1_img1.png' }],
  'company-history': [{ field: 'historyImageMediaId', originalName: 'sub1_2_img1.png' }],
  'company-awards': [
    { field: 'certMediaIds', originalName: 'sub1_3_img1.jpg', arrayIndex: 0 },
    { field: 'certMediaIds', originalName: 'sub1_3_img2.jpg', arrayIndex: 1 },
    { field: 'certMediaIds', originalName: 'sub1_3_img3.jpg', arrayIndex: 2 },
  ],
  'company-location': [],
  'business-philosophy': [],
  'business-vision': [{ field: 'visionImageMediaId', originalName: 'sub2_2_img1.png' }],
  'business-core-competence': [],
  'business-farm': [{ field: 'farmImageMediaId', originalName: 'sub2_4_img1.jpg' }],
};
