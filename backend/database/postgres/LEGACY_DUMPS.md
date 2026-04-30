# Legacy / 개인정보 가능성 덤프 분리 가이드

## 운영(Production)에서 절대 실행하면 안 되는 것
- `backend/database/postgres/legacy_seed_v1.sql`
- `SANGOL_PHP/ikor250911t-20260409.sql` (레거시 PHP/Cafe24 덤프)

이 파일들은 “참고/레거시 추출” 성격이며, **운영 배포 시 DB 초기화/마이그레이션 파이프라인에 포함되지 않습니다.**

## 운영 코드 흐름(정상 동작)
- Docker 초기화 시 실행되는 경로: `backend/database/postgres/init/**`  
  - 예: `backend/database/postgres/init/01_schema.sql`
- Docker Compose 마운트:
  - `backend/docker-compose.postgres.yml` 에서 `./database/postgres/init:/docker-entrypoint-initdb.d:ro` 만 연결됩니다.

즉, 운영에서는 `init/` 외부의 legacy dump가 자동으로 실행될 여지가 없습니다.

## 로컬/테스트에서 legacy dump가 필요할 때
- 반드시 “별도 수동 절차”로만 실행하세요.
- 운영/스테이징 파이프라인에서 자동 실행되도록 스크립트에 연결하지 마세요.

## 권장 체크리스트
1. 운영 배포 파이프라인 또는 Docker 초기화 단계에서 `legacy_seed_v1.sql` / `SANGOL_PHP/*.sql` 을 참조하는지 검색
2. `init/01_schema.sql` 만 실행되는지 확인

