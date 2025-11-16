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
};

export default nextConfig;

