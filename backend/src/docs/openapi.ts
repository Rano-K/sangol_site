export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SANGOL Backend API",
    version: "1.0.0",
    description: "산골 서비스 백엔드 API 문서",
  },
  servers: [
    {
      url: "http://localhost:5001",
      description: "Local",
    },
  ],
  tags: [
    { name: "Health", description: "서버 상태 확인" },
    { name: "Auth", description: "인증" },
    { name: "Products", description: "상품 조회" },
    { name: "Orders", description: "주문" },
    { name: "Shopping", description: "관심/장바구니" },
    { name: "Admin", description: "관리자 API" },
    { name: "Content", description: "CMS 콘텐츠 API" },
    { name: "Community", description: "커뮤니티 API" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          error: { type: "string", example: "오류 메시지" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@example.com" },
          password: { type: "string", example: "yourStrongPassword" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              email: { type: "string", format: "email" },
              name: { type: "string" },
              role: { type: "string", enum: ["admin", "franchise"] },
              franchiseId: { type: "integer", nullable: true },
              franchiseKey: { type: "string", nullable: true, example: "FRA-000001" },
            },
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "integer" },
          product_code: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          price: { type: "number" },
          stock_quantity: { type: "integer" },
          stock_status: { type: "string", enum: ["in_stock", "low_stock", "out_of_stock"] },
          is_active: { type: "boolean" },
          image_url: { type: "string", nullable: true },
        },
      },
      CreateOrderRequest: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["productId", "quantity"],
              properties: {
                productId: { type: "integer", minimum: 1 },
                quantity: { type: "integer", minimum: 1 },
              },
            },
          },
          deliveryAddress: { type: "string", nullable: true },
          deliveryRequest: { type: "string", nullable: true },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "서버 상태 확인",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "로그인",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "로그인 성공",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "401": {
            description: "인증 실패",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/api/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "비밀번호 변경 (현재 구현 예정)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "501": { description: "구현 예정" },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "상품 목록 조회",
        parameters: [
          {
            in: "query",
            name: "q",
            schema: { type: "string" },
            required: false,
            description: "검색 키워드",
          },
        ],
        responses: {
          "200": {
            description: "조회 성공",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Product" },
                },
              },
            },
          },
        },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "상품 단건 조회",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": { description: "조회 성공" },
          "404": { description: "상품 없음" },
        },
      },
    },
    "/api/products/{id}/image-file": {
      get: {
        tags: ["Products"],
        summary: "상품 이미지 파일 조회",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": { description: "이미지 반환" },
          "404": { description: "이미지 없음" },
        },
      },
    },
    "/api/products/category/{category}": {
      get: {
        tags: ["Products"],
        summary: "카테고리별 상품 조회",
        parameters: [
          {
            in: "path",
            name: "category",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "조회 성공" },
        },
      },
    },
    "/api/orders": {
      post: {
        tags: ["Orders"],
        summary: "주문 생성(B2C/B2B 공용)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOrderRequest" },
            },
          },
        },
        responses: {
          "201": { description: "주문 생성 성공" },
          "400": { description: "검증 실패" },
        },
      },
    },
    "/api/orders/franchise": {
      get: {
        tags: ["Orders"],
        summary: "가맹점 주문 내역 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "조회 성공" },
          "401": { description: "토큰 없음" },
          "403": { description: "권한 없음" },
        },
      },
    },
    "/api/shopping/summary": {
      get: {
        tags: ["Shopping"],
        summary: "관심/장바구니 요약",
        description: "로그인 사용자는 Bearer, 비로그인은 x-client-key 헤더 사용",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "조회 성공" },
        },
      },
    },
    "/api/shopping/wishlist": {
      get: {
        tags: ["Shopping"],
        summary: "관심상품 목록 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "조회 성공" } },
      },
      post: {
        tags: ["Shopping"],
        summary: "관심상품 추가",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId"],
                properties: {
                  productId: { type: "integer", minimum: 1 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "추가 성공" } },
      },
    },
    "/api/shopping/wishlist/{productId}": {
      delete: {
        tags: ["Shopping"],
        summary: "관심상품 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "productId",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "삭제 성공" } },
      },
    },
    "/api/shopping/cart": {
      get: {
        tags: ["Shopping"],
        summary: "장바구니 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "조회 성공" } },
      },
      post: {
        tags: ["Shopping"],
        summary: "장바구니 추가",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId"],
                properties: {
                  productId: { type: "integer", minimum: 1 },
                  quantity: { type: "integer", minimum: 1, default: 1 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "추가 성공" } },
      },
    },
    "/api/shopping/cart/{productId}": {
      patch: {
        tags: ["Shopping"],
        summary: "장바구니 수량 변경",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "productId",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: { type: "integer", minimum: 1 },
                },
              },
            },
          },
        },
        responses: { "200": { description: "변경 성공" } },
      },
      delete: {
        tags: ["Shopping"],
        summary: "장바구니 항목 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "productId",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
          {
            in: "header",
            name: "x-client-key",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "삭제 성공" } },
      },
    },
    "/api/shopping/sync-guest": {
      post: {
        tags: ["Shopping"],
        summary: "비로그인 쇼핑 데이터 사용자 계정으로 동기화",
        description: "로그인 토큰과 x-client-key가 모두 필요합니다.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "x-client-key",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "동기화 성공" },
          "401": { description: "로그인 필요" },
          "400": { description: "클라이언트 키 누락" },
        },
      },
    },
    "/api/franchises/location": {
      get: {
        tags: ["Admin"],
        summary: "오시는 길 가맹점 현황 조회(공개)",
        responses: { "200": { description: "조회 성공" } },
      },
    },
    "/api/franchises/me": {
      get: {
        tags: ["Admin"],
        summary: "내 가맹점 정보 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "조회 성공" },
          "401": { description: "토큰 없음" },
          "404": { description: "가맹점 없음" },
        },
      },
    },
    "/api/notices": {
      get: {
        tags: ["Admin"],
        summary: "공지사항 목록 조회(공개)",
        responses: { "200": { description: "조회 성공" } },
      },
    },
    "/api/notices/{id}": {
      get: {
        tags: ["Admin"],
        summary: "공지사항 상세 조회(조회수 증가)",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": { description: "조회 성공" },
          "404": { description: "공지 없음" },
        },
      },
    },
    "/api/inquiries": {
      post: {
        tags: ["Admin"],
        summary: "문의 등록(공개)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "phone", "subject", "message"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string", example: "010-1234-5678" },
                  subject: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "등록 성공" },
          "400": { description: "검증 실패" },
        },
      },
    },
    "/api/admin/location-franchises": {
      get: { tags: ["Admin"], summary: "가맹점(위치) 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공 (franchise_key/member_link_key 포함)" } } },
      post: {
        tags: ["Admin"],
        summary: "가맹점(위치) 생성",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["storeType", "name", "address"],
                properties: {
                  franchiseKey: { type: "string", nullable: true, maxLength: 32, example: "FRA-000123" },
                  storeType: { type: "string", example: "가맹점" },
                  name: { type: "string", example: "산골 강남점" },
                  storePhone: { type: "string", nullable: true },
                  ownerName: { type: "string", nullable: true },
                  ownerPhone: { type: "string", nullable: true },
                  address: { type: "string" },
                  displayOrder: { type: "integer", minimum: 0, default: 0 },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: { "201": { description: "생성 성공" }, "409": { description: "franchise_key 중복" } },
      },
    },
    "/api/admin/location-franchises/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "가맹점(위치) 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  franchiseKey: { type: "string", nullable: true, maxLength: 32, example: "FRA-000123" },
                  storeType: { type: "string" },
                  name: { type: "string" },
                  storePhone: { type: "string", nullable: true },
                  ownerName: { type: "string", nullable: true },
                  ownerPhone: { type: "string", nullable: true },
                  address: { type: "string" },
                  displayOrder: { type: "integer", minimum: 0 },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "수정 성공" }, "409": { description: "franchise_key 중복" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "가맹점(위치) 비활성화",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "삭제(비활성) 성공" } },
      },
    },
    "/api/admin/dashboard/stats": {
      get: { tags: ["Admin"], summary: "대시보드 통계 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
    },
    "/api/admin/orders": {
      get: { tags: ["Admin"], summary: "관리자 주문 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
    },
    "/api/admin/orders/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "관리자 주문 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "수정 성공" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "관리자 주문 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "삭제 성공" } },
      },
    },
    "/api/admin/orders/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "주문 상태 변경",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "변경 성공" } },
      },
    },
    "/api/admin/products": {
      get: { tags: ["Admin"], summary: "관리자 상품 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
      post: { tags: ["Admin"], summary: "관리자 상품 생성", security: [{ bearerAuth: [] }], responses: { "201": { description: "생성 성공" } } },
    },
    "/api/admin/products/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "관리자 상품 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "수정 성공" } },
      },
    },
    "/api/admin/inquiries": {
      get: { tags: ["Admin"], summary: "관리자 문의 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
    },
    "/api/admin/inquiries/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "관리자 문의 상태 변경",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "변경 성공" } },
      },
    },
    "/api/admin/notices": {
      get: { tags: ["Admin"], summary: "관리자 공지 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
      post: { tags: ["Admin"], summary: "관리자 공지 생성", security: [{ bearerAuth: [] }], responses: { "201": { description: "생성 성공" } } },
    },
    "/api/admin/notices/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "관리자 공지 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "수정 성공" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "관리자 공지 삭제(비활성)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "삭제 성공" } },
      },
    },
    "/api/admin/members": {
      get: { tags: ["Admin"], summary: "회원 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공 (franchise_key/member_link_key 포함)" } } },
      post: {
        tags: ["Admin"],
        summary: "회원 생성",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "name", "password", "role"],
                properties: {
                  email: { type: "string", format: "email" },
                  name: { type: "string" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string", enum: ["admin", "franchise"] },
                  franchiseKey: { type: "string", nullable: true, example: "FRA-000001" },
                  franchiseId: { type: "integer", nullable: true, deprecated: true },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: { "201": { description: "생성 성공" } },
      },
    },
    "/api/admin/members/franchises": {
      get: { tags: ["Admin"], summary: "회원 생성용 가맹점 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공 (id, franchise_key, name)" } } },
    },
    "/api/admin/members/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "회원 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  name: { type: "string" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string", enum: ["admin", "franchise"] },
                  franchiseKey: { type: "string", nullable: true, example: "FRA-000001" },
                  franchiseId: { type: "integer", nullable: true, deprecated: true },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "수정 성공" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "회원 삭제(비활성)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "삭제 성공" } },
      },
    },
    "/api/content/public/pages/{pageKey}": {
      get: {
        tags: ["Content"],
        summary: "공개 페이지 콘텐츠 조회",
        parameters: [{ in: "path", name: "pageKey", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "조회 성공" }, "404": { description: "페이지 없음" } },
      },
    },
    "/api/content/public/media/{id}": {
      get: {
        tags: ["Content"],
        summary: "공개 미디어 메타 조회",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "조회 성공" }, "404": { description: "미디어 없음" } },
      },
    },
    "/api/content/public/media/{id}/file": {
      get: {
        tags: ["Content"],
        summary: "공개 미디어 파일 조회",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "파일 반환" }, "404": { description: "파일 없음" } },
      },
    },
    "/api/content/admin/pages": {
      get: { tags: ["Content"], summary: "CMS 페이지 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
    },
    "/api/content/admin/pages/{pageKey}": {
      get: {
        tags: ["Content"],
        summary: "CMS 단일 페이지 조회",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "pageKey", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "조회 성공" }, "404": { description: "페이지 없음" } },
      },
      put: {
        tags: ["Content"],
        summary: "CMS 페이지 생성/수정(Upsert)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "pageKey", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "저장 성공" } },
      },
      delete: {
        tags: ["Content"],
        summary: "CMS 페이지 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "pageKey", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "삭제 성공" }, "404": { description: "페이지 없음" } },
      },
    },
    "/api/content/admin/media/upload": {
      post: {
        tags: ["Content"],
        summary: "CMS 미디어 업로드",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "업로드 성공" } },
      },
    },
    "/api/content/admin/media": {
      get: { tags: ["Content"], summary: "CMS 미디어 목록 조회", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
    },
    "/api/content/admin/media/{id}": {
      delete: {
        tags: ["Content"],
        summary: "CMS 미디어 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "삭제 성공" }, "404": { description: "미디어 없음" } },
      },
    },
    "/api/community/posts": {
      get: { tags: ["Community"], summary: "게시글 목록 조회", responses: { "200": { description: "조회 성공" } } },
      post: { tags: ["Community"], summary: "게시글 작성", responses: { "201": { description: "작성 성공" } } },
    },
    "/api/community/posts/{id}": {
      get: {
        tags: ["Community"],
        summary: "게시글 상세 조회",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } },
          { in: "query", name: "postPassword", required: false, schema: { type: "string" } },
        ],
        responses: { "200": { description: "조회 성공" }, "403": { description: "비밀글 접근 제한" }, "404": { description: "게시글 없음" } },
      },
      patch: {
        tags: ["Community"],
        summary: "비밀글 수정(비밀번호 필요)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "수정 성공" }, "403": { description: "비밀번호 불일치" }, "404": { description: "게시글 없음" } },
      },
    },
    "/api/community/posts/{id}/comments": {
      post: {
        tags: ["Community"],
        summary: "댓글 작성",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "201": { description: "작성 성공" }, "404": { description: "게시글 없음" } },
      },
    },
    "/api/community/concert-videos": {
      get: { tags: ["Community"], summary: "작은 음악회 공개 영상 목록", responses: { "200": { description: "조회 성공" } } },
    },
    "/api/community/admin/concert-videos": {
      get: { tags: ["Community"], summary: "작은 음악회 관리자 목록", security: [{ bearerAuth: [] }], responses: { "200": { description: "조회 성공" } } },
      post: { tags: ["Community"], summary: "작은 음악회 영상 등록", security: [{ bearerAuth: [] }], responses: { "201": { description: "등록 성공" } } },
    },
    "/api/community/admin/concert-videos/{id}": {
      patch: {
        tags: ["Community"],
        summary: "작은 음악회 영상 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "수정 성공" }, "404": { description: "영상 없음" } },
      },
      delete: {
        tags: ["Community"],
        summary: "작은 음악회 영상 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: { "200": { description: "삭제 성공" }, "404": { description: "영상 없음" } },
      },
    },
  },
} as const;

