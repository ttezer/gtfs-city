param(
    [switch]$StagedOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

$blockedPathPatterns = @(
    'C:\Users\',
    'AppData\',
    'OneDrive\',
    'Desktop\',
    'Downloads\',
    '/Users/',
    '/home/'
)

$secretPatterns = @(
    '(?i)\b(api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|password|secret)\b\s*[:=]\s*["''][^"'']{8,}["'']',
    '(?i)authorization:\s*bearer\s+[a-z0-9._~+/-]+=*',
    '-----BEGIN (RSA |OPENSSH |DSA |EC |)PRIVATE KEY-----'
)

$blockedTrackedFiles = @(
    '.env',
    'data.js'
)

function Write-Failure($message) {
    Write-Host "[pre-commit] $message" -ForegroundColor Red
}

if ($StagedOnly) {
    $files = git diff --cached --name-only --diff-filter=ACMR
} else {
    $files = git ls-files
}

$files = @($files | Where-Object {
    $_ -and
    $_ -ne 'scripts/pre_commit_check.ps1' -and
    $_ -notmatch '(^|/)(node_modules|dist|build|coverage|\.git|\.claude)/' -and
    $_ -notmatch '\.(png|jpg|jpeg|gif|webp|ico|icns|zip|docx|exe|dll|dmg)$'
})

$failed = $false

foreach ($file in $files) {
    $name = [System.IO.Path]::GetFileName($file)
    if ($blockedTrackedFiles -contains $name) {
        Write-Failure "Yasakli/yerel dosya commit'e giriyor: $file"
        $failed = $true
    }
}

foreach ($file in $files) {
    if (!(Test-Path -LiteralPath $file)) {
        continue
    }

    $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) {
        continue
    }

    foreach ($pattern in $blockedPathPatterns) {
        if ($content -match [regex]::Escape($pattern)) {
            Write-Failure "Kisisel/mutlak yol bulundu: $file -> $pattern"
            $failed = $true
        }
    }

    foreach ($pattern in $secretPatterns) {
        if ($content -match $pattern) {
            Write-Failure "Secret/token benzeri ifade bulundu: $file -> $pattern"
            $failed = $true
        }
    }
}

if ($failed) {
    Write-Host ""
    Write-Host "Commit durduruldu. Once yukaridaki dosyalari temizleyin." -ForegroundColor Yellow
    exit 1
}

Write-Host "[pre-commit] Kontrol temiz." -ForegroundColor Green
