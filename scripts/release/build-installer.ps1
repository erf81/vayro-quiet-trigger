# Copyright 2026 erf81
# SPDX-License-Identifier: Apache-2.0

<#
.SYNOPSIS
  Builds the complete single-file Windows installer for Quiet Trigger by VAYRO:
  VAYRO-Quiet-Trigger-Setup-<version>-x64.exe + VAYRO-Quiet-Trigger-Photoshop-<version>.ccx + checksums.txt
  Supports -OutDir (defaults to dist; pass "build-verify" for local verification without altering dist/).
#>
param(
    [string]$OutDir = "dist"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootDir  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$stageDir = Join-Path $rootDir "installer\stage\runtime"
$issPath  = Join-Path $rootDir "installer\quiet-trigger.iss"
$pkg      = Get-Content (Join-Path $rootDir "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$ver      = $pkg.version

$resolvedOut = if ([System.IO.Path]::IsPathRooted($OutDir)) { $OutDir } else { Join-Path $rootDir $OutDir }
New-Item -ItemType Directory -Path $resolvedOut -Force | Out-Null

# 1. Regenerate brand icons & assets
Write-Host "[1/5] Generating brand assets & UXP icons..."
node (Join-Path $rootDir "scripts\build\generate-icons.js")
if ($LASTEXITCODE -ne 0) { throw "generate-icons.js failed" }

# 2. Build official Photoshop UXP CCX from photoshop-plugin/
Write-Host "[2/5] Building official Adobe Photoshop UXP .ccx into $resolvedOut ..."
node (Join-Path $rootDir "scripts\build\build-ccx.js") --out-dir "$resolvedOut"
if ($LASTEXITCODE -ne 0) { throw "build-ccx.js failed" }

# 3. Compile native silent Windows Helper EXE
Write-Host "[3/5] Compiling QuietTriggerHelper.exe..."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $rootDir "scripts\build\build-helper.ps1")
if ($LASTEXITCODE -ne 0) { throw "build-helper.ps1 failed" }

# 4. Stage portable Node.js runtime into installer\stage\runtime\node.exe (excluded from Git)
Write-Host "[4/5] Staging portable Node.js runtime..."
$nodeExe = (Get-Command node).Source
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
Copy-Item -Path $nodeExe -Destination (Join-Path $stageDir "node.exe") -Force

# 5. Compile Inno Setup 6 single-file installer
Write-Host "[5/5] Compiling Inno Setup installer into $resolvedOut ..."
$isccCandidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
    $cmd = Get-Command iscc -ErrorAction SilentlyContinue
    if ($cmd) { $iscc = $cmd.Source }
}
if (-not $iscc) { throw "Inno Setup Compiler (ISCC.exe) not found!" }

& $iscc "/O$resolvedOut" "/DCcxDir=$resolvedOut" "/DMyAppVersion=$ver" "$issPath"
if ($LASTEXITCODE -ne 0) { throw "ISCC compilation failed with exit code $LASTEXITCODE" }

# Generate SHA-256 checksums for BOTH release artifacts
$exeFile = Join-Path $resolvedOut "VAYRO-Quiet-Trigger-Setup-$ver-x64.exe"
$ccxFile = Join-Path $resolvedOut "VAYRO-Quiet-Trigger-Photoshop-$ver.ccx"
$exeHash = (Get-FileHash $exeFile -Algorithm SHA256).Hash.ToLowerInvariant()
$ccxHash = (Get-FileHash $ccxFile -Algorithm SHA256).Hash.ToLowerInvariant()

$checksumContent = @(
    "$exeHash  VAYRO-Quiet-Trigger-Setup-$ver-x64.exe",
    "$ccxHash  VAYRO-Quiet-Trigger-Photoshop-$ver.ccx"
) -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $resolvedOut "checksums.txt"), ($checksumContent + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))

$exeMb = [Math]::Round((Get-Item $exeFile).Length / 1MB, 2)
$ccxKb = [Math]::Round((Get-Item $ccxFile).Length / 1KB, 1)
Write-Host "BUILD COMPLETE:"
Write-Host "  EXE : $exeFile ($exeMb MB) SHA256=$exeHash"
Write-Host "  CCX : $ccxFile ($ccxKb KB) SHA256=$ccxHash"
