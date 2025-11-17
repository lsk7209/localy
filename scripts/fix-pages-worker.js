#!/usr/bin/env node

/**
 * Cloudflare Pages 배포를 위한 worker.js → _worker.js 변환 스크립트
 * 
 * OpenNext는 .open-next/worker.js를 생성하지만,
 * Cloudflare Pages는 _worker.js를 Functions로 인식합니다.
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next', 'worker.js');
// Cloudflare Pages는 루트에 _worker.js를 찾습니다
const pagesWorkerPath = path.join(process.cwd(), '.open-next', '_worker.js');

try {
  // worker.js가 존재하는지 확인
  if (!fs.existsSync(workerPath)) {
    console.log('⚠️  .open-next/worker.js를 찾을 수 없습니다.');
    console.log('   OpenNext 빌드가 완료되었는지 확인하세요.');
    process.exit(0); // 에러가 아니므로 종료 코드 0
  }

  // _worker.js로 복사
  fs.copyFileSync(workerPath, pagesWorkerPath);
  console.log('✅ worker.js를 _worker.js로 복사했습니다.');
  console.log(`   ${workerPath} → ${pagesWorkerPath}`);

  // 파일 크기 확인
  const stats = fs.statSync(pagesWorkerPath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   파일 크기: ${sizeInMB} MB`);

} catch (error) {
  console.error('❌ 에러 발생:', error.message);
  process.exit(1);
}

