const config = {
    // 1. 개발 모드에서 2번 렌더링/실행되는 것 방지 (운영과 동일하게 1번만 실행)
    reactStrictMode: false,

    // 2. SWC 컴파일러로 코드 압축 (속도 향상)
    // swcMinify: true, // Next.js 13+ defaults to true

    // 3. 보안을 위해 Next.js 사용 정보 헤더 숨김
    poweredByHeader: false,

    // (선택) 빌드 시 console.log 자동 제거 (개발 땐 보이고, 배포 땐 안 보임)
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // (참고) 이미지 도메인 허용 (Supabase나 카카오 프사 쓸 때 필요)
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**', // 모든 도메인 허용 (개발 편의성 위해)
            },
        ],
    },
}

export default config
