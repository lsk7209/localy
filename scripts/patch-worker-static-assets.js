#!/usr/bin/env node

/**
 * _worker.js에 정적 파일 처리 로직 추가
 * 
 * Pages에서 ASSETS 바인딩이 자동으로 생성되지만,
 * _next/static/ 요청을 먼저 처리하도록 _worker.js를 패치합니다.
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next', '_worker.js');

try {
  if (!fs.existsSync(workerPath)) {
    console.log('⚠️  .open-next/_worker.js를 찾을 수 없습니다.');
    console.log('   fix-pages-worker.js가 먼저 실행되었는지 확인하세요.');
    process.exit(0);
  }

  let workerContent = fs.readFileSync(workerPath, 'utf8');

  // 정적 파일 처리 로직이 이미 있는지 확인
  if (workerContent.includes('_next/static') && workerContent.includes('env.ASSETS?.fetch')) {
    console.log('ℹ️  _worker.js에 이미 정적 파일 처리 로직이 있습니다.');
    process.exit(0);
  }

  // worker.js의 fetch 함수 내부에 정적 파일 처리 로직 추가
  // url.pathname 확인 후, _next/static/ 요청을 먼저 처리
  const staticAssetHandler = `
            // Handle static assets (_next/static/*) before middleware
            if (url.pathname.startsWith("/_next/static/")) {
                if (env.ASSETS) {
                    const assetResponse = await env.ASSETS.fetch(request);
                    if (assetResponse.status !== 404) {
                        return assetResponse;
                    }
                }
            }`;

  // url.pathname 확인 후, 정적 파일 처리 로직 추가
  const urlCheckPattern = /const url = new URL\(request\.url\);/;
  if (urlCheckPattern.test(workerContent)) {
    // url.pathname 확인 후, 정적 파일 처리 로직 추가
    const insertPattern = /(const url = new URL\(request\.url\);\s*\/\/ Serve images in development\.)/;
    if (insertPattern.test(workerContent)) {
      workerContent = workerContent.replace(
        insertPattern,
        `const url = new URL(request.url);
            // Handle static assets (_next/static/*) before middleware
            if (url.pathname.startsWith("/_next/static/")) {
                if (env.ASSETS) {
                    const assetResponse = await env.ASSETS.fetch(request);
                    if (assetResponse.status !== 404) {
                        return assetResponse;
                    }
                }
            }
            // Serve images in development.`
      );
      fs.writeFileSync(workerPath, workerContent, 'utf8');
      console.log('✅ _worker.js에 정적 파일 처리 로직을 추가했습니다.');
    } else {
      console.log('⚠️  _worker.js 구조를 인식할 수 없습니다.');
      process.exit(0);
    }
  } else {
    console.log('⚠️  _worker.js에서 URL 처리 로직을 찾을 수 없습니다.');
    process.exit(0);
  }

} catch (error) {
  console.error('❌ 에러 발생:', error.message);
  process.exit(1);
}

