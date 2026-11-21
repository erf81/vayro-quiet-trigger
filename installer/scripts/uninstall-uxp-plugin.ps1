<#
.SYNOPSIS
  Clean Uninstaller Helper for Quiet Trigger by VAYRO.
  - Stops running QuietTriggerHelper.exe and bundled bridge gracefully.
  - Optionally removes the Photoshop UXP plugin via official Adobe UPIA.
  - Preserves user settings/themes/favorites by default unless -RemoveUserData is explicitly passed.
  - Never touches unrelated Adobe files or user Photoshop documents.
#>
param(
    [switch]$RemovePlugin,
    [switch]$RemoveUserData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

# 1. Cleanly stop running QuietTriggerHelper.exe (if still active)
$appDir = Split-Path -Parent $PSScriptRoot
$helperExe = Join-Path $appDir "QuietTriggerHelper.exe"
if (Test-Path $helperExe) {
    & $helperExe --stop
    Start-Sleep -Milliseconds 600
}
Get-Process -Name "QuietTriggerHelper" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Optional official Adobe UXP plugin removal
if ($RemovePlugin) {
    $upiaCandidates = @(
        "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe",
        "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstaller\UnifiedPluginInstallerAgent.exe"
    )
    $upia = $upiaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($upia) {
        & $upia /remove "Quiet Trigger" | Out-Null
    }
}

# 3. Preserve user data by default; only delete if explicitly requested by the user
if ($RemoveUserData) {
    $vayroData = Join-Path $env:LOCALAPPDATA "VAYRO\Quiet Trigger"
    if (Test-Path $vayroData) {
        Remove-Item -Path $vayroData -Recurse -Force -ErrorAction SilentlyContinue
    }
}

exit 0
