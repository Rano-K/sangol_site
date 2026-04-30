# PostgreSQL (산골 제안서 스키마)

Express 백엔드는 현재 **PostgreSQL(`pg`)** 기준으로 연결되며, 여기서는 Docker/DBeaver로 로컬 DB를 운영하는 방법을 정리합니다.

---

## 1. Docker로 PostgreSQL 올리기 (구체 안내)

### 1-1. 사전 준비

- **Docker Desktop**(Windows·macOS) 또는 Linux에서 **Docker Engine + Docker Compose 플러그인**이 설치되어 있어야 합니다.
- 터미널에서 아래가 오류 없이 나오면 준비된 것입니다.

```bash
docker --version
docker compose version
```

`docker compose version` 이 실패하면 **Compose V2 플러그인이 없는 환경**일 수 있습니다. 아래 **1-0절**을 보고, `npm run docker:postgres:up` 은 자동으로 **`docker-compose`(V1)** 로도 시도하도록 되어 있습니다.

- **macOS**: **Docker Desktop**을 실행한 뒤(메뉴 막대 고래 아이콘이 정상), 터미널을 다시 엽니다.  
  Docker가 꺼져 있으면 `failed to connect to the Docker API at unix:///var/run/docker.sock` 같은 메시지가 납니다. 이 경우 **Docker Desktop을 켠 뒤** 다시 `docker ps` 로 확인합니다.

### 1-0. 터미널 오류가 날 때 (자주 나는 두 가지)

#### (1) `unknown shorthand flag: 'f' in -f`

`docker compose -f …` 에서 `-f` 를 **맨 앞 `docker` 명령**이 받아 버리는 경우입니다. 보통은 아래 중 하나입니다.

- 이 PC에 **`docker compose`(V2 서브커맨드)** 가 없고, 예전 방식인 **`docker-compose`(하이픈)** 만 있는 경우  
  → `npm run docker:postgres:up` 은 `backend/scripts/docker-postgres.sh` 를 통해 **V2가 없으면 V1을 씁니다.** 스크립트 실행 전에 한 번 확인해 보세요.

```bash
cd sangol/backend
bash scripts/docker-postgres.sh up -d
```

- **Docker Desktop**을 쓰는 경우: **Settings → General** 에서 **“Use Docker Compose V2”** 를 켠 뒤 Docker Desktop을 재시작해 보세요.

직접 칠 때는 V1이면 하이픈 붙은 형태로 실행합니다.

```bash
docker-compose -f docker-compose.postgres.yml up -d
```

#### (2) `failed to connect to the Docker API at unix:///var/run/docker.sock`

**Docker 데몬이 안 떠 있는 상태**입니다 (Docker Desktop 미실행, 설치만 하고 엔진이 꺼짐, Colima/Rancher만 쓰는데 소켓 경로가 다른 경우 등).

- **Docker Desktop(macOS)**: 앱을 실행하고 메뉴 막대에 고래 아이콘이 뜬 뒤, 터미널에서 `docker ps` 가 정상일 때까지 기다립니다.
- Docker를 쓰지 않고 **로컬에 설치한 PostgreSQL**만 쓸 경우: DBeaver로 그 인스턴스에 붙이면 되고, 이 README의 Docker 절은 건너뛰면 됩니다.

### 1-2. 프로젝트 위치로 이동

저장소 루트가 `sangol`이라고 할 때, **반드시 `backend` 폴더 안**에서 Compose를 실행해야 `database/postgres/init` 경로가 맞습니다.

```bash
cd sangol/backend
```

(`sangol`은 클론해 둔 프로젝트 루트 폴더 이름입니다. 실제 경로에 맞게 `cd`만 바꿉니다.)

### 1-3. 컨테이너 기동

백그라운드로 실행합니다(`-d`: detached).

**권장:** `docker compose` / `docker-compose` 중 사용 가능한 쪽을 고르는 스크립트가 들어 있습니다.

```bash
bash scripts/docker-postgres.sh up -d
```

**npm** (`backend` 디렉터리에서):

```bash
npm run docker:postgres:up
```

직접 한 줄로 쓸 때는 환경에 맞게 **둘 중 하나만** 씁니다.

```bash
docker compose -f docker-compose.postgres.yml up -d
# 또는 (Compose V1)
docker-compose -f docker-compose.postgres.yml up -d
```

### 1-4. 정상 기동 확인

1. **실행 중인 컨테이너 목록**

```bash
docker ps
```

다음과 비슷하게 **`sangol-postgres`** 이름과 **포트 `0.0.0.0:5432->5432/tcp`** 가 보이면 됩니다.

2. **로그(초기화 SQL 실행 여부)**

