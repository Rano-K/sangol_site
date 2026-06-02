/**
 * 메인 홈(home) CMS 초기 콘텐츠 — 예전 front/Home.tsx 하드코딩·mock 기준.
 * admin 프론트 콘텐츠 > home 과 동일 구조.
 */
export const HOME_CMS_DEFAULT_SECTIONS: Record<string, unknown> = {
  hero: {
    subtitle: '강원도 화천 청정 두메산골에서 자란 명품 임산물과 고냉지 농산물',
    title:
      '자연의 가치를 지키고\n소비자의 삶에 건강과\n행복을 더하는 것을\n목표로 하고 있습니다.',
    subtitle2: '',
  },
  heroImages: [
    'https://images.unsplash.com/photo-1733837323673-da9b3a98135e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
    'https://images.unsplash.com/photo-1741515044901-58696421d24a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
    'https://images.unsplash.com/photo-1695798790639-c3c4294373ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  ],
  heroActions: [{ label: '상품 둘러보기', link: '/products/forest', variant: 'primary' }],
  trustBadges: [
    { title: '안전한 원산지', desc: '산지 추적 관리', iconMediaId: '', iconUrl: '' },
    { title: '품질 인증', desc: '엄격한 선별 기준', iconMediaId: '', iconUrl: '' },
    { title: '빠른 배송', desc: '신선도 우선 출고', iconMediaId: '', iconUrl: '' },
    { title: '검수 완료', desc: '출고 전 품질 점검', iconMediaId: '', iconUrl: '' },
  ],
  features: [
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
  ],
  intro: {
    iconUrl: '',
    title: '신뢰를 바탕으로 건강한 먹거리를 공급합니다',
    description1:
      '금융권 경력을 뒤로하고 고향으로 돌아와 설립한 농업법인 (주)산골은\n강원도 화천의 맑은 자연이 주는 선물에 정성을 더해 명품 임산물을 키워냅니다.',
    description2:
      '사람과 자연의 조화, 그리고 정직과 신뢰의 경영 철학으로\n지속가능한 체험·가공·관광 농업의 비전을 실현하며 K-푸드 프리미엄 브랜드로 도약하겠습니다.',
  },
  support: {
    phone: '1522-4680',
    notice: '주말 및 공휴일은 상담 불가하므로\n평일 업무 시간 내 문의 부탁드립니다.',
  },
};
