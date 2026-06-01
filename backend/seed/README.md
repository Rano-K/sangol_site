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

Ubuntu에서도 **동일 명령**으로 이미지·CMS DB를 채울 수 있습니다 (`rsync uploads` 불필요).