```bash
docker logs sangol-postgres
```

맨 아래쪽에 `database system is ready to accept connections` 가 보이면 준비 완료입니다.  
처음 데이터 볼륨을 만들 때는 `running ... /docker-entrypoint-initdb.d/` 처럼 초기화 스크립트가 돌아가는 로그가 잠깐 나올 수 있습니다.

3. **컨테이너 안에서 DB 접속 테스트(선택)**

```bash
docker exec -it sangol-postgres psql -U sangol -d sangol -c "\dt"
```

테이블 목록(`franchises`, `users`, `products` 등)이 나오면 스키마가 적용된 것입니다.

### 1-5. Docker가 쓰는 접속 정보(기본값)

| 항목 | 값 |
|------|-----|
| 호스트 | `127.0.0.1` 또는 `localhost` |
| 포트 | `5432` |
| 데이터베이스 | `sangol` |
| 사용자 | `sangol` |
| 비밀번호 | `sangol_dev_change_me` |

비밀번호는 **`backend/docker-compose.postgres.yml`** 의 `POSTGRES_PASSWORD` 에서 바꿀 수 있습니다. 바꾼 뒤에는 DBeaver 연결 정보도 같이 맞춥니다.

### 1-6. 포트 5432가 이미 사용 중일 때

다른 PostgreSQL이나 도구가 5432를 쓰고 있으면 Compose가 실패합니다.

1. `backend/docker-compose.postgres.yml` 을 엽니다.
2. `ports` 를 예를 들어 **호스트만 5433**으로 바꿉니다.

```yaml
ports:
  - "5433:5432"
```

의미: **내 PC의 5433** → **컨테이너 안의 5432**.  
이때 DBeaver에서는 **Port = 5433** 으로 연결합니다.

### 1-7. 초기화 SQL이 언제 실행되는지(중요)

- `docker-entrypoint-initdb.d` 에 넣은 `init/*.sql` 은 **Postgres 데이터 디렉터리가 비어 있는 “첫 생성” 때만** 자동 실행됩니다.
- 이미 한 번 띄운 적이 있어 **볼륨 `sangol_pg_data`에 데이터가 남아 있으면**, 컨테이너를 껐다 켜도 **`01_schema.sql` 은 다시 실행되지 않습니다.**

추가 주의:
- `legacy_seed_v1.sql` 및 `SANGOL_PHP/*.sql` 같은 legacy dump는 **운영 초기화 흐름에 포함되지 않습니다.**
- legacy dump 분리 가이드는 `LEGACY_DUMPS.md` 를 참고하세요.

스키마를 **처음부터 다시** 깔고 싶을 때:

```bash
cd sangol/backend
npm run docker:postgres:reset
```

또는:

```bash
bash scripts/docker-postgres.sh down -v
bash scripts/docker-postgres.sh up -d
```

`-v` 는 이 Compose 파일이 만든 **볼륨까지 삭제**합니다. 로컬 개발 DB만 해당할 때 사용하세요.

**npm으로 동일 동작:**

```bash
npm run docker:postgres:reset
```

### 1-8. 중지만 하고 데이터는 유지할 때

```bash
npm run docker:postgres:down
```

또는 `bash scripts/docker-postgres.sh down`  
(볼륨은 남기므로 DB 데이터는 유지됩니다.)

### 1-9. 자주 나는 오류

| 증상 | 원인 후보 | 조치 |
|------|-----------|------|
| `Cannot connect to the Docker daemon` 또는 `failed to connect to the Docker API at unix:///var/run/docker.sock` | Docker Desktop 미실행 | Docker 켠 뒤 `docker ps` 로 재시도 |
| `unknown shorthand flag: 'f' in -f` | `docker compose` V2 없음 | 위 **1-0 (1)** / `npm run docker:postgres:up` 사용 |
| `port is already allocated` | 5432 사용 중 | 위 1-6처럼 포트 변경 |
| DBeaver는 되는데 `\dt` 가 비었다 | 예전 볼륨에 빈 DB만 있음 | `down -v` 후 `up -d` 또는 DBeaver에서 `01_schema.sql` 수동 실행 |

---

## 2. DBeaver에서 연결·셋팅하기 (구체 안내)

