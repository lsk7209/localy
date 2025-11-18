# Cloudflare Pages 환경 변수 설정 스크립트
# 이 스크립트는 wrangler CLI를 사용하여 환경 변수를 설정합니다.

Write-Host "Cloudflare Pages 환경 변수 설정" -ForegroundColor Cyan
Write-Host ""

# 프로젝트 이름
$projectName = "localy"

# 환경 변수 값 (사용자가 직접 입력하거나 환경 변수에서 가져옴)
# 보안을 위해 스크립트에 직접 API 키를 포함하지 마세요
# 대신 환경 변수나 대화형 입력을 사용하세요

# 환경 변수에서 가져오기 (선택사항)
$openaiApiKey = $env:OPENAI_API_KEY
$publicDataApiKey = $env:PUBLIC_DATA_API_KEY

# 환경 변수가 없으면 사용자에게 입력 요청
if (-not $openaiApiKey) {
    $openaiApiKey = Read-Host "OpenAI API Key를 입력하세요"
}

if (-not $publicDataApiKey) {
    $publicDataApiKey = Read-Host "Public Data API Key를 입력하세요 (Encoding 버전)"
}

Write-Host "프로젝트: $projectName" -ForegroundColor Yellow
Write-Host ""

# OpenAI API Key 설정
Write-Host "1. OpenAI API Key 설정 중..." -ForegroundColor Green
$openaiInput = $openaiApiKey | npx wrangler pages secret put OPENAI_API_KEY --project-name=$projectName 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ OpenAI API Key 설정 완료" -ForegroundColor Green
} else {
    Write-Host "   ✗ OpenAI API Key 설정 실패" -ForegroundColor Red
    Write-Host "   오류: $openaiInput" -ForegroundColor Red
    Write-Host ""
    Write-Host "   대안: Dashboard에서 직접 설정하세요:" -ForegroundColor Yellow
    Write-Host "   1. https://dash.cloudflare.com 접속" -ForegroundColor Yellow
    Write-Host "   2. Workers & Pages > Pages > $projectName > Settings > Environment Variables" -ForegroundColor Yellow
    Write-Host "   3. OPENAI_API_KEY 추가 (값: $openaiApiKey)" -ForegroundColor Yellow
}

Write-Host ""

# Public Data API Key 설정
Write-Host "2. Public Data API Key 설정 중..." -ForegroundColor Green
$publicDataInput = $publicDataApiKey | npx wrangler pages secret put PUBLIC_DATA_API_KEY --project-name=$projectName 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Public Data API Key 설정 완료" -ForegroundColor Green
} else {
    Write-Host "   ✗ Public Data API Key 설정 실패" -ForegroundColor Red
    Write-Host "   오류: $publicDataInput" -ForegroundColor Red
    Write-Host ""
    Write-Host "   대안: Dashboard에서 직접 설정하세요:" -ForegroundColor Yellow
    Write-Host "   1. https://dash.cloudflare.com 접속" -ForegroundColor Yellow
    Write-Host "   2. Workers & Pages > Pages > $projectName > Settings > Environment Variables" -ForegroundColor Yellow
    Write-Host "   3. PUBLIC_DATA_API_KEY 추가 (값: $publicDataApiKey)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "환경 변수 설정 완료!" -ForegroundColor Cyan
Write-Host ""
Write-Host "참고: Dashboard에서 설정하는 경우:" -ForegroundColor Yellow
Write-Host "  - https://dash.cloudflare.com" -ForegroundColor Yellow
Write-Host "  - Workers & Pages > Pages > $projectName" -ForegroundColor Yellow
Write-Host "  - Settings > Environment Variables" -ForegroundColor Yellow
Write-Host "  - Production 환경에 변수 추가" -ForegroundColor Yellow

