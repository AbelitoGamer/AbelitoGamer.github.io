# PowerShell script to update versions
Write-Host "Updating version numbers..." -ForegroundColor Green

# Store the original path
$originalPath = Get-Location

# Check if we're already in the Update directory
if ((Split-Path -Leaf (Get-Location)) -eq "Update") {
    # We're in Update directory, just run the script
    if (Test-Path "update-version.js") {
        node update-version.js
    } else {
        Write-Host "Warning: update-version.js not found. Skipping version update." -ForegroundColor Yellow
    }
} else {
    # We're in parent directory, navigate to Update
    if (Test-Path "Update\update-version.js") {
        Set-Location "Update"
        node update-version.js
        Set-Location ".."
    } else {
        Write-Host "Warning: update-version.js not found. Skipping version update." -ForegroundColor Yellow
    }
}

Write-Host "✅ Version numbers updated successfully!" -ForegroundColor Green
Write-Host "You can now commit and push using GitHub Desktop when ready." -ForegroundColor Cyan

# Return to original directory
Set-Location $originalPath