아래는 **DBeaver Community**(무료) 기준입니다. 설치는 [https://dbeaver.io/download/](https://dbeaver.io/download/) 에서 OS에 맞게 받으면 됩니다.

### 2-1. PostgreSQL 드라이버

1. DBeaver 실행 → 상단 메뉴 **Database → Driver Manager**.
2. **PostgreSQL** 이 있고 상태가 정상이면 다음 단계로 갑니다.
3. 최초 연결 시 “드라이버 파일 다운로드” 안내가 뜨면 **Download** 를 눌러 받습니다(회사망이면 방화벽 허용이 필요할 수 있습니다).

### 2-2. 새 연결 만들기

1. 왼쪽 상단 **“새 연결”**(플러그 아이콘) 또는 **Database → New Database Connection**.
2. **PostgreSQL** 선택 → **Next**.

### 2-3. 연결 설정 화면(Main 탭)

Docker Compose **기본값**을 그대로 쓸 때 예시입니다.

| 필드 | 입력 값 |
|------|---------|
| **Host** | `localhost` |
| **Port** | `5432` (Compose에서 5433으로 바꿨다면 `5433`) |
| **Database** | `sangol` |
| **Username** | `sangol` |
| **Password** | `sangol_dev_change_me` |

- **Save password** 체크: 매번 비밀번호 입력을 줄이려면 체크합니다(개인 PC 권장, 공용 PC는 비권장).

### 2-4. 연결 테스트

1. 화면 하단 **Test Connection …** 클릭.
2. 성공 시 `Connected` 메시지가 뜹니다.
3. **Finish** 로 저장합니다.

이제 왼쪽 **Database Navigator** 에 방금 만든 연결이 보입니다. 펼치면 **Databases → sangol → Schemas → public → Tables** 아래에 테이블이 보여야 합니다.

### 2-5. SQL 편집기에서 스크립트 실행하기

**Docker로 이미 `up` 한 경우** 보통은 초기화 때 `01_schema.sql` 이 적용되어 있어 **추가 실행이 필요 없을 수 있습니다.**  
테이블이 없거나, **Docker 없이 직접 DB만 만들었을 때** 아래를 따릅니다.

#### (A) 데이터베이스 `sangol` 이 아직 없을 때

1. DBeaver에서 **기본 DB `postgres`** 로 연결하는 새 연결을 하나 더 만듭니다.  
   - Host·Port·Username·Password는 동일  
   - **Database** 만 `postgres`
2. 그 연결을 선택한 채 **SQL Editor → New SQL Script** (또는 `Ctrl+]` / mac은 단축키는 메뉴에 표시).
3. 워크스페이스의 파일 **`backend/database/postgres/manual/00_create_database.sql`** 내용을 붙여 넣거나, DBeaver에서 **File → Open File** 로 해당 파일을 엽니다.
4. 스크립트 전체 선택 후 **Execute SQL Statement** (아이콘: 주황 삼각형) 또는 **Ctrl+Enter** (Windows·Linux) / **⌘+Enter** (macOS).
5. 성공 후 **Database Navigator** 에서 연결을 우클릭 → **Edit Connection** → **Database** 를 `sangol` 로 바꾸거나, `sangol` 전용 새 연결을 만듭니다.

#### (B) `sangol` DB에 스키마만 넣을 때

1. **Database가 `sangol`** 인 연결로 접속했는지 확인합니다.
2. **SQL Editor** 를 열고 **`backend/database/postgres/init/01_schema.sql`** 파일을 통째로 실행합니다(방법은 위와 동일).
3. **public → Tables** 를 새로고침(F5) 해서 `franchises`, `users`, `orders` 등이 생겼는지 확인합니다.

**주의:** 이미 테이블·ENUM이 있는 DB에 **같은 `01_schema.sql` 을 다시 실행**하면 `already exists` 오류가 납니다. 그때는 개발용 DB라면 Docker에서는 **`docker compose ... down -v`** 로 초기화하거나, DBeaver에서 객체를 수동으로 지운 뒤 다시 실행해야 합니다.

### 2-6. 한글·타임존(참고)

- DB 인코딩은 Docker 기본 이미지에서 **UTF-8** 로 생성되는 경우가 일반적입니다.
- `01_schema.sql` 에는 **타임스탬프 컬럼이 `TIMESTAMPTZ`** 로 되어 있어, 서버/세션 타임존에 따라 DBeaver에 보이는 시각이 달라질 수 있습니다. 필요하면 DBeaver **Window → Preferences → Database → Result Sets → Data Formatting** 에서 시간대를 확인합니다.

---

## 3. 스키마 요약(참고)

- **franchises**: 가맹점(B2B)  
- **users**: `admin` / `franchise`(가맹점 소속 필수) / `customer`(B2C)  
- **products**: `product_code`, 단위, `tax_type`, `cost_price`, `price`  
- **orders** / **order_items**: `b2b` / `b2c`, 합산·상세  
- **order_status_logs**: 상태 변경 이력  
- **notices**, **inquiries**: 공지·문의  

`users.password` 컬럼명은 기존 Node 로그인 예시 코드와 맞춰 두었습니다.
