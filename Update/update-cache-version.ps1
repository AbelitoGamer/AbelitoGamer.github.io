# PowerShell script to update cache version across all HTML files
# This version can be run without Node.js

$cacheVersion = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

Write-Host "Generating cache version: $cacheVersion" -ForegroundColor Cyan

# Get the root directory (parent of Update folder)
$rootDir = Split-Path -Parent $PSScriptRoot

# Function to recursively find all HTML files
function Find-HtmlFiles {
    param (
        [string]$Path
    )
    
    Get-ChildItem -Path $Path -Recurse -Include "*.html" -File | 
        Where-Object { 
            $_.FullName -notmatch '\\node_modules\\' -and 
            $_.FullName -notmatch '\\\.git\\' -and
            $_.FullName -notmatch '\\Update\\' 
        }
}

# Function to update cache version in HTML file
function Update-HtmlFile {
    param (
        [System.IO.FileInfo]$File
    )
    
    $content = Get-Content -Path $File.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Update CSS href links
    $content = $content -replace 'href="([^"]+\.css)(?:\?v=[^"]*)?"', "href=`"`$1?v=$cacheVersion`""
    
    # Update JavaScript src links
    $content = $content -replace 'src="([^"]+\.js)(?:\?v=[^"]*)?"', "src=`"`$1?v=$cacheVersion`""
    
    # Update JSON references (single quotes)
    $content = $content -replace "'([^']+\.json)(?:\?v=[^']*)?'", "'`$1?v=$cacheVersion'"
    
    # Update JSON references (double quotes) - avoid JSON object keys
    $content = $content -replace '"([^"]+\.json)(?:\?v=[^"]*)?"\s*(?!\s*:)', "`"`$1?v=$cacheVersion`""
    
    # Update CDN links
    $content = $content -replace '(https://[^"'']+\.(?:css|js))(?:\?v=[^"'']*)?', "`$1?v=$cacheVersion"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $File.FullName -Value $content -Encoding UTF8 -NoNewline
        $relativePath = $File.FullName.Substring($rootDir.Length + 1)
        Write-Host "✓ Updated: $relativePath" -ForegroundColor Green
        return $true
    }
    
    return $false
}

# Main execution
try {
    Write-Host "Searching for HTML files..." -ForegroundColor Yellow
    $htmlFiles = Find-HtmlFiles -Path $rootDir
    Write-Host "Found $($htmlFiles.Count) HTML files`n" -ForegroundColor Yellow
    
    $updatedCount = 0
    
    foreach ($file in $htmlFiles) {
        if (Update-HtmlFile -File $file) {
            $updatedCount++
        }
    }
    
    Write-Host "`n✓ Cache version updated successfully!" -ForegroundColor Green
    Write-Host "  Version: $cacheVersion" -ForegroundColor Cyan
    Write-Host "  Files updated: $updatedCount/$($htmlFiles.Count)" -ForegroundColor Cyan
    
    # Save the cache version to a file for reference
    $versionInfo = @{
        version = $cacheVersion
        timestamp = (Get-Date).ToString("o")
        filesUpdated = $updatedCount
    } | ConvertTo-Json
    
    $versionInfo | Out-File -FilePath "$PSScriptRoot\cache-version.json" -Encoding UTF8
    
    Write-Host "`nCache version info saved to Update\cache-version.json" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error updating cache version: $_" -ForegroundColor Red
    exit 1
}
