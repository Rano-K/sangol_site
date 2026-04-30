# Sangol Backend API Schema v1 (고정)

- 기준일: 2026-04-20
- Base URL: `http://localhost:5001`
- Prefix: `/api`
- 인증 방식: `Authorization: Bearer <JWT>`
- 응답 Content-Type: `application/json`

## 공통 에러 형식

### 401
```json
{ "error": "인증 토큰이 필요합니다." }
```

### 403
```json
{ "error": "유효하지 않은 토큰입니다." }
```
또는
```json
{ "error": "관리자 권한이 필요합니다." }
```
또는
```json
{ "error": "가맹점 권한이 필요합니다." }
```

### 500
```json
{ "error": "...오류가 발생했습니다." }
```

---

## 1) Health

### GET `/api/health`

#### Response 200
```json
{
  "status": "ok",
  "message": "산골 API 서버가 정상 작동중입니다."
}
```

---

## 2) Auth

### POST `/api/auth/login`

#### Request
```json
{
  "email": "admin@example.com",
  "password": "yourStrongPassword"
}
```

#### Validation
- `email`: 이메일 형식 필수
- `password`: 빈 값 불가

#### Response 200
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "관리자",
    "role": "admin",
    "franchiseId": null
  }
}
```

#### Response 400
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "유효한 이메일을 입력하세요",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### Response 401
```json
{ "error": "이메일 또는 비밀번호가 일치하지 않습니다." }
```

### POST `/api/auth/change-password`

#### Request
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

#### Response 501
```json
{ "error": "구현 예정" }
```

---

## 3) Products

### GET `/api/products`
- 활성 상품 전체 목록

#### Response 200
```json
[
  {
    "id": 1,
    "product_code": "P-001",
    "name": "표고버섯",
    "category": "임산물",
    "unit": "1kg",
    "tax_type": "taxable",
    "price": "12000.00",
    "is_active": true,
    "stock_status": "in_stock"
  }
]
```

### GET `/api/products/category/:category`
- 카테고리별 활성 상품 목록

#### Path Param
- `category`: string

### GET `/api/products/:id`
- 단일 상품 조회

#### Path Param
- `id`: number

#### Response 404
```json
{ "error": "상품을 찾을 수 없습니다." }
```

---

## 4) Franchises

### GET `/api/franchises/me` (인증 필요)
- 현재 로그인 사용자의 `franchiseId` 기준 가맹점 정보 조회

#### Response 200
```json
{
  "id": 3,
  "name": "서울지점",
  "contact_person": "홍길동",
  "phone": "010-1234-5678",
  "is_active": true
}
```

#### Response 404
```json
{ "error": "가맹점 정보를 찾을 수 없습니다." }
```

---

## 5) Orders (B2B)

### POST `/api/orders` (인증 + franchise/admin 권한)

#### Request
```json
{
  "deliveryAddress": "서울시 강남구 ...",
  "deliveryRequest": "문 앞에 놓아주세요",
  "items": [
    { "productId": 1, "quantity": 3 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

#### Validation
- `items`: 배열, 비어있지 않아야 함

#### Response 201
```json
{
  "orderId": 101,
  "message": "주문이 성공적으로 생성되었습니다.",
  "totalAmount": 48000
}
```

### GET `/api/orders/franchise` (인증 + franchise/admin 권한)
- 현재 가맹점 주문 목록 조회

#### Response 200
```json
[
  {
    "id": 101,
    "franchise_id": 3,
    "status": "pending",
    "total_amount": "48000.00",
    "created_at": "2026-04-20T12:00:00.000Z",
    "items": [
      {
        "id": 1,
        "productName": "표고버섯",
        "quantity": 3,
        "unitPrice": "12000.00",
        "totalPrice": "36000.00"
      }
    ]
  }
]
```

---

## 6) Notices

### GET `/api/notices`
- 활성 공지 목록

### GET `/api/notices/:id`
- 공지 상세 조회(조회수 +1)

#### Response 404
```json
{ "error": "공지사항을 찾을 수 없습니다." }
```

---

## 7) Inquiries

### POST `/api/inquiries`

#### Request
```json
{
  "name": "김철수",
  "email": "user@example.com",
  "phone": "010-2222-3333",
  "subject": "배송 문의",
  "message": "언제 도착하나요?"
}
```

#### Validation
- `name`, `phone`, `subject`, `message`: 빈 값 불가
- `email`: 이메일 형식

#### Response 201
```json
{
  "id": 55,
  "message": "문의가 성공적으로 접수되었습니다."
}
```

---

## 8) Admin (인증 + admin 권한 필수)

### GET `/api/admin/dashboard/stats`

#### Response 200
```json
{
  "ordersToday": 2,
  "ordersTotal": 48,
  "revenueTotal": 1572000,
  "franchisesActive": 8,
  "inquiriesPending": 3
}
```

### GET `/api/admin/orders`
- 전체 주문 목록 조회

#### Response 200 (요약)
```json
[
  {
    "id": 101,
    "franchise_id": 3,
    "franchise_name": "서울지점",
    "status": "pending",
    "total_amount": "48000.00",
    "created_at": "2026-04-20T12:00:00.000Z"
  }
]
```

### PATCH `/api/admin/orders/:id/status`
- 주문 상태 변경

#### Request
```json
{ "status": "processing" }
```

#### Path Param
- `id`: number

#### Response 200
```json
{ "message": "주문 상태가 업데이트되었습니다." }
```

### GET `/api/admin/inquiries`
- 전체 문의 목록 조회

#### Response 200
```json
[
  {
    "id": 55,
    "name": "김철수",
    "subject": "배송 문의",
    "status": "pending",
    "created_at": "2026-04-20T11:00:00.000Z"
  }
]
```

---

## 권한 매트릭스 (v1 고정)

- `public`
  - `GET /api/health`
  - `POST /api/auth/login`
  - `POST /api/auth/change-password` (현재 501)
  - `GET /api/products`
  - `GET /api/products/category/:category`
  - `GET /api/products/:id`
  - `GET /api/notices`
  - `GET /api/notices/:id`
  - `POST /api/inquiries`

- `franchise | admin`
  - `GET /api/franchises/me`
  - `POST /api/orders`
  - `GET /api/orders/franchise`

- `admin only`
  - `/api/admin/*`

---

## 비고 (v1)

- 현재 응답 스키마는 DB 원본 컬럼명(snake_case) 기준입니다.
- `price`, `total_amount` 등 숫자형은 PostgreSQL 드라이버 특성상 문자열로 내려올 수 있습니다.
- `POST /api/auth/change-password`는 구현 전(501) 상태를 그대로 고정합니다.

## 추가 고정 규칙 (v1 보완)

- 본 문서의 Base URL `http://localhost:5001` 는 **로컬 개발 환경 기준 예시**입니다. staging/prod 환경에서는 도메인만 달라질 수 있으며, API Prefix(`/api`), 인증 방식, 엔드포인트 계약은 동일 기준으로 봅니다.
- 본 문서는 **2026-04-20 기준 실제 구현된 backend 라우트/권한/응답을 그대로 고정한 1차 연동 기준 문서**입니다. 문서에 명시되지 않은 필드, 쿼리 파라미터, 정렬, 페이지네이션, 부가 동작은 v1 보장 범위에 포함하지 않습니다.
- 에러 응답 형식은 현재 구현 기준으로 두 가지가 공존합니다. 일반 오류는 `{ "error": "..." }`, 입력 검증 오류는 `{ "errors": [...] }` 형식을 사용합니다. 프론트엔드/어드민에서는 두 형식을 모두 처리해야 합니다.
- 401/403의 의미는 일반적인 REST 관례보다 **현재 서버 구현 기준을 우선**합니다. 인증 토큰 누락 또는 로그인 실패는 401, 유효하지 않은 토큰 또는 역할 권한 부족은 403으로 처리합니다.
- 응답 필드명은 기본적으로 DB 원본 컬럼명 기준의 `snake_case` 를 따르지만, 일부 중첩 객체는 현재 구현상 `camelCase` 가 혼재할 수 있습니다. 이 경우 **각 엔드포인트 예시 응답을 최종 기준**으로 사용합니다.
- `franchise | admin` 권한 엔드포인트는 **라우트 접근 권한**을 의미합니다. 실제 데이터 조회/생성 가능 여부는 로그인 사용자에 연결된 `franchiseId` 및 현재 서버 구현에 따라 달라질 수 있으며, `franchiseId` 가 없는 계정은 일부 엔드포인트에서 정상 조회가 보장되지 않을 수 있습니다.
- 주문 상태값은 서버에서 허용하는 값만 유효합니다. 프론트엔드/어드민에서는 임의의 상태 문자열을 생성하지 않고, 문서 또는 실제 서버 응답으로 확인된 값만 사용합니다.
- `POST /api/auth/change-password` 는 v1에서 의도적으로 `501 Not Implemented` 상태를 유지합니다. 따라서 해당 엔드포인트는 **현재 사용 불가**이며, 공개 여부와 인증 정책은 실제 구현 시점에 별도로 확정합니다.
- `price`, `total_amount` 등 PostgreSQL `numeric` 계열 값은 드라이버 특성상 문자열로 내려올 수 있으므로, 클라이언트에서는 표시용/계산용 변환을 명시적으로 처리해야 합니다.
- 문서와 실제 응답이 충돌할 경우, 1차 연동 기간에는 **실제 서버 응답 payload를 우선 확인**하되, 확인된 차이는 즉시 본 문서에 반영하여 다시 고정합니다.
