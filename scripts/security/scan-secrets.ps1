# Copyright 2026 erf81
# SPDX-License-Identifier: Apache-2.0

<#
.SYNOPSIS
  Runs full Git-history and working-tree secret scanning with Gitleaks using .gitleaks.toml.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$glCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\gitleaks\gitleaks.exe"),
    "gitleaks"
)
$gl = $glCandidates | Where-Object { (Test-Path $_) -or (Get-Command $_ -ErrorAction SilentlyContinue) } | Select-Object -First 1
if (-not $gl) { throw "Gitleaks not found. Install Gitleaks to run local secret scans." }

Set-Location $rootDir
& $gl git --config .gitleaks.toml --redact --verbose .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $gl dir --config .gitleaks.toml --redact .
exit $LASTEXITCODE
