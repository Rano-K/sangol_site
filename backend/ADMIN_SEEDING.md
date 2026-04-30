# 개발/테스트용 Admin Seed 운영 가이드

## 핵심 목표
- 운영(Production)에서는 **서버 부트 시 기본 admin 계정을 자동 생성하지 않습니다.**
- 개발/로컬에서 필요한 admin 계정은 **명시적으로 seed 스크립트를 실행**해서 만듭니다.

## 변경 사항 요약
- `backend/src/server.ts` : 서버 시작 시 기본 admin 자동 upsert 로직 제거
- `backend/src/scripts/seedDevAdmin.ts` : 개발/테스트용 admin seed 스크립트 제공

## 1) Dev/Local에서 admin 생성
1. DB가 준비되어 있어야 합니다.
2. 아래 환경변수를 설정합니다.

```bash
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="yourStrongPassword"
```

3. seed 실행:

```bash
npm --prefix backend run seed:dev-admin
```

## 2) Production에서 자동 생성이 되지 않도록
- `seedDevAdmin`은 **NODE_ENV === "production"** 인 경우 기본적으로 실행을 거부합니다.
- 정말 운영에서 seed가 필요하면(권장하지 않음) 아래 추가 플래그를 명시하세요.

```bash
ALLOW_PROD_SEED_ADMIN=true npm --prefix backend run seed:dev-admin
```

## 3) 운영 배포 시 주의사항
- 운영 배포 파이프라인에서 `seed:dev-admin`을 자동 실행하지 마세요.
- 운영에서 admin 계정 생성이 필요하면,
  - (권장) 별도 DB 마이그레이션/관리자 콘솔로 계정을 생성하거나,
  - (차선) 운영에서만 명시적으로 `ADMIN_EMAIL/ADMIN_PASSWORD`를 주입해 seed를 실행하세요.

## 4) legacy SQL 덤프 분리
- `backend/database/postgres/legacy_seed_v1.sql` 는 레거시/참고용 덤프이며,
  운영의 DB 초기화 흐름(예: Docker `init/01_schema.sql`)에 포함되지 않습니다.
- 운영 흐름에서 해당 파일을 자동 실행하지 마세요.

## 5) 수정 후 API 통신/DB/환경변수 흐름(운영 안전 버전)
### DB 테이블
- `users` 테이블: `role = 'admin'` 인 계정을 사용합니다. (seed 스크립트가 해당 계정을 생성/업데이트)

### 인증 흐름
1. 클라이언트가 `/api/auth/login` 으로 `email`, `password` 전송
2. 서버가 `users`에서 비밀번호 검증 후 JWT 발급
3. 프론트/관리자 화면은 JWT를 `Authorization: Bearer <token>` 헤더로 사용해 API를 호출

### 환경변수(필수/선택)
- 기존 서버 동작용:
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`
- dev admin seed용(필수):
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
- 운영에서 실수 실행 방지용(선택):
  - `ALLOW_PROD_SEED_ADMIN=true` (운영에서 정말 seed가 필요할 때만)

### 배포 시 주의사항
- 운영에서는 `seed:dev-admin`을 자동 실행하지 않도록 배포 파이프라인을 분리하세요.
- 운영 DB에 admin 계정이 없으면 `/api/auth/login` 로그인은 실패합니다(이는 의도된 안전장치입니다).

## 관련 문서
- [프론트 회사/연락처/푸터 데이터 소스](../FRONTEND_COMPANY_DATA_SOURCES.md)

