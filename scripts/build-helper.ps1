<#
.SYNOPSIS
  Compiles VAYRO Quiet Trigger's native silent Windows Background Helper (QuietTriggerHelper.exe).
  Uses Windows' built-in .NET Framework 4.x C# compiler (csc.exe) with zero external SDK required.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$srcCs   = Join-Path $rootDir "installer\src\QuietTriggerHelper.cs"
$icoPath = Join-Path $rootDir "assets\brand\quiet-trigger.ico"
$outDir  = Join-Path $rootDir "installer\build"
$outExe  = Join-Path $outDir "QuietTriggerHelper.exe"

if (-not (Test-Path $icoPath)) {
    Write-Host "Generating brand icons first..."
    node (Join-Path $rootDir "scripts\generate-icons.js")
}

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    throw "Windows .NET Framework C# compiler not found at $csc"
}

& $csc /nologo /target:winexe /optimize+ /platform:x64 `
    /win32icon:"$icoPath" `
    /out:"$outExe" `
    /reference:System.dll `
    /reference:System.Drawing.dll `
    /reference:System.Windows.Forms.dll `
    "$srcCs"

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $outExe)) {
    throw "Failed to compile QuietTriggerHelper.exe"
}

$sizeKb = [Math]::Round((Get-Item $outExe).Length / 1024, 1)
Write-Host "Compiled $outExe ($sizeKb KB)"
