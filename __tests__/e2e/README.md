# E2E 테스트 설정 가이드

## 개요

Playwright E2E 테스트는 Unit/Integration 테스트로는 검증할 수 없는 핵심 사용자 플로우를 검증하기 위해 구성되었습니다.

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

1. **테스트 환경 변수 설정** (`.env.test` 파일 생성):

    ```bash
    TEST_FREE_USER_EMAIL=test-free@example.com
    TEST_FREE_USER_PASSWORD=testpassword
    TEST_PRO_USER_EMAIL=test-pro@example.com
    TEST_PRO_USER_PASSWORD=testpassword
    ```

2. **테스트 계정 생성**: Supabase에서 Free 및 Pro 티어 테스트 계정 생성

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

## 설정

**파일:** `playwright.config.ts`

-   Next.js 개발 서버를 `http://localhost:3000`에서 자동 시작
-   기본적으로 Chromium 브라우저 사용
-   실패 시 스크린샷 자동 캡처
-   HTML 리포트 생성

## 중요 사항

⚠️ **테스트 실행 요구사항:**

-   Next.js 앱 실행 (Playwright가 자동으로 시작)
-   유효한 Supabase 자격증명
-   적절한 티어가 할당된 테스트 계정

⚠️ **CI/CD 환경에서는 아직 사용 불가** - 실제 Supabase 인스턴스 및 테스트 데이터 설정 필요

## 다음 단계

E2E 테스트를 CI/CD 환경에서 실행하려면:

1. 전용 테스트 Supabase 프로젝트 설정
2. 테스트 계정 자동 생성을 위한 데이터베이스 시딩 스크립트 추가
3. GitHub Actions 워크플로우 구성
4. 시각적 회귀 테스트 추가 (선택사항)
