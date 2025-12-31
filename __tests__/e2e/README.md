# E2E 테스트 설정 가이드

## 개요

Playwright E2E 테스트는 Unit/Integration 테스트로는 검증할 수 없는 핵심 사용자 플로우를 검증하기 위해 구성되었습니다.

## ✨ 자동화된 테스트 계정 관리

E2E 테스트는 **자동으로 테스트 계정을 생성/삭제**합니다:

-   **테스트 시작 시**: Free 및 Pro 티어 테스트 계정 자동 생성
-   **테스트 종료 시**: 생성된 테스트 계정 자동 삭제
-   **격리 보장**: 개발/운영 데이터와 완전히 분리

**필요한 환경 변수 (`.env.test` 또는 `.env.local`):**

```bash
# Supabase 기본 설정 (이미 있을 것)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# E2E 테스트를 위한 Admin 권한 키 (새로 추가)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 대시보드 → Settings → API에서 확인 가능

## 테스트 시나리오

### 1. 이미지 업로드 플로우 (`image-upload.spec.ts`)

**검증 대상:** `use-image-upload.ts` 훅

-   ✅ Supabase Storage로 이미지 업로드 성공
-   ✅ 용량 초과 이미지(>5MB) 에러 처리
-   ✅ 이미지 미리보기 렌더링

### 2. 페이지 이탈 경고 (`navigation-warning.spec.ts`)

**검증 대상:** `use-navigation-warning.ts` 훅

-   ✅ 저장되지 않은 내용이 있을 때 페이지 이탈 시 브라우저 `beforeunload` 이벤트 발생
-   ✅ 내용이 저장된 경우 경고 없이 이동

### 3. AI 티어 제한 (`ai-tier-limits.spec.ts`)

**검증 대상:** 핵심 비즈니스 로직 (Rules: 현금 흐름 보호)

-   ✅ Free 티어: 일일 AI 상담 2회 제한
-   ✅ Pro 티어: 일일 AI 상담 10회 제한
-   ✅ 제한 초과 시 적절한 에러 메시지 표시

## E2E 테스트 실행 방법

### 사전 준비

1. **Supabase Service Role Key 설정**:

    ```bash
    # .env.test 또는 .env.local에 추가
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    ```

2. **테스트 계정은 자동으로 생성됩니다** - 수동 작업 불필요!

### 실행 명령어

```bash
# 모든 E2E 테스트 실행 (headless 모드)
npm run test:e2e

# UI 모드로 실행 (대화형)
npm run test:e2e:ui

# 특정 테스트 파일만 실행
npx playwright test image-upload.spec.ts

# 브라우저를 보면서 실행 (headed 모드)
npx playwright test --headed
```

## 작동 원리

**Global Setup (`global-setup.ts`):**

-   테스트 시작 전 `test-free-e2e@example.com` (Free 티어) 계정 생성
-   테스트 시작 전 `test-pro-e2e@example.com` (Pro 티어) 계정 생성

**Global Teardown (`global-teardown.ts`):**

-   테스트 종료 후 `*e2e@example.com` 패턴의 모든 테스트 계정 삭제

## 설정

**파일:** `playwright.config.ts`

-   Next.js 개발 서버를 `http://localhost:3000`에서 자동 시작
-   기본적으로 Chromium 브라우저 사용
-   실패 시 스크린샷 자동 캡처
-   HTML 리포트 생성

## 중요 사항

✅ **완전 자동화:**

-   테스트 계정 수동 생성 불필요
-   격리된 환경에서 실행
-   개발/운영 데이터에 영향 없음

⚠️ **Vitest Coverage 주의:**

-   E2E 테스트는 `vitest.config.ts`에서 `exclude`되어 있음
-   `npm test` (Vitest)와 `npm run test:e2e` (Playwright)는 별도로 실행됨
-   Code coverage는 Unit/Integration 테스트만 포함

⚠️ **CI/CD 환경:**

-   GitHub Actions 등에서 실행 시 `SUPABASE_SERVICE_ROLE_KEY`를 Secrets에 추가 필요
-   테스트 Supabase 프로젝트 사용 권장 (운영 DB와 분리)

## 다음 단계

E2E 테스트를 더욱 강화하려면:

1. 전용 테스트 Supabase 프로젝트 설정 (선택사항)
2. GitHub Actions 워크플로우 구성
3. 시각적 회귀 테스트 추가 (선택사항)
4. 더 많은 사용자 플로우 시나리오 추가
