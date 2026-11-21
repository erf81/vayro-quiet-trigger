<#
.SYNOPSIS
  Official Adobe UXP Plugin Installer & Safe ZAU Console 2.0.0 -> Quiet Trigger 2.1.0 Upgrader.
.DESCRIPTION
  - Backs up existing PluginData (com.zau.photoshop.console) before invoking Adobe UPIA.
  - Detects installed Adobe Photoshop versions and Adobe UnifiedPluginInstallerAgent.exe.
  - Upgrades ZAU Console -> Quiet Trigger cleanly with ZERO duplicate plugin installations.
  - Restores validated PluginData backup so Favorites, Recents, Custom Themes & Token survive.
  - Falls back to official .ccx file association if UPIA is absent (never copies manually into Plugins).
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$CcxPath,
    [switch]$Silent
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$logDir = Join-Path $env:LOCALAPPDATA "VAYRO\Quiet Trigger"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir "plugin-install.log"

function Write-InstallLog {
    param([string]$Msg)
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Msg
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

if (-not (Test-Path $CcxPath)) {
    Write-InstallLog "ERROR: CCX package not found at $CcxPath"
    exit 1
}

# 1. Detect installed Adobe Photoshop versions
$psDirs = @()
$adobePf = Join-Path $env:ProgramFiles "Adobe"
if (Test-Path $adobePf) {
    $psDirs = @(Get-ChildItem $adobePf -Directory -Filter "Adobe Photoshop*" -ErrorAction SilentlyContinue)
}
Write-InstallLog "Detected Adobe Photoshop installations: $(($psDirs | ForEach-Object { $_.Name }) -join ', ')"

# 2. Back up existing UXP PluginData BEFORE touching UPIA (UPIA /remove wipes PluginData!)
$phspRoot = Join-Path $env:APPDATA "Adobe\UXP\PluginsStorage\PHSP"
$backupRoot = Join-Path $logDir "upgrade-backup-v2.0.0"
$backedUpStates = @()
if (Test-Path $phspRoot) {
    foreach ($verDir in @(Get-ChildItem $phspRoot -Directory -ErrorAction SilentlyContinue)) {
        $stateFile = Join-Path $verDir.FullName "External\com.zau.photoshop.console\PluginData\zau-console-state.json"
        if (Test-Path $stateFile) {
            try {
                $raw = [System.IO.File]::ReadAllText($stateFile, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
                $null = $raw | ConvertFrom-Json # Validate JSON
                $verBakDir = Join-Path $backupRoot $verDir.Name
                New-Item -ItemType Directory -Path $verBakDir -Force | Out-Null
                $bakPath = Join-Path $verBakDir "zau-console-state.json"
                [System.IO.File]::WriteAllText($bakPath, $raw, (New-Object System.Text.UTF8Encoding($false)))
                # Verify backup readability
                $null = [System.IO.File]::ReadAllText($bakPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                $backedUpStates += @{ Target = $stateFile; Backup = $bakPath }
                Write-InstallLog "Backed up & verified PluginData for PHSP\$($verDir.Name)"
            } catch {
                Write-InstallLog "WARNING: Could not validate existing state for PHSP\$($verDir.Name): $($_.Exception.Message)"
            }
        }
    }
}

# 3. Locate official Adobe UnifiedPluginInstallerAgent.exe
$upiaCandidates = @(
    "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe",
    "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstaller\UnifiedPluginInstallerAgent.exe",
    "C:\Program Files (x86)\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe"
)
$upia = $upiaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $upia) {
    Write-InstallLog "Adobe UnifiedPluginInstallerAgent.exe not found. Launching CCX via official Creative Cloud association."
    Start-Process -FilePath $CcxPath
    if (-not $Silent) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Adobe Unified Plugin Installer Agent was not detected.`r`n`r`nQuiet Trigger has opened the official Photoshop plugin package (.ccx). Please approve the installation prompt in Adobe Creative Cloud Desktop.",
            "Quiet Trigger by VAYRO",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
    }
    exit 0
}

Write-InstallLog "Using official Adobe UPIA: $upia"

# 4. Inspect existing installed extensions to upgrade cleanly without duplicates
$listOut = (& $upia /list all 2>&1) -join "`n"
if ($listOut -match "ZAU Console") {
    Write-InstallLog "Detected legacy ZAU Console installation -> upgrading cleanly via UPIA /remove..."
    $remOut = (& $upia /remove "ZAU Console" 2>&1) -join " | "
    Write-InstallLog "UPIA remove legacy ZAU Console: $remOut"
}
if ($listOut -match "Quiet Trigger") {
    Write-InstallLog "Detected existing Quiet Trigger installation -> upgrading via UPIA /remove..."
    $remOut2 = (& $upia /remove "Quiet Trigger" 2>&1) -join " | "
    Write-InstallLog "UPIA remove existing Quiet Trigger: $remOut2"
}

# 5. Official Adobe CCX installation
Write-InstallLog "Running UPIA /install `"$CcxPath`" ..."
$instOut = (& $upia /install "$CcxPath" 2>&1) -join " | "
$instCode = $LASTEXITCODE
Write-InstallLog "UPIA install exit=$instCode output=$instOut"

# 6. Atomically restore validated PluginData backup (preserves Favorites, Recents, Custom Themes, Token)
foreach ($entry in $backedUpStates) {
    try {
        $targetDir = Split-Path -Parent $entry.Target
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        $rawBak = [System.IO.File]::ReadAllText($entry.Backup, [System.Text.Encoding]::UTF8)
        $tmpTarget = "$($entry.Target).tmp"
        [System.IO.File]::WriteAllText($tmpTarget, $rawBak, (New-Object System.Text.UTF8Encoding($false)))
        Move-Item -Path $tmpTarget -Destination $entry.Target -Force
        Write-InstallLog "Restored preserved PluginData to $($entry.Target)"
    } catch {
        Write-InstallLog "WARNING: Failed to restore backup to $($entry.Target): $($_.Exception.Message)"
    }
}

# 7. Verify installation & confirm zero duplicates
$postList = (& $upia /list all 2>&1) -join "`n"
$hasQuietTrigger = ($postList -match "Enabled\s+Quiet Trigger\s+2\.1\.0")
$hasLegacyZau    = ($postList -match "ZAU Console")
Write-InstallLog "Verification: QuietTrigger210Enabled=$hasQuietTrigger LegacyZauPresent=$hasLegacyZau"

if (-not $hasQuietTrigger) {
    Write-InstallLog "WARNING: UPIA verification did not confirm Quiet Trigger 2.1.0 Enabled."
    exit 2
}

Write-InstallLog "Official Adobe UXP plugin installation & upgrade succeeded."
exit 0
