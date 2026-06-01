/**
 * CMS 페이지·공지·FAQ·오시는길 가맹점 등 프론트 하드코딩/레거시 문구를 DB에 반영합니다.
 * 기존 cms_pages의 mediaId 등 비어 있지 않은 값은 유지하고, 빈 필드만 채웁니다.
 *
 * 실행: npm run seed:cms-content
 */
import 'dotenv/config';
import pool from '../config/database.js';

type Json = Record<string, unknown>;

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1733837323673-da9b3a98135e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  'https://images.unsplash.com/photo-1741515044901-58696421d24a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  'https://images.unsplash.com/photo-1695798790639-c3c4294373ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
];

const HOME_FEATURES = [
  {
    title: '핵심 역량',
    desc: '청정 원산지 경쟁력과 K-푸드 프리미엄 브랜드 구축을 위한 친환경 재배 기술',
    link: '/business/core-competence',
    img: 'https://images.unsplash.com/photo-1719254871588-b4a0e8ba9035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtaW5nJTIwcHJvY2VzcyUyMG5hdHVyZXxlbnwxfHx8fDE3NzMyMjE5MjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: '품질인증',
    desc: '2024 농산물 우수관리(GAP) 인증 및 무농약 친환경 재배 방식 고수',
    link: '/company/awards',
    img: 'https://images.unsplash.com/photo-1658864679847-c96c1794ff2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxxdWFsaXR5JTIwb3JnYW5pYyUyMGZhcm0lMjBzaWdufGVufDF8fHx8MTc3MzIyMTkyNXww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: '수상현황',
    desc: '2025 임산물 국가통합 및 프리미엄 브랜드 지정기업 인증 획득',
    link: '/company/awards',
    img: 'https://images.unsplash.com/photo-1742887205589-266ab1623152?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwaGFydmVzdCUyMGZhcm18ZW58MXx8fHwxNzczMjIxOTI0fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: '농장 소개',
    desc: '정직과 신뢰를 바탕으로 자연 그대로 재배하는 화천 고냉지 농장',
    link: '/business/farm',
    img: 'https://images.unsplash.com/photo-1644615339756-0afa02e886f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbmhvdXNlJTIwZmFybSUyMG5hdHVyZXxlbnwxfHx8fDE3NzMyMjE5MjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

const CMS_PAGES: Record<string, { title: string; sections: Json }> = {
  'site-layout': {
    title: '사이트 공통',
    sections: {
      topMenu: {
        loginLabel: '가맹점 로그인',
        mypageLabel: '마이페이지',
        noticeText: '',
      },
      logo: {
        headerLogoMediaId: '',
        footerLogoMediaId: '',
      },
      typography: { enabled: true },
      footer: {
        ownerName: '정현철',
        address: '강원특별자치도 화천군 사내면 검단길 213-49',
        csPhone: '1522-4680',
        fax: '02-784-8222',
        email: 'sangol2017@naver.com',
        copyright: 'Copyright(c) 농업법인㈜산골. All Rights Reserved.',
      },
    },
  },
  home: {
    title: '메인 홈',
    sections: {
      hero: {
        subtitle: '강원도 화천 청정 두메산골에서 자란 명품 임산물과 고냉지 농산물',
        title: '자연의 생명력을 그대로 담아,\n(주)산골이 건강한 약속을 전합니다',
        subtitle2: '',
      },
      heroImages: HERO_IMAGES,
      heroActions: [{ label: '상품 둘러보기', link: '/products/forest', variant: 'primary' }],
      trustBadges: [
        { title: '안전한 원산지', desc: '산지 추적 관리', iconUrl: 'https://img.icons8.com/color/96/certificate.png' },
        { title: '품질 인증', desc: '엄격한 선별 기준', iconUrl: 'https://img.icons8.com/color/96/medal2.png' },
        { title: '빠른 배송', desc: '신선도 우선 출고', iconUrl: 'https://img.icons8.com/color/96/delivery.png' },
        { title: '검수 완료', desc: '출고 전 품질 점검', iconUrl: 'https://img.icons8.com/color/96/checked--v1.png' },
      ],
      features: HOME_FEATURES,
      intro: {
        iconUrl: '',
        title: '"신뢰를 바탕으로 건강한 먹거리를 공급합니다"',
        description1:
          '금융권 경력을 뒤로하고 고향으로 돌아와 설립한 농업법인 (주)산골은\n강원도 화천의 맑은 자연이 주는 선물에 정성을 더해 명품 임산물을 키워냅니다.',
        description2:
          '사람과 자연의 조화, 그리고 정직과 신뢰의 경영 철학으로\n지속가능한 체험·가공·관광 농업의 비전을 실현하며 K-푸드 프리미엄 브랜드로 도약하겠습니다.',
      },
      support: {
        phone: '1522-4680',
        notice: '주말 및 공휴일은 상담 불가하므로\n평일 업무 시간 내 문의 부탁드립니다.',
      },
    },
  },
  'company-greeting': {
    title: '인사말',
    sections: {
      headerTitle: '인사말',
      headerSubtitle: '자연의 가치를 지키는 농업법인 (주)산골입니다.',
      messageTitle: '신뢰로 키우고,\n명품으로 보답하겠습니다.',
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
  },
  'company-history': {
    title: '연혁',
    sections: {
      header: {
        title: '연혁',
        subtitle: '자연과 함께 걸어온 (주)산골의 발자취입니다.',
      },
      body: {
        title: '농업회사법인 (주)산골 연혁',
        subtitle: '2017년 설립부터 현재까지, 신뢰와 정직으로 성장해온 기록입니다.',
      },
    },
  },
  'company-awards': {
    title: '수상 및 인증',
    sections: {
      header: {
        title: '수상 및 인증',
        subtitle: '엄격한 기준을 통과한 산골의 자부심입니다.',
      },
      body: {
        title: '국가가 인정한 프리미엄 임산물',
        subtitle: '청정 숲에서 자란 우수한 품질을 증명하는 인증 내역과 혜택 안내입니다.',
      },
    },
  },
  'company-location': {
    title: '오시는 길',
    sections: {
      header: {
        title: '오시는 길',
        subtitle: '본사·직영점 및 가맹점 안내',
      },
      headOffice: {
        title: '본사(농장)',
        subTitle: '강원 화천 두메산골',
        address: '강원특별자치도 화천군 사내면 검단길 213-49',
        phone: '1522-4680',
        fax: '02-784-8222',
      },
      directStore: {
        title: '직영점 : 잠실 콩밭',
        subTitle: '서울 송파',
        address: '서울특별시 송파구 석촌호수로84 107호',
        phone: '1522-4680',
        fax: '02-784-8222',
      },
      table: {
        title: '가맹점 안내',
        subtitle: '전국 가맹점 연락처 및 주소 (관리자에서 추가·수정 가능)',
      },
    },
  },
  'business-philosophy': {
    title: '경영철학',
    sections: {
      header: {
        title: '경영철학',
        subtitle: '농업회사법인 (주)산골이 추구하는 변하지 않는 가치',
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
            'https://images.unsplash.com/photo-1552248734-c547a6a264e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVzdGluZSUyMG1vdW50YWluJTIwZm9yZXN0fGVufDF8fHx8MTc3MzU4NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080',
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
  },
  'business-vision': {
    title: '비전',
    sections: {
      header: {
        title: '비전',
        subtitle: '지속가능한 체험·가공·관광 농업으로 K-푸드 프리미엄 브랜드',
      },
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
  },
  'business-core-competence': {
    title: '핵심역량',
    sections: {
      header: {
        title: '핵심 역량',
        subtitle: '자연이 허락한 최고의 재료와 깐깐한 고집이 만든 자부심',
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
  },
  'business-farm': {
    title: '농장소개',
    sections: {
      header: {
        title: '농장 소개',
        subtitle: '자연 그대로의 방식을 고집하는 산골의 청정 농장',
      },
      body: {
        title: '자연과 사람이 피워낸 건강한 먹거리',
        description:
          '농업 법인(주)산골은 청정 두메산골에서 가장 친환경적인 방식으로 재배하며, 정직과 신뢰를 바탕으로 자연의 가치를 지키고 건강과 행복을 더합니다.',
      },
    },
  },
  support: {
    title: '고객센터',
    sections: {
      header: {
        title: '고객센터',
        subtitle: '무엇을 도와드릴까요? 산골의 고객센터입니다.',
      },
      consult: {
        phone: '1522-4680',
        weekday: '09:00 - 18:00',
        lunch: '12:00 - 13:00',
        closed: '주말 및 공휴일 휴무',
      },
      privacyText:
        '1. 수집하는 개인정보 항목: 이름, 연락처, 이메일\n2. 수집 및 이용 목적: 문의 내역 확인 및 답변 처리, 처리 내역 안내\n3. 보유 및 이용 기간: 문의 처리 완료 후 3년간 보관\n* 귀하는 개인정보 수집 및 이용에 거부할 권리가 있으나, 거부 시 문의 접수 및 답변이 제한될 수 있습니다.',
      faqs: [
        {
          id: 1,
          category: '주문/배송',
          q: '가맹점 발주는 어떻게 하나요?',
          a: '가맹점 계정으로 로그인 후 상품 카탈로그에서 수량을 선택해 발주 담기를 이용하거나, 가맹점주문 메뉴에서 일괄 발주할 수 있습니다.',
        },
        {
          id: 2,
          category: '주문/배송',
          q: '배송은 얼마나 걸리나요?',
          a: '주문 확정 및 입금 확인 후 영업일 기준 2~5일 내 출고되며, 지역·품목에 따라 달라질 수 있습니다.',
        },
        {
          id: 3,
          category: '상품',
          q: '품절 상품은 언제 다시 들어오나요?',
          a: '재고는 수확·가공 일정에 따라 달라집니다. 고객센터(1522-4680)로 문의해 주시면 입고 예정을 안내해 드립니다.',
        },
        {
          id: 4,
          category: '가맹',
          q: '가맹점 가입 절차가 궁금합니다.',
          a: '온라인문의 또는 고객센터로 연락 주시면 담당자가 상담 후 가맹 절차를 안내해 드립니다.',
        },
        {
          id: 5,
          category: '결제',
          q: '입금 계좌는 어디인가요?',
          a: '주문 완료 화면 및 마이페이지에 안내된 입금 계좌로 주문자명과 동일하게 입금해 주세요. 미입금 시 출고가 지연될 수 있습니다.',
        },
      ],
    },
  },
  order: {
    title: '주문 페이지',
    sections: {
      payment: {
        accountName: '농업회사법인(주)산골',
        accountNumber: '입금 계좌는 고객센터(1522-4680)로 문의해 주세요.',
        requiredNotice: '※ 반드시 입금 후 주문을 확정해 주세요. 미입금 시 출고가 진행되지 않습니다.',
      },
    },
  },
};

const SAMPLE_NOTICES = [
  {
    title: '산골 홈페이지를 새롭게 오픈했습니다.',
    content: '<p>농업회사법인 (주)산골 공식 홈페이지가 리뉴얼되었습니다. 공지사항·온라인문의·가맹점 발주 서비스를 이용해 주세요.</p>',
    author: '관리자',
    is_important: true,
  },
  {
    title: '신규 가맹점 첫 구매 10% 할인 안내',
    content: '<p>신규 가맹점 등록 후 첫 발주 시 10% 할인 혜택을 제공합니다. 자세한 내용은 고객센터(1522-4680)로 문의해 주세요.</p>',
    author: '관리자',
    is_important: true,
  },
  {
    title: '2025년 임산물 국가통합브랜드 지정 안내',
    content: '<p>(주)산골이 임산물 국가통합브랜드 지정기업으로 선정되었습니다. 앞으로도 프리미엄 임산물로 보답하겠습니다.</p>',
    author: '관리자',
    is_important: false,
  },
];

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const mergeSections = (defaults: unknown, current: unknown): unknown => {
  if (Array.isArray(defaults)) {
    const currentArr = Array.isArray(current) ? current : [];
    return defaults.map((item, index) => mergeSections(item, currentArr[index]));
  }
  if (defaults && typeof defaults === 'object') {
    const base = defaults as Json;
    const cur = current && typeof current === 'object' && !Array.isArray(current) ? (current as Json) : {};
    const merged: Json = { ...cur };
    for (const [key, value] of Object.entries(base)) {
      if (key.endsWith('MediaId') && cur[key] !== undefined && cur[key] !== null && cur[key] !== '') {
        merged[key] = cur[key];
        continue;
      }
      if (key === 'certMediaIds' && Array.isArray(cur[key]) && (cur[key] as unknown[]).length > 0) {
        merged[key] = cur[key];
        continue;
      }
      merged[key] = mergeSections(value, cur[key]);
    }
    return merged;
  }
  if (isEmpty(current)) return defaults;
  return current;
};

async function getPageSections(pageKey: string): Promise<Json> {
  const { rows } = await pool.query<{ sections: Json }>(
    'SELECT sections FROM cms_pages WHERE page_key = $1',
    [pageKey]
  );
  return rows[0]?.sections ?? {};
}

async function upsertPage(pageKey: string, title: string, sections: Json): Promise<void> {
  await pool.query(
    `INSERT INTO cms_pages (page_key, title, sections, seo, published)
     VALUES ($1, $2, $3::jsonb, '{}'::jsonb, TRUE)
     ON CONFLICT (page_key)
     DO UPDATE SET
       title = EXCLUDED.title,
       sections = EXCLUDED.sections,
       published = TRUE,
       updated_at = NOW()`,
    [pageKey, title, JSON.stringify(sections)]
  );
}

async function getCmsMediaIdByFileName(originalName: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM cms_media WHERE original_name = $1 ORDER BY id DESC LIMIT 1',
    [originalName]
  );
  if (rows.length === 0) return null;
  return Number(rows[0].id);
}

async function attachSiteLayoutLogoMediaIds(sections: Json): Promise<Json> {
  const logo = (sections.logo && typeof sections.logo === 'object' ? sections.logo : {}) as Json;
  const existingHeader = logo.headerLogoMediaId;
  const existingFooter = logo.footerLogoMediaId;
  const headerFromDb = await getCmsMediaIdByFileName('logo.png');
  const footerFromDb = await getCmsMediaIdByFileName('ft_logo.png');

  return {
    ...sections,
    logo: {
      headerLogoMediaId:
        existingHeader !== undefined && existingHeader !== null && existingHeader !== ''
          ? existingHeader
          : headerFromDb ?? '',
      footerLogoMediaId:
        existingFooter !== undefined && existingFooter !== null && existingFooter !== ''
          ? existingFooter
          : footerFromDb ?? '',
    },
  };
}

async function seedCmsPages(): Promise<string[]> {
  const updated: string[] = [];
  for (const [pageKey, payload] of Object.entries(CMS_PAGES)) {
    const existing = await getPageSections(pageKey);
    let merged = mergeSections(payload.sections, existing) as Json;
    if (pageKey === 'site-layout') {
      merged = await attachSiteLayoutLogoMediaIds(merged);
      const logo = merged.logo as Json;
      delete logo.headerLogoUrl;
      delete logo.footerLogoUrl;
    }
    await upsertPage(pageKey, payload.title, merged);
    updated.push(pageKey);
  }
  return updated;
}

async function seedNotices(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM notices WHERE is_active = TRUE'
  );
  if (Number(rows[0]?.count || 0) > 0) return 0;

  for (const notice of SAMPLE_NOTICES) {
    await pool.query(
      `INSERT INTO notices (title, content, author, is_important, is_active)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [notice.title, notice.content, notice.author, notice.is_important]
    );
  }
  return SAMPLE_NOTICES.length;
}

async function seedLocationFranchises(): Promise<number> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_franchises (
      id BIGSERIAL PRIMARY KEY,
      franchise_key VARCHAR(32),
      store_type VARCHAR(40) NOT NULL DEFAULT '',
      name VARCHAR(120) NOT NULL,
      store_phone VARCHAR(40),
      owner_name VARCHAR(80),
      owner_phone VARCHAR(40),
      address TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM location_franchises WHERE is_active = TRUE'
  );
  if (Number(rows[0]?.count || 0) > 0) return 0;

  const rowsToInsert = [
    {
      store_type: '본사',
      name: '본사(농장)',
      store_phone: '1522-4680',
      owner_name: '정현철',
      owner_phone: '',
      address: '강원특별자치도 화천군 사내면 검단길 213-49',
      franchise_key: 'HQ',
    },
    {
      store_type: '직영점',
      name: '직영점 : 잠실 콩밭',
      store_phone: '1522-4680',
      owner_name: '',
      owner_phone: '',
      address: '서울특별시 송파구 석촌호수로84 107호',
      franchise_key: 'STORE-JAMSIL',
    },
  ];

  for (const row of rowsToInsert) {
    await pool.query(
      `INSERT INTO location_franchises (franchise_key, store_type, name, store_phone, owner_name, owner_phone, address, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
      [
        row.franchise_key,
        row.store_type,
        row.name,
        row.store_phone,
        row.owner_name,
        row.owner_phone,
        row.address,
      ]
    );
  }
  return rowsToInsert.length;
}

async function main(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id BIGSERIAL PRIMARY KEY,
      page_key VARCHAR(120) UNIQUE NOT NULL,
      title VARCHAR(255),
      sections JSONB NOT NULL DEFAULT '{}'::jsonb,
      seo JSONB NOT NULL DEFAULT '{}'::jsonb,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const pages = await seedCmsPages();
  const noticeCount = await seedNotices();
  const locationCount = await seedLocationFranchises();

  console.log(
    JSON.stringify(
      {
        ok: true,
        cmsPagesUpdated: pages,
        noticesInserted: noticeCount,
        locationFranchisesInserted: locationCount,
        hint: '이미지(mediaId) 연결은 npm run migrate:front-images 후 enforce-media-id 스크립트를 추가 실행하세요.',
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
