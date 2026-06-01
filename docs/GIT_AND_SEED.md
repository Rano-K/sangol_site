# Git 업로드 + DB/이미지 초기 데이터

Ubuntu 배포 **전**, Mac에서 저장소를 깔끔하게 GitHub에 올리는 방법입니다.

## 설계 요약

| 종류 | Git | 서버에서 |
|------|-----|----------|
| 소스 코드 | ✅ | `git clone` |
| `backend/seed/cms-assets/` | ✅ (~2MB) | `npm run seed:init` |
| `backend/uploads/` | ❌ | seed 스크립트가 생성 |
| `.env` / 비밀번호 | ❌ | 서버에서 직접 작성 |
| `node_modules`, `dist` | ❌ | `npm ci` / `npm run build` |

**이미지·CMS DB는 Git에 SQL 덤프 대신** `seed/cms-assets` + `npm run seed:init` 으로 재현합니다.

---

## 1. 커밋 전 검사 (Mac)

```bash
cd "/Users/kms/Documents/New project/sangol/github_on"

# 빌드
(cd backend && npm ci && npm run build)
(cd front && npm ci && npm run build)
(cd admin && npm ci && npm run build)

# 시드 폴더 확인
ls backend/seed/cms-assets/
# logo.png, ft_logo.png, sub1_*.png … 9개

# 커밋되면 안 되는 것 미리보기
git add -n . 2>/dev/null || true
git status
```

**`git status`에 없어야 할 것:** `.env`, `node_modules`, `dist`, `backend/uploads/`

**있어야 할 것:** `backend/seed/cms-assets/*.png` 등

---

## 2. 로컬에서 DB+이미지 동작 확인 (선택, 권장)

```bash
cd backend
cp .env.example .env
# .env 에 DB_PASSWORD, JWT_SECRET(32자+) 입력

npm run migrate
npm run seed:init

ADMIN_EMAIL="admin@test.local" ADMIN_PASSWORD="TestPassword123!" npm run seed:dev-admin
npm run dev
```

admin에서 이미지 라이브러리·CMS 로고 확인.

---

## 3. GitHub에 올리기

```bash
cd "/Users/kms/Documents/New project/sangol/github_on"

git init   # 이미 있으면 생략
git add .
git status   # 다시 한 번 .env / node_modules 없는지 확인

git commit -m "Initial: backend, front, admin with CMS seed assets"
```

GitHub에서 **Private** 저장소 생성 후:

```bash
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

---

## 4. Ubuntu에서 처음 DB+이미지 넣기 (나중에)

```bash
git clone https://github.com/<계정>/<저장소>.git /var/www/sangol/github_on
cd /var/www/sangol/github_on/backend
cp .env.example .env
nano .env   # DB, JWT, PUBLIC_API_BASE_URL=http://211.45.175.38/api

npm ci && npm run build
npm run migrate
npm run seed:init
```

이후 front/admin 빌드·Nginx는 배포 가이드대로 진행.

---

## 자주 묻는 것

**Q. `uploads/`를 Git에 넣으면 안 되나?**  
A. admin 업로드와 섞이고 용량이 커집니다. **원본은 `seed/cms-assets`만** Git에 두고, `seed:init`이 `uploads`를 만듭니다.

**Q. DB 전체 덤프는?**  
A. 스키마는 `npm run migrate`, CMS·미디어는 `seed:init`, 관리자는 `seed:dev-admin`으로 충분합니다. 상품·주문 등 운영 데이터는 별도 마이그레이션입니다.

**Q. 상위 `sangol/` 폴더 전체를 올려도 되나?**  
A. `github_on`만 올리세요. `admin_netlify`, zip, 루트 `node_modules`는 제외됩니다.
