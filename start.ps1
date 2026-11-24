param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8787
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Pasang Node.js 20.9 atau lebih baru untuk menjalankan Pelita Belajar.'
}

Push-Location -LiteralPath $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules\.bin\next.cmd') -or
        -not (Test-Path -LiteralPath 'node_modules\csv-parse\package.json') -or
        -not (Test-Path -LiteralPath 'node_modules\@radix-ui\react-select\package.json')) {
        Write-Host 'Memasang dependensi Next.js...'
        npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    $env:NEXT_TELEMETRY_DISABLED = '1'
    npm.cmd run dev -- --port $Port
    $status = $LASTEXITCODE
} finally {
    Pop-Location
}

exit $status
