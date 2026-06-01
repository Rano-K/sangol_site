import type { CmsFieldConfig } from './CmsFieldEditorCard';

export type CmsFieldPart = {
  id: string;
  title: string;
  description: string;
  fields: CmsFieldConfig[];
  /** 와이어프레임 하이라이트용 대표 경로 */
  previewPath: string;
};

const PART_TITLE_BY_KEY: Record<string, string> = {
  topMenu: '상단 메뉴',
  'logo.header': '헤더 로고',
  'logo.footer': '푸터 로고',
  typography: '전역 폰트',
  footer: '하단 회사 정보',
  hero: '메인 비주얼 문구',
  heroImages: '메인 비주얼 슬라이드 이미지',
  intro: '브랜드 스토리',
  support: '하단 고객센터',
  header: '상단 제목·배너',
  consult: '상담 안내',
  privacyText: '개인정보 동의 문구',
  payment: '입금 안내',
  headOffice: '본사(농장) 카드',
  directStore: '직영점 카드',
  headerBannerImage: '상단 배너 이미지',
};

const ARRAY_PART_PREFIX: Record<string, string> = {
  trustBadges: '신뢰배지',
  features: '핵심역량 카드',
  heroActions: '메인 CTA 버튼',
  philosophies: '경영철학 카드',
  competencies: '핵심역량 카드',
  heroImages: '슬라이드',
};

const FIELD_LEAF_LABEL: Record<string, string> = {
  title: '제목',
  desc: '설명',
  subtitle: '보조 문구',
  subtitle2: '보조 문구 2',
  label: '버튼 문구',
  variant: '버튼 스타일',
  iconUrl: '아이콘 URL',
  img: '이미지',
  imageUrl: '이미지',
  bannerImage: '배너 이미지',
  headerLogoMediaId: '헤더 로고',
  footerLogoMediaId: '푸터 로고',
  loginLabel: '로그인 문구',
  mypageLabel: '마이페이지 문구',
  noticeText: '상단 공지',
  ownerName: '대표자명',
  address: '주소',
  csPhone: '고객센터',
  fax: '팩스',
  email: '이메일',
  copyright: '저작권',
  phone: '전화번호',
  weekday: '평일 상담',
  lunch: '점심시간',
  closed: '휴무 안내',
  notice: '안내 문구',
  description1: '본문 1',
  description2: '본문 2',
  accountName: '계좌명',
  accountNumber: '계좌번호',
  requiredNotice: '필수 안내',
  enabled: '적용 여부',
  fontMediaId: '한글 폰트',
  fontMediaIdEn: '영문·숫자 폰트',
};

export const resolveCmsFieldPartKey = (path: string): string => {
  if (path === 'headerBannerImage' || path === 'privacyText') return path;
  if (path.startsWith('logo.header')) return 'logo.header';
  if (path.startsWith('logo.footer')) return 'logo.footer';

  const arraySlot = path.match(/^([a-zA-Z]+)\.(\d+)\./);
  if (arraySlot) return `${arraySlot[1]}.${arraySlot[2]}`;

  const arrayLeaf = path.match(/^([a-zA-Z]+)\.(\d+)$/);
  if (arrayLeaf) {
    if (arrayLeaf[1] === 'heroImages') return 'heroImages';
    return `${arrayLeaf[1]}.${arrayLeaf[2]}`;
  }

  const nested = path.match(/^([a-zA-Z]+)\./);
  if (nested) return nested[1];

  return path;
};

const buildPartTitle = (partKey: string, fields: CmsFieldConfig[]): string => {
  if (PART_TITLE_BY_KEY[partKey]) return PART_TITLE_BY_KEY[partKey];

  const arrayMatch = partKey.match(/^([a-zA-Z]+)\.(\d+)$/);
  if (arrayMatch) {
    const prefix = ARRAY_PART_PREFIX[arrayMatch[1]] || arrayMatch[1];
    const order = Number(arrayMatch[2]) + 1;
    if (arrayMatch[1] === 'heroImages') {
      return `메인 비주얼 슬라이드 이미지 (${fields.length}개)`;
    }
    if (arrayMatch[1] === 'heroActions') {
      return '메인 비주얼 CTA 버튼';
    }
    return `${prefix} ${order}`;
  }

  const firstLabel = fields[0]?.label || partKey;
  const base = firstLabel.split('>').pop()?.trim() || firstLabel;
  return base.replace(/\s+\d+\s*(번.*)?$/, '').trim() || partKey;
};

const buildPartDescription = (partKey: string, fields: CmsFieldConfig[]): string => {
  if (fields.length <= 1) return fields[0]?.description || '해당 화면 영역';
  const arrayMatch = partKey.match(/^([a-zA-Z]+)\.(\d+)$/);
  if (arrayMatch) {
    return `프론트에서 하나의 블록으로 묶여 보이는 항목입니다. (${fields.length}개 값)`;
  }
  return `같은 영역에 함께 노출되는 ${fields.length}개 항목을 한곳에서 수정합니다.`;
};

export const getCmsFieldRowLabel = (field: CmsFieldConfig, partTitle: string): string => {
  const leaf = field.path.split('.').pop() || '';
  if (FIELD_LEAF_LABEL[leaf]) return FIELD_LEAF_LABEL[leaf];

  const heroImageMatch = field.path.match(/^heroImages\.(\d+)$/);
  if (heroImageMatch) return `슬라이드 ${Number(heroImageMatch[1]) + 1} 이미지`;

  const trimmed = field.label
    .replace(partTitle, '')
    .replace(/^[\s>·-]+/, '')
    .trim();
  return trimmed || field.label;
};

export const groupFieldsIntoParts = (fields: CmsFieldConfig[]): CmsFieldPart[] => {
  const order: string[] = [];
  const bucket = new Map<string, CmsFieldConfig[]>();

  fields.forEach((field) => {
    const key = resolveCmsFieldPartKey(field.path);
    if (!bucket.has(key)) {
      bucket.set(key, []);
      order.push(key);
    }
    bucket.get(key)!.push(field);
  });

  return order.map((key) => {
    const partFields = bucket.get(key)!;
    return {
      id: key,
      title: buildPartTitle(key, partFields),
      description: buildPartDescription(key, partFields),
      fields: partFields,
      previewPath: partFields[0]?.path || key,
    };
  });
};
