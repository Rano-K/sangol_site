# API 로그 마스킹 가이드

이 문서는 `backend/src/middleware/apiLogger.ts`의 민감정보 마스킹 동작과, 운영/개발 환경에서 마스킹을 제어하는 방법을 설명합니다.

## 1) 기본 동작

- 마스킹은 **기본 활성화** 상태입니다.
- 아래 로그 모두에 마스킹이 적용됩니다.
  - 터미널 실시간 로그(`console.log`)
  - 파일 로그(`backend/logs/api.log`)
- 로그 항목에는 `maskingEnabled` 값이 기록됩니다.

## 2) 마스킹 대상

키 이름(대소문자 무관)에 아래 문자열이 포함되면 마스킹합니다.

- `password`, `passwd`, `pwd`
- `token`, `authorization`
- `cookie`, `set-cookie`
- `secret`, `api_key`, `apikey`
- `access_token`, `refresh_token`
- `email`, `phone`, `name`
- `resident`, `ssn`, `card`, `account`

예시:

- `password` -> `a***z` 형태로 출력
- `email` -> `u***m`
- 숫자형 민감값 -> `-1`
- 객체형 민감값 -> `[MASKED_OBJECT]`

## 3) 환경변수로 제어

### 3-1. 마스킹 유지(권장, 기본값)

설정이 없어도 기본적으로 활성화됩니다.

```env
LOG_MASKING_ENABLED=true
```

### 3-2. 마스킹 완전 해제(주의)

```env
LOG_MASKING_ENABLED=false
```

> 경고: 개인정보/인증정보가 로그에 원문으로 남을 수 있습니다.  
> 운영 환경에서는 사용하지 않는 것을 강력 권장합니다.

### 3-3. 특정 키만 마스킹 해제

일부 키만 예외적으로 원문 로그가 필요할 때 사용합니다.

```env
LOG_UNMASKED_KEYS=userid,orderid
```

- 콤마(,)로 구분
- 내부 비교는 소문자 기준
- 민감 키 예외는 최소화하세요

## 4) 적용 절차

1. `backend/.env`에 변수 추가/수정
2. 백엔드 서버 재시작

```bash
cd backend
npm run dev
```

## 5) 운영 권장안

- 운영:
  - `LOG_MASKING_ENABLED=true`
  - `LOG_UNMASKED_KEYS` 비우기
- 개발:
  - 필요 시 `LOG_UNMASKED_KEYS`로 최소 키만 제한적으로 해제
  - 전체 해제(`false`)는 짧은 시간 진단 용도로만 사용

## 6) 확인 방법

- 터미널 로그에서 민감값이 `***` 형태로 출력되는지 확인
- `backend/logs/api.log`에서 `maskingEnabled: true` 확인

