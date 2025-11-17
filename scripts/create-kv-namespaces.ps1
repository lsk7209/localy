# KV Namespaces 생성 스크립트 (PowerShell)
# 사용법: .\scripts\create-kv-namespaces.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KV Namespaces 생성 시작" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# KV Namespaces 목록
$namespaces = @("SETTINGS", "CACHE", "RATE_LIMIT", "FETCH_FAIL_QUEUE", "DEAD_FAIL_QUEUE", "SITEMAP")

Write-Host "프로덕션 KV Namespaces 생성 중..." -ForegroundColor Yellow
Write-Host ""

$productionIds = @{}

foreach ($namespace in $namespaces) {
    Write-Host "Creating $namespace..." -ForegroundColor Green
    try {
        $output = npx wrangler kv:namespace create $namespace 2>&1
        Write-Host $output
        
        # ID 추출 (출력에서 ID 찾기)
        if ($output -match 'id = "([^"]+)"') {
            $productionIds[$namespace] = $matches[1]
            Write-Host "✅ $namespace ID: $($matches[1])" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ $namespace 생성 실패: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Preview KV Namespaces 생성 중..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$previewIds = @{}

foreach ($namespace in $namespaces) {
    Write-Host "Creating $namespace (Preview)..." -ForegroundColor Green
    try {
        $output = npx wrangler kv:namespace create $namespace --preview 2>&1
        Write-Host $output
        
        # ID 추출
        if ($output -match 'id = "([^"]+)"') {
            $previewIds[$namespace] = $matches[1]
            Write-Host "✅ $namespace Preview ID: $($matches[1])" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ $namespace Preview 생성 실패: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "생성 완료!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 내용을 wrangler.toml에 추가하세요:" -ForegroundColor Yellow
Write-Host ""

foreach ($namespace in $namespaces) {
    $prodId = if ($productionIds.ContainsKey($namespace)) { $productionIds[$namespace] } else { "YOUR_${namespace}_ID" }
    $previewId = if ($previewIds.ContainsKey($namespace)) { $previewIds[$namespace] } else { "YOUR_PREVIEW_${namespace}_ID" }
    
    Write-Host "# $namespace" -ForegroundColor Cyan
    Write-Host "[[kv_namespaces]]" -ForegroundColor White
    Write-Host "binding = `"$namespace`"" -ForegroundColor White
    Write-Host "id = `"$prodId`"" -ForegroundColor White
    Write-Host "preview_id = `"$previewId`"" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "모든 KV Namespace가 생성되었습니다!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

