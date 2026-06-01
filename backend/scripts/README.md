# Backend scripts (로컬 vs Ubuntu 서버)

## Ubuntu 배포 시 (권장)

Git에 `seed/cms-assets` 가 포함되어 있으면:

```bash
npm run migrate
npm run seed:init
npm run fix:cms-media-urls -- --apply   # PUBLIC_API_BASE_URL 맞춘 뒤
```

`uploads` rsync는 **seed:init 으로 대체** 가능합니다.  
이미 운영 중인 `uploads`만 Mac에서 옮길 때만 rsync를 씁니다.

---

## 로컬 전용 (Mac / 최초 데이터 넣기)

| 스크립트 | 용도 | 서버 |
|----------|------|------|
| `migrate-front-images-to-db.cjs` | 원본 이미지 → `cms_media` + CMS URL 연결 | ❌ |
| `enforce-media-id-references.cjs` | mediaId 참조 정리 | △ 필요 시만 |
| `fix-company-images.cjs` / `fix-home-features.cjs` | 페이지별 이미지 보정 | △ 필요 시만 |
| `../database/postgres/build_legacy_seed_v1.py` | PHP dump → SQL 시드 | ❌ |

### migrate-front-images-to-db.cjs

원본 PNG/JPG 폴더가 필요합니다 (`logo.png`, `ft_logo.png`, …).

```bash
cd backend
CMS_ASSETS_DIR="/path/to/assets_for_front" node scripts/migrate-front-images-to-db.cjs
```

- `CMS_ASSETS_DIR` 미설정 시 `../assets`(repo 루트 `github_on/assets`)를 자동 시도합니다.
- 폴더에 파일이 부족하면 일부만 등록됩니다.

### build_legacy_seed_v1.py

구 PHP DB dump에서 PostgreSQL 시드 SQL을 만듭니다. **로컬 1회용.**

```bash
export LEGACY_DUMP_PATH="/path/to/ikor250911t-20260409.dump"
export LEGACY_SEED_OUT_PATH="./database/postgres/legacy_seed_v1.sql"  # 선택
python3 database/postgres/build_legacy_seed_v1.py
```

---

## npm scripts (backend/package.json)

| 명령 | 설명 |
|------|------|
| `npm run migrate` | SQL 마이그레이션 (배포 필수) |
| `npm run fix:cms-media-urls -- --apply` | 미디어 URL·경로 수정 (배포 권장) |
| `npm run seed:cms-content` | CMS 페이지 시드 |
| `npm run seed:dev-admin` | 개발용 관리자 (운영은 가드 확인) |
