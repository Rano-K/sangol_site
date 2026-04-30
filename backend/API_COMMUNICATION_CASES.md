# API Communication & Logging Cases

## Logging Policy

- 모든 API 요청/응답/에러/상태를 `backend/logs/api.log`에 JSON Lines 형식으로 기록합니다.
- 로그 필드:
  - `request`: method, url, params, query, headers, body
  - `response`: statusCode, body
  - `error`: name, message, stack (에러 시)
  - `status`: success | error | aborted
  - `requestId`, `timestamp`, `durationMs`

---

## Response Data Policy

- API 통신 시 요청/응답의 전체 데이터는 서버 로그에 구조화(JSON)로 남깁니다.
- 클라이언트는 각 엔드포인트의 기존 응답 스키마를 유지하며, 디버깅/감사는 `api.log`에서 전체 데이터를 확인합니다.

---

## Cases

## 1) Success Case

- **Description**: 요청이 정상 처리되어 2xx 반환
- **When it happens**: 유효한 인증/입력/DB 상태
- **Request Example**

```json
{
  "method": "POST",
  "url": "/api/auth/login",
  "headers": {
    "content-type": "application/json"
  },
  "body": {
    "email": "admin@example.com",
    "password": "yourStrongPassword"
  }
}
```

- **Response Example**

```json
{
  "statusCode": 200,
  "body": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

- **Handling Strategy**
  - 클라이언트는 응답 데이터를 화면/상태 저장에 반영
  - `api.log`에서 `status: success` 추적

## 2) Client Error (4xx)

- **Description**: 클라이언트 요청 데이터 오류
- **When it happens**: 잘못된 파라미터, 잘못된 body 타입, 존재하지 않는 리소스
- **Request Example**

```json
{
  "method": "GET",
  "url": "/api/content/public/pages/unknown-page",
  "params": {
    "pageKey": "unknown-page"
  }
}
```

- **Response Example**

```json
{
  "statusCode": 404,
  "body": {
    "error": "요청한 페이지 콘텐츠를 찾을 수 없습니다."
  }
}
```

- **Handling Strategy**
  - 사용자 메시지 표시
  - 요청 값 재검증
  - 재시도 필요 여부 판단

## 3) Server Error (5xx)

- **Description**: 서버 내부 처리 실패
- **When it happens**: DB 연결 장애, 예외 throw, 내부 로직 실패
- **Request Example**

```json
{
  "method": "PUT",
  "url": "/api/content/admin/pages/home"
}
```

- **Response Example**

```json
{
  "statusCode": 500,
  "body": {
    "error": "페이지 콘텐츠 저장 중 오류가 발생했습니다."
  }
}
```

- **Handling Strategy**
  - 에러 응답 노출 최소화
  - `api.log`의 `type: error` / stack으로 원인 추적
  - 인프라/DB 상태 점검

## 4) Authentication / Authorization Error (401, 403)

- **Description**: 인증 실패 또는 권한 부족
- **When it happens**:
  - `401`: 토큰 누락/만료
  - `403`: role 불일치 (admin required)
- **Request Example**

```json
{
  "method": "GET",
  "url": "/api/content/admin/pages",
  "headers": {
    "authorization": "Bearer invalid-token"
  }
}
```

- **Response Example**

```json
{
  "statusCode": 403,
  "body": {
    "error": "유효하지 않은 토큰입니다."
  }
}
```

- **Handling Strategy**
  - 로그인 페이지 리다이렉트
  - 토큰 갱신 또는 재로그인
  - 관리자 권한 체크

## 5) Network Error / Timeout

- **Description**: 네트워크 단절, 타임아웃, 요청 중단
- **When it happens**: 서버 미기동, 프록시 장애, 클라이언트 abort
- **Request Example**

```json
{
  "method": "POST",
  "url": "/api/auth/login"
}
```

- **Response Example**

```json
{
  "statusCode": null,
  "body": null,
  "clientError": "TypeError: Failed to fetch"
}
```

- **Handling Strategy**
  - 지수 백오프 재시도
  - 사용자에게 네트워크 상태 안내
  - 서버 로그의 `status: aborted` 확인

## 6) Validation Error

- **Description**: 입력값 검증 실패
- **When it happens**: 이메일 형식/필수값 누락 등
- **Request Example**

```json
{
  "method": "POST",
  "url": "/api/auth/login",
  "body": {
    "email": "invalid-email",
    "password": ""
  }
}
```

- **Response Example**

```json
{
  "statusCode": 400,
  "body": {
    "errors": [
      {
        "msg": "유효한 이메일을 입력하세요"
      },
      {
        "msg": "비밀번호를 입력하세요"
      }
    ]
  }
}
```

- **Handling Strategy**
  - 필드별 에러 메시지 표시
  - 프런트 사전 검증과 서버 검증 병행

## 7) Edge Cases

- **Description**: 정상/오류 경계 상황
- **When it happens**:
  - JSON 파싱 실패
  - 빈 객체 저장
  - 중복 key upsert
  - 대용량 이미지 업로드 제한 초과
- **Request Example**

```json
{
  "method": "POST",
  "url": "/api/content/admin/media/upload",
  "headers": {
    "content-type": "multipart/form-data"
  },
  "body": {
    "image": "15MB-file.png"
  }
}
```

- **Response Example**

```json
{
  "statusCode": 500,
  "body": {
    "error": {
      "message": "이미지 파일만 업로드할 수 있습니다.",
      "status": 500
    }
  }
}
```

- **Handling Strategy**
  - 업로드 제한/형식 사전 안내
  - 프론트에서 파일 타입/용량 선검증
  - 서버에서 멀터 에러 코드 기반 메시지 매핑

---

## Log Record Format (JSONL)

```json
{
  "type": "request-response",
  "timestamp": "2026-04-26T07:30:00.000Z",
  "requestId": "1714123456789-ab12cd34",
  "durationMs": 23,
  "status": "success",
  "request": {
    "method": "GET",
    "url": "/api/health",
    "params": {},
    "query": {},
    "headers": {},
    "body": {}
  },
  "response": {
    "statusCode": 200,
    "body": {
      "status": "ok"
    }
  }
}
```

