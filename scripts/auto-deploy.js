#!/usr/bin/env node

/**
 * 자동 배포 스크립트
 * 개발 완료 시 자동으로 커밋하고 깃허브에 푸시합니다.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 색상 출력을 위한 유틸리티
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf-8',
      ...options 
    });
  } catch (error) {
    log(`❌ 명령 실행 실패: ${command}`, 'red');
    process.exit(1);
  }
}

function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.trim();
  } catch {
    return '';
  }
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'main';
  }
}

function main() {
  log('\n🚀 자동 배포 시작...\n', 'blue');

  // 1. Git 상태 확인
  log('📋 변경사항 확인 중...', 'yellow');
  const status = getGitStatus();
  
  if (!status) {
    log('✅ 커밋할 변경사항이 없습니다.', 'green');
    return;
  }

  log('변경된 파일:', 'yellow');
  console.log(status.split('\n').map(line => `  ${line}`).join('\n'));

  // 2. 빌드 확인 (선택사항)
  log('\n🔨 빌드 확인 중...', 'yellow');
  try {
    exec('npm run build', { stdio: 'pipe' });
    log('✅ 빌드 성공', 'green');
  } catch (error) {
    log('⚠️  빌드 실패 - 계속 진행할까요? (y/n)', 'yellow');
    // 자동 배포이므로 빌드 실패 시에도 계속 진행
    log('⚠️  빌드 실패했지만 계속 진행합니다...', 'yellow');
  }

  // 3. 린트 확인 (선택사항)
  log('\n🔍 린트 확인 중...', 'yellow');
  try {
    exec('npm run lint', { stdio: 'pipe' });
    log('✅ 린트 통과', 'green');
  } catch (error) {
    log('⚠️  린트 경고가 있지만 계속 진행합니다...', 'yellow');
  }

  // 4. 모든 변경사항 스테이징
  log('\n📦 변경사항 스테이징 중...', 'yellow');
  exec('git add .');
  log('✅ 스테이징 완료', 'green');

  // 5. 커밋 메시지 생성
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const branch = getCurrentBranch();
  
  // 변경사항 기반으로 커밋 메시지 생성
  const commitMessage = `chore: 자동 배포 - ${timestamp}

- 자동 배포 스크립트 실행
- 브랜치: ${branch}
- 변경사항: 자동 커밋`;

  // 6. 커밋
  log('\n💾 커밋 중...', 'yellow');
  try {
    exec(`git commit -m "${commitMessage}"`);
    log('✅ 커밋 완료', 'green');
  } catch (error) {
    log('⚠️  커밋 실패 (이미 커밋된 변경사항일 수 있음)', 'yellow');
  }

  // 7. 푸시
  log('\n📤 깃허브에 푸시 중...', 'yellow');
  try {
    exec(`git push origin ${branch}`);
    log('✅ 푸시 완료', 'green');
  } catch (error) {
    log('❌ 푸시 실패', 'red');
    log('원격 저장소와 동기화가 필요할 수 있습니다.', 'yellow');
    process.exit(1);
  }

  log('\n🎉 자동 배포 완료!', 'green');
  log(`브랜치: ${branch}`, 'blue');
  log('Cloudflare Pages가 자동으로 배포를 시작합니다.\n', 'blue');
}

// 스크립트 실행
main();

