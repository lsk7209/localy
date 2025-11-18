#!/usr/bin/env node

/**
 * _worker.js에 정적 파일 처리 로직 추가
 * 
 * Pages에서 ASSETS 바인딩이 자동으로 생성되지만,
 * _next/static/ 요청을 먼저 처리하도록 _worker.js를 패치합니다.
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next', 'assets', '_worker.js');

try {
  if (!fs.existsSync(workerPath)) {
    console.log('⚠️  .open-next/assets/_worker.js를 찾을 수 없습니다.');
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
  
  // 패턴 1: const url = new URL(request.url); 바로 다음에 추가
  const pattern1 = /(const url = new URL\(request\.url\);\s*)(\/\/ Serve images in development\.)/;
  if (pattern1.test(workerContent)) {
    workerContent = workerContent.replace(
      pattern1,
      `$1// Handle static assets (_next/static/*) before middleware
            if (url.pathname.startsWith("/_next/static/")) {
                if (env.ASSETS) {
                    const assetResponse = await env.ASSETS.fetch(request);
                    if (assetResponse.status !== 404) {
                        return assetResponse;
                    }
                }
            }
            $2`
    );
    fs.writeFileSync(workerPath, workerContent, 'utf8');
    console.log('✅ _worker.js에 정적 파일 처리 로직을 추가했습니다.');
    return;
  }

  // 패턴 2: const url = new URL(request.url); 다음 줄에 추가 (주석 없음)
  const pattern2 = /(const url = new URL\(request\.url\);\s*)(if \(url\.pathname\.startsWith\("\/cdn-cgi\/image\/"\))/;
  if (pattern2.test(workerContent)) {
    workerContent = workerContent.replace(
      pattern2,
      `$1// Handle static assets (_next/static/*) before middleware
            if (url.pathname.startsWith("/_next/static/")) {
                if (env.ASSETS) {
                    const assetResponse = await env.ASSETS.fetch(request);
                    if (assetResponse.status !== 404) {
                        return assetResponse;
                    }
                }
            }
            $2`
    );
    fs.writeFileSync(workerPath, workerContent, 'utf8');
    console.log('✅ _worker.js에 정적 파일 처리 로직을 추가했습니다.');
    return;
  }

  // 패턴을 찾지 못한 경우
  console.log('⚠️  _worker.js 구조를 인식할 수 없습니다.');
  console.log('   URL 처리 로직을 찾을 수 없습니다.');
  console.log('   worker.js 파일 구조를 확인하세요.');
  process.exit(0);

} catch (error) {
  console.error('❌ 에러 발생:', error.message);
  process.exit(1);
}

