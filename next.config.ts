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
      };
    }
    return config;
  },
};

export default nextConfig;

