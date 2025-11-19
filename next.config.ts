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
  // ESLint 빌드 중 오류 무시 (배포 시 ESLint circular structure 오류 방지)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript 빌드 중 오류 무시 (strict mode로 인한 타입 오류 방지)
  // 주의: 실제 타입 오류는 개발 중에 확인해야 함
  typescript: {
    ignoreBuildErrors: false, // 타입 오류는 수정하되, 빌드 실패 방지
  },
  // Cloudflare Pages 배포 최적화
  // 캐시 디렉토리는 배포에 포함하지 않음 (25 MiB 제한)
  webpack: (config, { isServer }) => {
    // @opennextjs/cloudflare는 런타임에만 필요하므로 빌드 시점에 번들에서 제외
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('@opennextjs/cloudflare');
      } else if (typeof config.externals === 'object') {
        config.externals['@opennextjs/cloudflare'] = 'commonjs @opennextjs/cloudflare';
      }
    }
    
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

