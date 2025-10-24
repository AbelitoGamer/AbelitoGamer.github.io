Write-Host "Building Funkyer Plaza Wiki Index..." -ForegroundColor Cyan
Write-Host ""

# Change to parent directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentPath = Split-Path -Parent $scriptPath
Set-Location $parentPath

# Run the build script
node Build/build-index.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Wiki index built successfully!" -ForegroundColor Green
    Write-Host "Press any key to exit..." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "✗ Error building index" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Gray
}

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
