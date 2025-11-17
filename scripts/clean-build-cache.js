#!/usr/bin/env node

/**
 * 빌드 캐시 정리 스크립트
 * Cloudflare Pages 배포 전에 캐시 디렉토리를 제거하여 파일 크기 제한(25 MiB) 준수
 */

const fs = require('fs');
const path = require('path');

const cacheDirs = [
  path.join('.next', 'cache'),
  path.join('.next', 'cache', 'webpack'),
  path.join('.next', 'cache', 'eslint'),
];

console.log('🧹 빌드 캐시 정리 중...\n');

let totalRemoved = 0;

cacheDirs.forEach((dir) => {
  const fullPath = path.resolve(dir);
  
  if (fs.existsSync(fullPath)) {
    try {
      const stats = fs.statSync(fullPath);
      let size = 0;
      
      if (stats.isDirectory()) {
        // 디렉토리 크기 계산
        const calculateSize = (dirPath) => {
          let dirSize = 0;
          const files = fs.readdirSync(dirPath);
          
          files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const fileStats = fs.statSync(filePath);
            
            if (fileStats.isDirectory()) {
              dirSize += calculateSize(filePath);
            } else {
              dirSize += fileStats.size;
            }
          });
          
          return dirSize;
        };
        
        size = calculateSize(fullPath);
        const sizeMB = (size / (1024 * 1024)).toFixed(2);
        
        // 디렉토리 삭제
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ ${dir} 삭제 완료 (${sizeMB} MB)`);
        totalRemoved += size;
      }
    } catch (error) {
      console.error(`❌ ${dir} 삭제 실패:`, error.message);
    }
  } else {
    console.log(`ℹ️  ${dir} 없음 (스킵)`);
  }
});

if (totalRemoved > 0) {
  const totalMB = (totalRemoved / (1024 * 1024)).toFixed(2);
  console.log(`\n✨ 총 ${totalMB} MB의 캐시가 제거되었습니다.`);
} else {
  console.log('\n✨ 제거할 캐시가 없습니다.');
}

console.log('\n✅ 빌드 캐시 정리 완료!');

