# Seed data (Git에 포함)

배포·클론 후 **DB + CMS 이미지**를 처음부터 맞추기 위한 원본입니다.

## 포함 내용

| 경로 | 용도 | Git |
|------|------|-----|
| `seed/cms-assets/` | CMS용 원본 이미지 (`logo.png`, `ft_logo.png`, …) | ✅ 커밋 (~2MB) |
| `uploads/cms/` | 런타임 업로드 (admin에서 추가한 파일) | ❌ `.gitignore` |

## 새 환경에서 한 번에 넣기

`backend` 폴더에서 `.env` 설정 후:

```bash
npm run migrate          # 1) 스키마
npm run seed:init        # 2) 이미지 → uploads + cms_media + CMS 페이지
```

관리자 계정(선택):

```bash
ADMIN_EMAIL="admin@your.domain" \
ADMIN_PASSWORD="강한비밀번호" \
npm run seed:dev-admin
```

운영 서버 첫 배포 시:

```bash
ALLOW_PROD_SEED_ADMIN=true ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:dev-admin
```

## seed:init 이 하는 일

1. `bootstrapCmsAssetsFromSeed` — `seed/cms-assets/*` → `uploads/cms/` 복사 + `cms_media` 등록/갱신  
2. `seed:cms-content` — `cms_pages` 기본값 + 로고 mediaId 연결

## 메인 홈 CMS 문구 복구

메인 상단(히어로·신뢰배지·브랜드 스토리·핵심역량 카드)이 비어 있을 때:

```bash
npm run seed:home-cms:restore   # 예전 기본 문구·이미지 URL 전체 복구
# 또는 빈 필드만 채우기 (admin 수정분 유지)
npm run seed:home-cms
```

복구 후 admin **프론트 콘텐츠 → 메인 홈**에서 확인·수정할 수 있습니다.

## 브랜드소개(회사·사업 8페이지) CMS 복구

GNB **브랜드소개** 하위(인사말·연혁·수상/인증·오시는길·경영철학·비전·핵심역량·농장소개):

```bash
npm run seed:brand-intro-cms:restore
```

이미지(mediaId) 연결은 `seed:init` 후 실행하세요. admin **프론트 콘텐츠**에서 각 페이지별로 편집합니다.

## 푸터·헤더 공통(site-layout) CMS 복구

상단 공지·로그인 메뉴·푸터 회사정보·로고:

```bash
npm run seed:site-layout-cms:restore
```

admin **프론트 콘텐츠 → 사이트 공통** 에서 `footer.*`, `topMenu.*`, 로고 mediaId를 편집합니다.

## 고객센터·주문(support / order) CMS 복구

고객센터 헤더·상담시간·FAQ·개인정보 안내, B2B 입금 계좌 안내:

```bash
npm run seed:support-order-cms:restore
```

admin **프론트 콘텐츠 → 고객센터 / 주문 페이지** 에서 수정합니다.

## CMS 전체 복구 (한 번에)

`seed:init` 직후 또는 메인·브랜드·푸터·고객센터가 모두 비었을 때:

```bash
npm run seed:cms-restore-all
```

순서: site-layout → home → brand-intro(8페이지) → support/order

Ubuntu에서도 **동일 명령**으로 이미지·CMS DB를 채울 수 있습니다 (`rsync uploads` 불필요).
