import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages는 standalone 출력을 지원하지 않으므로 제거
  // Cloudflare Pages는 Next.js를 직접 빌드하여 배포합니다
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Cloudflare Pages 배포 최적화
  // 캐시 디렉토리는 배포에 포함하지 않음 (25 MiB 제한)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 빌드 최적화
      config.optimization = {
        ...config.optimization,
        minimize: true,
        // 코드 스플리팅 최적화
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // 공통 라이브러리 분리
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // MUI 라이브러리 분리
            mui: {
              name: 'mui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              priority: 30,
              enforce: true,
            },
            // 기타 라이브러리
            lib: {
              name: 'lib',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // 공통 코드
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  // Cloudflare Pages 최적화: 이미지 최적화 비활성화 (Cloudflare에서 처리)
  images: {
    unoptimized: true,
  },
  // 주의: Cloudflare Pages는 standalone 출력을 지원하지 않으므로 제거
  // output: 'standalone', // Cloudflare Pages에서는 사용 불가
  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;

