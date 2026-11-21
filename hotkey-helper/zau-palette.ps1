<#
.SYNOPSIS
  Quiet Trigger by VAYRO (v2.1.0) — Floating Command Palette & VAYRO Theme Studio
.DESCRIPTION
  "Less searching. More creating."
  Windows native floating WPF palette for Adobe Photoshop.
  - Default shortcut: Ctrl + Alt + Space (safe, preserves Photoshop native Zoom).
  - Optional override: -Hotkey "Ctrl+Space" (displays warning about Photoshop's native Ctrl+Space).
  - Supports -Once, -OpenStudio, -OpenSettings, and -CaptureOut.
  - Communicates strictly over loopback (127.0.0.1) with the authenticated local session token.
#>
param(
    [ValidateSet("Ctrl+Alt+Space", "Ctrl+Shift+Space", "Ctrl+Space")]
    [string]$Hotkey = "Ctrl+Alt+Space",
    [switch]$Once,
    [switch]$OpenStudio,
    [switch]$OpenSettings,
    [string]$PresetOverride = "",
    [string]$CustomThemeJson = "",
    [string]$InitialQuery = "",
    [string]$CaptureOut = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Hotkey -eq "Ctrl+Space") {
    Write-Warning "OVERRIDE ENABLED: Ctrl+Space replaces Adobe Photoshop's native temporary Zoom In shortcut while Quiet Trigger is running."
}

$vayroDataDir   = Join-Path $env:LOCALAPPDATA "VAYRO\Quiet Trigger"
$legacyDataDir  = Join-Path $env:LOCALAPPDATA "ZAU-Console"
$zauAppDir      = $vayroDataDir
$sessionPath    = Join-Path $vayroDataDir "bridge-session.json"
$localThemePath = Join-Path $vayroDataDir "theme.json"
$helperCfgPath  = Join-Path $vayroDataDir "helper-settings.json"

if (-not (Test-Path $sessionPath)) {
    $legacySession = Join-Path $legacyDataDir "bridge-session.json"
    if (Test-Path $legacySession) {
        $sessionPath = $legacySession
    }
}
if (-not (Test-Path $localThemePath)) {
    $legacyTheme = Join-Path $legacyDataDir "zau-theme.json"
    if (Test-Path $legacyTheme) { $localThemePath = $legacyTheme }
}

$baseUrl = "http://127.0.0.1:47821"
$token = ""
if (Test-Path $sessionPath) {
    try {
        $session = Get-Content $sessionPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $baseUrl = "http://$($session.host):$($session.port)"
        $token = $session.token
    } catch {}
} elseif (-not $OpenStudio -and -not $OpenSettings) {
    Write-Error "Quiet Trigger local bridge session not found at $sessionPath. Ensure Quiet Trigger Helper is running."
    exit 1
}

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class ZauWin32 {
    [DllImport("user32.dll")]
    public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# ============================================================================
# ZAU AURORA THEME PRESETS & HELPERS (mirrors src/theme/themeSystem.js)
# ============================================================================
$script:PRESET_ORDER = @("aurora", "ember", "crimson", "arctic", "emerald", "monochrome")

$script:THEME_PRESETS = @{
    aurora = [ordered]@{
        id = "aurora"; name = "Aurora"; subtitle = "Blue · Violet · Pink"
        gradientMode = "three"; gradientDirection = "diagonal"
        accentPrimary = "#4EA5FF"; accentSecondary = "#8B5CF6"; accentTertiary = "#EC69B9"
        background = "#111522"; surface = "#191E2D"; selected = "#242C43"; border = "#2B3552"
        glowColor = "#4EA5FF"; glowIntensity = "medium"; surfaceStyle = "frosted"
        windowOpacity = 0.94; cornerRadius = 20; density = "comfortable"; appearance = "dark"
    }
    ember = [ordered]@{
        id = "ember"; name = "Ember"; subtitle = "Crimson · Orange · Amber"
        gradientMode = "three"; gradientDirection = "diagonal"
        accentPrimary = "#FF454F"; accentSecondary = "#FF813D"; accentTertiary = "#FFC05A"
        background = "#1D1417"; surface = "#271A1D"; selected = "#382127"; border = "#4E2E35"
        glowColor = "#FF5B45"; glowIntensity = "medium"; surfaceStyle = "frosted"
        windowOpacity = 0.94; cornerRadius = 20; density = "comfortable"; appearance = "dark"
    }
    crimson = [ordered]@{
        id = "crimson"; name = "Crimson"; subtitle = "Deep Red · Rose · Coral"
        gradientMode = "three"; gradientDirection = "diagonal"
        accentPrimary = "#E83E5B"; accentSecondary = "#FF5E7A"; accentTertiary = "#FF9B8A"
        background = "#191318"; surface = "#251A22"; selected = "#38212E"; border = "#4E2C40"
        glowColor = "#E83E5B"; glowIntensity = "medium"; surfaceStyle = "frosted"
        windowOpacity = 0.94; cornerRadius = 20; density = "comfortable"; appearance = "dark"
    }
    arctic = [ordered]@{
        id = "arctic"; name = "Arctic"; subtitle = "Cyan · Blue · Indigo"
        gradientMode = "three"; gradientDirection = "diagonal"
        accentPrimary = "#18D4E8"; accentSecondary = "#369EFF"; accentTertiary = "#7878FF"
        background = "#101921"; surface = "#17232D"; selected = "#203443"; border = "#2A465C"
        glowColor = "#18D4E8"; glowIntensity = "medium"; surfaceStyle = "frosted"
        windowOpacity = 0.94; cornerRadius = 20; density = "comfortable"; appearance = "dark"
    }
    emerald = [ordered]@{
        id = "emerald"; name = "Emerald"; subtitle = "Emerald · Mint · Teal"
        gradientMode = "three"; gradientDirection = "diagonal"
        accentPrimary = "#00B88A"; accentSecondary = "#2BD4AA"; accentTertiary = "#86D9A7"
        background = "#111B19"; surface = "#182521"; selected = "#203A31"; border = "#2B4E42"
        glowColor = "#00B88A"; glowIntensity = "medium"; surfaceStyle = "frosted"
        windowOpacity = 0.94; cornerRadius = 20; density = "comfortable"; appearance = "dark"
    }
    monochrome = [ordered]@{
        id = "monochrome"; name = "Monochrome"; subtitle = "White · Silver · Graphite"
        gradientMode = "three"; gradientDirection = "diagonal"
        accentPrimary = "#E8EAF0"; accentSecondary = "#AEB4C0"; accentTertiary = "#747C8B"
        background = "#141519"; surface = "#202126"; selected = "#30323A"; border = "#40434E"
        glowColor = "#D6DAE4"; glowIntensity = "low"; surfaceStyle = "frosted"
        windowOpacity = 0.95; cornerRadius = 20; density = "comfortable"; appearance = "dark"
    }
}

$script:QUICK_SWATCHES = @(
    "#4EA5FF", "#8B5CF6", "#EC69B9", "#FF454F", "#FF813D", "#FFC05A",
    "#E83E5B", "#18D4E8", "#369EFF", "#00B88A", "#2BD4AA", "#E8EAF0"
)

# Encoding-safe Persian -> English search alias expansion table (mirrors src/search/persianAliases.js)
function Decode-Uni { param([string]$s) return [System.Text.RegularExpressions.Regex]::Unescape($s) }
$script:PERSIAN_ALIASES = @{
    (Decode-Uni "\u0628\u0644\u0648\u0631") = "blur"
    (Decode-Uni "\u0645\u062D\u0648") = "blur"
    (Decode-Uni "\u0634\u0627\u0631\u067E") = "sharpen"
    (Decode-Uni "\u0648\u0636\u0648\u062D") = "sharpen"
    (Decode-Uni "\u0645\u0627\u0633\u06A9") = "mask"
    (Decode-Uni "\u0631\u0646\u06AF") = "color"
    (Decode-Uni "\u0628\u0631\u0634") = "crop"
    (Decode-Uni "\u06A9\u0631\u0627\u067E") = "crop"
    (Decode-Uni "\u0644\u0627\u06CC\u0647") = "layer"
    (Decode-Uni "\u0627\u0646\u062A\u062E\u0627\u0628") = "select"
    (Decode-Uni "\u0632\u0648\u0645") = "zoom"
    (Decode-Uni "\u062E\u0631\u0648\u062C\u06CC") = "export"
    (Decode-Uni "\u0630\u062E\u06CC\u0631\u0647") = "save"
    (Decode-Uni "\u0646\u0648\u06CC\u0632") = "noise"
    (Decode-Uni "\u0628\u0631\u0627\u0634") = "brush"
    (Decode-Uni "\u0642\u0644\u0645") = "brush"
    (Decode-Uni "\u067E\u0627\u06A9 \u06A9\u0646") = "eraser"
    (Decode-Uni "\u0645\u062A\u0646") = "type"
    (Decode-Uni "\u062A\u0627\u06CC\u067E") = "type"
    (Decode-Uni "\u06AF\u0631\u0627\u062F\u06CC\u0646\u062A") = "gradient"
    (Decode-Uni "\u06A9\u0646\u062A\u0631\u0627\u0633\u062A") = "contrast"
    (Decode-Uni "\u0631\u0648\u0634\u0646\u0627\u06CC\u06CC") = "brightness"
    (Decode-Uni "\u0646\u0648\u0631\u062F\u0647\u06CC") = "exposure"
    (Decode-Uni "\u0645\u0646\u062D\u0646\u06CC") = "curves"
    (Decode-Uni "\u0633\u06CC\u0627\u0647 \u0648 \u0633\u0641\u06CC\u062F") = "black white"
    (Decode-Uni "\u0627\u062F\u063A\u0627\u0645") = "merge"
    (Decode-Uni "\u06AF\u0631\u0648\u0647") = "group"
    (Decode-Uni "\u0642\u0641\u0644") = "lock"
    (Decode-Uni "\u0686\u0631\u062E\u0634") = "rotate"
    (Decode-Uni "\u0642\u0631\u06CC\u0646\u0647") = "flip"
    (Decode-Uni "\u0631\u0627\u0647\u0646\u0645\u0627") = "guides"
    (Decode-Uni "\u062E\u0637 \u06A9\u0634") = "rulers"
    (Decode-Uni "\u0634\u0628\u06A9\u0647") = "grid"
}

function Normalize-HexColor {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $t = $Value.Trim()
    if ($t -match '^#?([0-9a-fA-F]{6})$') { return "#" + $Matches[1].ToUpperInvariant() }
    if ($t -match '^#?([0-9a-fA-F]{3})$') {
        $h = $Matches[1].ToUpperInvariant()
        return "#" + $h[0] + $h[0] + $h[1] + $h[1] + $h[2] + $h[2]
    }
    return $null
}

function New-ThemeFromPreset {
    param([string]$PresetId = "aurora")
    $p = if ($script:THEME_PRESETS.ContainsKey($PresetId)) { $script:THEME_PRESETS[$PresetId] } else { $script:THEME_PRESETS["aurora"] }
    return [ordered]@{
        version = 1
        preset = $p.id
        customName = ""
        gradientMode = $p.gradientMode
        gradientDirection = $p.gradientDirection
        accentPrimary = $p.accentPrimary
        accentSecondary = $p.accentSecondary
        accentTertiary = $p.accentTertiary
        background = $p.background
        surface = $p.surface
        selected = $p.selected
        border = $p.border
        glowColor = $p.glowColor
        glowIntensity = $p.glowIntensity
        surfaceStyle = $p.surfaceStyle
        windowOpacity = [double]$p.windowOpacity
        cornerRadius = [int]$p.cornerRadius
        density = $p.density
        appearance = $p.appearance
    }
}

function Clone-Theme {
    param([object]$ThemeObj)
    $out = [ordered]@{}
    foreach ($k in $ThemeObj.Keys) { $out[$k] = $ThemeObj[$k] }
    return $out
}

function Get-PropVal {
    param([object]$Obj, [string]$Name, $Default = $null)
    if ($null -eq $Obj) { return $Default }
    if ($Obj -is [System.Collections.IDictionary]) {
        if ($Obj.Contains($Name)) { return $Obj[$Name] }
        return $Default
    }
    $prop = $Obj.PSObject.Properties[$Name]
    if ($null -ne $prop) { return $prop.Value }
    return $Default
}

function Sanitize-Theme {
    param([object]$Raw)
    $presetVal = Get-PropVal $Raw "preset" "aurora"
    $baseKey = if ($presetVal -and $script:THEME_PRESETS.ContainsKey([string]$presetVal)) { [string]$presetVal } else { "aurora" }
    $base = New-ThemeFromPreset $baseKey
    if ($null -eq $Raw) { return $base }

    $pickHex = {
        param([string]$Key, [string]$Fallback)
        $v = Get-PropVal $Raw $Key $null
        $n = Normalize-HexColor ([string]$v)
        if ($n) { return $n }
        return $Fallback
    }
    $pickEnum = {
        param([string]$Key, [string[]]$Allowed, [string]$Fallback)
        $v = [string](Get-PropVal $Raw $Key "")
        if ($Allowed -contains $v) { return $v }
        return $Fallback
    }

    $opRaw = Get-PropVal $Raw "windowOpacity" $base.windowOpacity
    $op = $base.windowOpacity
    try { $op = [double]$opRaw } catch {}
    $op = [Math]::Round([Math]::Max(0.72, [Math]::Min(1.0, $op)), 2)

    $radRaw = Get-PropVal $Raw "cornerRadius" $base.cornerRadius
    $rad = $base.cornerRadius
    try {
        $rInt = [int]$radRaw
        if (@(12, 16, 20, 24) -contains $rInt) { $rad = $rInt }
    } catch {}

    $finalPreset = if ([string]$presetVal -eq "custom" -or $script:THEME_PRESETS.ContainsKey([string]$presetVal)) { [string]$presetVal } else { $base.preset }
    $cName = [string](Get-PropVal $Raw "customName" "")
    if ($cName.Length -gt 40) { $cName = $cName.Substring(0, 40) }

    return [ordered]@{
        version = 1
        preset = $finalPreset
        customName = $cName.Trim()
        gradientMode = (& $pickEnum "gradientMode" @("solid", "two", "three") $base.gradientMode)
        gradientDirection = (& $pickEnum "gradientDirection" @("horizontal", "diagonal", "vertical") $base.gradientDirection)
        accentPrimary = (& $pickHex "accentPrimary" $base.accentPrimary)
        accentSecondary = (& $pickHex "accentSecondary" $base.accentSecondary)
        accentTertiary = (& $pickHex "accentTertiary" $base.accentTertiary)
        background = (& $pickHex "background" $base.background)
        surface = (& $pickHex "surface" $base.surface)
        selected = (& $pickHex "selected" $base.selected)
        border = (& $pickHex "border" $base.border)
        glowColor = (& $pickHex "glowColor" (& $pickHex "accentPrimary" $base.glowColor))
        glowIntensity = (& $pickEnum "glowIntensity" @("off", "low", "medium", "high") $base.glowIntensity)
        surfaceStyle = (& $pickEnum "surfaceStyle" @("frosted", "translucent", "solid", "flat") $base.surfaceStyle)
        windowOpacity = $op
        cornerRadius = $rad
        density = (& $pickEnum "density" @("compact", "comfortable", "spacious") $base.density)
        appearance = (& $pickEnum "appearance" @("dark", "light", "auto") $base.appearance)
    }
}

function ConvertTo-WpfColor {
    param([string]$Hex, [double]$Alpha = 1.0)
    $norm = Normalize-HexColor $Hex
    if (-not $norm) { $norm = "#4EA5FF" }
    $r = [Convert]::ToByte($norm.Substring(1, 2), 16)
    $g = [Convert]::ToByte($norm.Substring(3, 2), 16)
    $b = [Convert]::ToByte($norm.Substring(5, 2), 16)
    $a = [byte][Math]::Round([Math]::Max(0.0, [Math]::Min(1.0, $Alpha)) * 255)
    return [System.Windows.Media.Color]::FromArgb($a, $r, $g, $b)
}

function New-SolidBrush {
    param([string]$Hex, [double]$Alpha = 1.0)
    $b = New-Object System.Windows.Media.SolidColorBrush (ConvertTo-WpfColor $Hex $Alpha)
    $b.Freeze()
    return $b
}

function New-ThemeGradientBrush {
    param([hashtable]$Theme, [double]$Alpha = 1.0)
    if ($Theme.gradientMode -eq "solid") {
        return New-SolidBrush $Theme.accentPrimary $Alpha
    }
    $brush = New-Object System.Windows.Media.LinearGradientBrush
    switch ($Theme.gradientDirection) {
        "horizontal" {
            $brush.StartPoint = New-Object System.Windows.Point(0, 0.5)
            $brush.EndPoint   = New-Object System.Windows.Point(1, 0.5)
        }
        "vertical" {
            $brush.StartPoint = New-Object System.Windows.Point(0.5, 0)
            $brush.EndPoint   = New-Object System.Windows.Point(0.5, 1)
        }
        default {
            $brush.StartPoint = New-Object System.Windows.Point(0, 0)
            $brush.EndPoint   = New-Object System.Windows.Point(1, 1)
        }
    }
    $c1 = ConvertTo-WpfColor $Theme.accentPrimary $Alpha
    $c2 = ConvertTo-WpfColor $Theme.accentSecondary $Alpha
    $c3 = ConvertTo-WpfColor $Theme.accentTertiary $Alpha

    $brush.GradientStops.Add((New-Object System.Windows.Media.GradientStop($c1, 0.0)))
    if ($Theme.gradientMode -eq "two") {
        $brush.GradientStops.Add((New-Object System.Windows.Media.GradientStop($c2, 1.0)))
    } else {
        $brush.GradientStops.Add((New-Object System.Windows.Media.GradientStop($c2, 0.52)))
        $brush.GradientStops.Add((New-Object System.Windows.Media.GradientStop($c3, 1.0)))
    }
    $brush.Freeze()
    return $brush
}

function New-GlowEffect {
    param([string]$Hex, [double]$BlurRadius, [double]$Opacity)
    if ($BlurRadius -le 0 -or $Opacity -le 0) { return $null }
    $fx = New-Object System.Windows.Media.Effects.DropShadowEffect
    $fx.Color = ConvertTo-WpfColor $Hex 1.0
    $fx.BlurRadius = $BlurRadius
    $fx.ShadowDepth = 0
    $fx.Opacity = $Opacity
    return $fx
}

# ============================================================================
# MONOCHROME VECTOR ICON PATHS FOR COMMAND TILES (24x24 viewBox)
# ============================================================================
function Get-CommandIconGeometry {
    param([object]$Cmd)
    $id = ([string](Get-PropVal $Cmd "id" "")).ToLowerInvariant()
    $cat = ([string](Get-PropVal $Cmd "category" "")).ToLowerInvariant()

    if ($id -like "*blur*") {
        return "M12,3 A9,9 0 1,0 12.01,3 M12,7 A5,5 0 1,0 12.01,7 M12,10.5 A1.5,1.5 0 1,0 12.01,10.5"
    }
    if ($id -like "*curve*") {
        return "M3,20 L21,20 M4,4 L4,21 M4,19 C9,19 9,6 20,5"
    }
    if ($id -like "*crop*") {
        return "M6,2 L6,18 L22,18 M2,6 L18,6 L18,22"
    }
    if ($id -like "*brush*" -or $id -like "*pencil*") {
        return "M18.5,3.5 L20.5,5.5 L10,16 L7,17 L8,14 Z M7,17 C5,17 4,18.5 3,20.5 C6,21 8.5,19.8 9,17.5"
    }
    if ($id -like "*eraser*") {
        return "M15,4 L20,9 L11,18 L6,18 L4,16 Z M10,18 L20,18"
    }
    if ($id -like "*type*" -or $id -like "*text*") {
        return "M4,6 L4,4 L20,4 L20,6 M12,4 L12,20 M9,20 L15,20"
    }
    if ($id -like "*zoom*") {
        return "M11,4 A7,7 0 1,0 11.01,4 M16.5,16.5 L21,21 M8,11 L14,11 M11,8 L11,14"
    }
    if ($id -like "*sharpen*" -or $id -like "*noise*") {
        return "M12,3 L21,19 L3,19 Z M12,9 L12,14"
    }
    if ($cat -eq "filters") {
        return "M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z"
    }
    if ($cat -eq "adjustments") {
        return "M4,7 L20,7 M4,12 L20,12 M4,17 L20,17 M9,5 L9,9 M15,10 L15,14 M11,15 L11,19"
    }
    if ($cat -eq "layers") {
        return "M12,3 L21,8 L12,13 L3,8 Z M3,12.5 L12,17.5 L21,12.5 M3,16.5 L12,21.5 L21,16.5"
    }
    if ($cat -eq "selections") {
        return "M4,4 L8,4 M12,4 L16,4 M20,4 L20,8 M20,12 L20,16 M20,20 L16,20 M12,20 L8,20 M4,20 L4,16 M4,12 L4,8"
    }
    if ($cat -eq "document") {
        return "M6,3 L14,3 L19,8 L19,21 L6,21 Z M14,3 L14,8 L19,8"
    }
    if ($cat -eq "view") {
        return "M2,12 C5,7 8.5,5 12,5 C15.5,5 19,7 22,12 C19,17 15.5,19 12,19 C8.5,19 5,17 2,12 Z M12,9 A3,3 0 1,0 12.01,9"
    }
    if ($cat -eq "export") {
        return "M12,3 L12,15 M7,8 L12,3 L17,8 M4,15 L4,20 L20,20 L20,15"
    }
    # Tools default
    return "M5,3 L19,12 L12,13.5 L9,20 Z"
}

function Get-CategoryBreadcrumb {
    param([object]$Cmd)
    $cat = [string](Get-PropVal $Cmd "category" "Commands")
    if ($cat.Length -gt 0) { $cat = $cat.Substring(0, 1).ToUpperInvariant() + $cat.Substring(1) }
    $id = ([string](Get-PropVal $Cmd "id" "")).ToLowerInvariant()
    $sub = ""
    if ($id -like "*blur*") { $sub = "Blur" }
    elseif ($id -like "*sharpen*") { $sub = "Sharpen" }
    elseif ($id -like "*noise*") { $sub = "Noise" }
    elseif ($id -like "*curve*" -or $id -like "*level*" -or $id -like "*exposure*" -or $id -like "*brightness*") { $sub = "Tone" }
    elseif ($id -like "*hue*" -or $id -like "*color*" -or $id -like "*vibrance*" -or $id -like "*black*") { $sub = "Color" }
    elseif ($id -like "*mask*") { $sub = "Mask" }
    elseif ($id -like "*group*" -or $id -like "*merge*" -or $id -like "*flatten*") { $sub = "Structure" }
    elseif ($id -like "*brush*" -or $id -like "*eraser*" -or $id -like "*clone*" -or $id -like "*heal*") { $sub = "Retouch" }
    elseif ($id -like "*crop*" -or $id -like "*transform*" -or $id -like "*rotate*" -or $id -like "*flip*") { $sub = "Transform" }
    elseif ($id -like "*select*" -or $id -like "*feather*" -or $id -like "*invert*") { $sub = "Selection" }
    if ($sub) { return "$cat / $sub" }
    return $cat
}

# ============================================================================
# BRIDGE COMMUNICATION & SEARCH SCORING
# ============================================================================
function Test-PhotoshopActive {
    $hwnd = [ZauWin32]::GetForegroundWindow()
    if ($hwnd -eq [IntPtr]::Zero) { return $false }
    [uint32]$pidOut = 0
    [void][ZauWin32]::GetWindowThreadProcessId($hwnd, [ref]$pidOut)
    try {
        $proc = Get-Process -Id $pidOut -ErrorAction Stop
        return ($proc.ProcessName -ieq "Photoshop")
    } catch {
        return $false
    }
}

function Invoke-ZauBridge {
    param([string]$Method, [string]$Path, [object]$Body = $null)
    $headers = @{ "X-ZAU-Token" = $token }
    $uri = "$baseUrl$Path"
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 10 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 8
    }
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 5
}

function Load-LocalThemeFallback {
    try {
        if (Test-Path $localThemePath) {
            $raw = Get-Content $localThemePath -Raw -Encoding UTF8
            $parsed = $raw | ConvertFrom-Json
            $t = Get-PropVal $parsed "theme" $parsed
            $c = @(Get-PropVal $parsed "savedCustomThemes" @())
            return @{ theme = (Sanitize-Theme $t); savedCustomThemes = $c }
        }
    } catch {}
    return @{ theme = (New-ThemeFromPreset "aurora"); savedCustomThemes = @() }
}

function Save-LocalThemeFallback {
    param([hashtable]$Theme, [array]$SavedCustom)
    try {
        if (-not (Test-Path $zauAppDir)) { New-Item -ItemType Directory -Path $zauAppDir -Force | Out-Null }
        $payload = [ordered]@{ theme = $Theme; savedCustomThemes = @($SavedCustom) }
        $json = $payload | ConvertTo-Json -Depth 10
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($localThemePath, $json, $utf8NoBom)
    } catch {}
}

function Normalize-SearchText {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
    $s = $Text.ToLowerInvariant()
    $s = $s.Replace([char]0x064A, [char]0x06CC) # Arabic Yeh -> Persian Yeh
    $s = $s.Replace([char]0x0643, [char]0x06A9) # Arabic Kaf -> Persian Kaf
    $s = $s.Replace([char]0x200C, ' ').Replace([char]0x200F, ' ')
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, '\s+', ' ').Trim()
    return $s
}

function Get-MatchScore {
    param([object]$Cmd, [string]$RawQuery, [hashtable]$FavSet, [hashtable]$RecSet)
    $name = ([string](Get-PropVal $Cmd "name" "")).ToLowerInvariant()
    $cat = ([string](Get-PropVal $Cmd "category" "")).ToLowerInvariant()
    $desc = ([string](Get-PropVal $Cmd "description" "")).ToLowerInvariant()
    $kw = (@(Get-PropVal $Cmd "keywords" @()) -join " ").ToLowerInvariant()
    $al = (@(Get-PropVal $Cmd "aliases" @()) -join " ").ToLowerInvariant()
    $q = Normalize-SearchText $RawQuery

    if ([string]::IsNullOrEmpty($q)) {
        $s = 10
        if ($FavSet.ContainsKey($Cmd.id)) { $s += 500 }
        if ($RecSet.ContainsKey($Cmd.id)) { $s += 200 }
        return $s
    }

    $queries = New-Object System.Collections.Generic.List[string]
    $queries.Add($q)
    foreach ($fa in $script:PERSIAN_ALIASES.Keys) {
        if ($q.Contains($fa)) {
            $queries.Add($script:PERSIAN_ALIASES[$fa])
        }
    }

    $best = 0
    foreach ($term in $queries) {
        $sc = 0
        if ($name -eq $term) { $sc = 140 }
        elseif ($name.StartsWith($term)) { $sc = 115 }
        elseif ($name.Contains($term)) { $sc = 92 }
        elseif ($al.Contains($term)) { $sc = 86 }
        elseif ($kw.Contains($term)) { $sc = 78 }
        elseif ($desc.Contains($term)) { $sc = 64 }
        elseif ($cat.Contains($term)) { $sc = 56 }
        else {
            $qi = 0
            for ($ti = 0; $ti -lt $name.Length -and $qi -lt $term.Length; $ti++) {
                if ($name[$ti] -eq $term[$qi]) { $qi++ }
            }
            if ($qi -eq $term.Length -and $term.Length -ge 2) { $sc = 35 }
        }
        if ($sc -gt $best) { $best = $sc }
    }

    if ($best -gt 0) {
        if ($FavSet.ContainsKey($Cmd.id)) { $best += 15 }
        if ($RecSet.ContainsKey($Cmd.id)) { $best += 8 }
    }
    return $best
}

# ============================================================================
# VAYRO QUIET TRIGGER FLOATING PALETTE + THEME STUDIO + SETTINGS
# ============================================================================
function Show-ZauFloatingPalette {
    $psHwnd = [ZauWin32]::GetForegroundWindow()
    $catalog = $null
    $bridgeReachable = $false
    try {
        if ($token) {
            $catalog = Invoke-ZauBridge -Method GET -Path "/catalog"
            $bridgeReachable = $true
        }
    } catch {
        $bridgeReachable = $false
    }

    if (-not $OpenStudio -and -not $OpenSettings) {
        if (-not $bridgeReachable) {
            [System.Windows.MessageBox]::Show("Quiet Trigger background bridge is not responding on $baseUrl. Please start Quiet Trigger from the Start Menu or System Tray.", "Quiet Trigger by VAYRO")
            return
        }
        if (-not $catalog.photoshopConnected -or @($catalog.commands).Count -eq 0) {
            [System.Windows.MessageBox]::Show("Adobe Photoshop is not connected to Quiet Trigger yet. Open Adobe Photoshop (and ensure the Quiet Trigger plugin is enabled under Plugins).", "Quiet Trigger by VAYRO")
            return
        }
    }

    if ($null -eq $catalog) {
        $catalog = [PSCustomObject]@{
            photoshopConnected = $false
            commands = @()
            favorites = @()
            recentCommands = @()
            context = $null
            theme = $null
            savedCustomThemes = @()
        }
    }

    # Resolve current theme (bridge -> local fallback -> Aurora default)
    $themeResp = $null
    try { $themeResp = Invoke-ZauBridge -Method GET -Path "/theme" } catch {}
    $fallbackData = Load-LocalThemeFallback

    $script:activeTheme = if ($themeResp -and $themeResp.theme) {
        Sanitize-Theme $themeResp.theme
    } elseif ($catalog.theme) {
        Sanitize-Theme $catalog.theme
    } else {
        $fallbackData.theme
    }

    $rawSaved = if ($themeResp -and $null -ne $themeResp.savedCustomThemes) {
        @($themeResp.savedCustomThemes)
    } elseif ($null -ne $catalog.savedCustomThemes) {
        @($catalog.savedCustomThemes)
    } else {
        @($fallbackData.savedCustomThemes)
    }
    $script:savedCustomThemes = New-Object System.Collections.ArrayList
    foreach ($scItem in $rawSaved) {
        if ($null -ne $scItem) { [void]$script:savedCustomThemes.Add($scItem) }
    }

    # Optional visual QA overrides (non-persistent unless applied)
    if (-not [string]::IsNullOrWhiteSpace($PresetOverride)) {
        $script:activeTheme = New-ThemeFromPreset $PresetOverride.ToLowerInvariant()
    }
    if (-not [string]::IsNullOrWhiteSpace($CustomThemeJson)) {
        try {
            $parsedOverride = $CustomThemeJson | ConvertFrom-Json
            $script:activeTheme = Sanitize-Theme $parsedOverride
        } catch {}
    }

    $script:committedTheme = Clone-Theme $script:activeTheme
    $script:draftTheme = Clone-Theme $script:activeTheme
    $script:studioOpen = $false
    $script:pinned = $true
    $script:navFilter = "all" # all | favorites | recent
    $script:categoryFilter = "all"
    $script:selectedIndex = 0
    $script:filtered = @()
    $script:rowBorders = New-Object System.Collections.ArrayList
    $script:suppressStudioEvents = $false

    $favSet = @{}
    foreach ($fid in @($catalog.favorites)) { if ($fid) { $favSet[[string]$fid] = $true } }
    $recSet = @{}
    foreach ($rid in @($catalog.recentCommands)) { if ($rid) { $recSet[[string]$rid] = $true } }

    $docSummary = "No open document"
    $liveCtx = $catalog.context
    try {
        $ctxResp = Invoke-ZauBridge -Method GET -Path "/context"
        if ($ctxResp -and $ctxResp.context) { $liveCtx = $ctxResp.context }
    } catch {}
    if ($liveCtx -and $liveCtx.hasDocument) {
        $docSummary = "$($liveCtx.documentName)  ·  $($liveCtx.width)x$($liveCtx.height)px  ·  $($liveCtx.layerName)"
    }

    # Responsive clamp to screen working area
    $workArea = [System.Windows.SystemParameters]::WorkArea
    $cardWidth  = [Math]::Min(780, [Math]::Max(620, [int]($workArea.Width - 80)))
    $cardHeight = [Math]::Min(680, [Math]::Max(540, [int]($workArea.Height - 80)))
    $winWidth   = $cardWidth + 48
    $winHeight  = $cardHeight + 48

    [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Quiet Trigger — VAYRO" Width="$winWidth" Height="$winHeight"
        WindowStyle="None" ResizeMode="NoResize" Topmost="True"
        WindowStartupLocation="CenterScreen" Background="Transparent"
        AllowsTransparency="True" ShowInTaskbar="False"
        SnapsToDevicePixels="True" UseLayoutRounding="True">
    <Window.Resources>
        <Style x:Key="DarkScrollBar" TargetType="ScrollBar">
            <Setter Property="Width" Value="5"/>
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ScrollBar">
                        <Grid Background="Transparent">
                            <Track x:Name="PART_Track" IsDirectionReversed="True">
                                <Track.Thumb>
                                    <Thumb>
                                        <Thumb.Template>
                                            <ControlTemplate TargetType="Thumb">
                                                <Border Background="#24FFFFFF" CornerRadius="2.5" Margin="1,3"/>
                                            </ControlTemplate>
                                        </Thumb.Template>
                                    </Thumb>
                                </Track.Thumb>
                            </Track>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <Style x:Key="AuroraCombo" TargetType="ComboBox">
            <Setter Property="Foreground" Value="#D6E0F2"/>
            <Setter Property="Background" Value="#1E2538"/>
            <Setter Property="BorderBrush" Value="#323D5B"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="FontSize" Value="12.5"/>
            <Setter Property="FontFamily" Value="Segoe UI"/>
            <Setter Property="Height" Value="32"/>
            <Setter Property="Padding" Value="12,0,8,0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBox">
                        <Grid>
                            <ToggleButton x:Name="ToggleButton" Focusable="False"
                                          IsChecked="{Binding IsDropDownOpen, Mode=TwoWay, RelativeSource={RelativeSource TemplatedParent}}"
                                          ClickMode="Press">
                                <ToggleButton.Template>
                                    <ControlTemplate TargetType="ToggleButton">
                                        <Border x:Name="Bd" Background="{TemplateBinding Background}"
                                                BorderBrush="{TemplateBinding BorderBrush}"
                                                BorderThickness="{TemplateBinding BorderThickness}"
                                                CornerRadius="10">
                                            <Grid>
                                                <Grid.ColumnDefinitions>
                                                    <ColumnDefinition Width="*"/>
                                                    <ColumnDefinition Width="26"/>
                                                </Grid.ColumnDefinitions>
                                                <Path Grid.Column="1" Data="M0,0 L4,4 L8,0" Stroke="#9AA8C4" StrokeThickness="1.5"
                                                      HorizontalAlignment="Center" VerticalAlignment="Center" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
                                            </Grid>
                                        </Border>
                                    </ControlTemplate>
                                </ToggleButton.Template>
                                <ToggleButton.Background>
                                    <Binding Path="Background" RelativeSource="{RelativeSource TemplatedParent}"/>
                                </ToggleButton.Background>
                                <ToggleButton.BorderBrush>
                                    <Binding Path="BorderBrush" RelativeSource="{RelativeSource TemplatedParent}"/>
                                </ToggleButton.BorderBrush>
                            </ToggleButton>
                            <ContentPresenter IsHitTestVisible="False" Content="{TemplateBinding SelectionBoxItem}"
                                              ContentTemplate="{TemplateBinding SelectionBoxItemTemplate}"
                                              Margin="12,0,28,0" VerticalAlignment="Center" HorizontalAlignment="Left"/>
                            <Popup x:Name="Popup" Placement="Bottom" IsOpen="{TemplateBinding IsDropDownOpen}"
                                   AllowsTransparency="True" Focusable="False" PopupAnimation="Fade">
                                <Border Margin="0,4,0,0" MinWidth="{TemplateBinding ActualWidth}" MaxHeight="260"
                                        Background="#171D2D" BorderBrush="#3A476A" BorderThickness="1" CornerRadius="10" Padding="4">
                                    <ScrollViewer VerticalScrollBarVisibility="Auto">
                                        <StackPanel IsItemsHost="True"/>
                                    </ScrollViewer>
                                </Border>
                            </Popup>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
            <Setter Property="ItemContainerStyle">
                <Setter.Value>
                    <Style TargetType="ComboBoxItem">
                        <Setter Property="Foreground" Value="#DCE4F4"/>
                        <Setter Property="Padding" Value="10,7"/>
                        <Setter Property="Cursor" Value="Hand"/>
                        <Setter Property="Template">
                            <Setter.Value>
                                <ControlTemplate TargetType="ComboBoxItem">
                                    <Border x:Name="ItemBd" Background="Transparent" CornerRadius="7" Padding="{TemplateBinding Padding}">
                                        <ContentPresenter/>
                                    </Border>
                                    <ControlTemplate.Triggers>
                                        <Trigger Property="IsHighlighted" Value="True">
                                            <Setter TargetName="ItemBd" Property="Background" Value="#2A3552"/>
                                        </Trigger>
                                        <Trigger Property="IsSelected" Value="True">
                                            <Setter TargetName="ItemBd" Property="Background" Value="#334269"/>
                                        </Trigger>
                                    </ControlTemplate.Triggers>
                                </ControlTemplate>
                            </Setter.Value>
                        </Setter>
                    </Style>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <!-- Outer transparent margin gives ambient DropShadowEffect room to glow smoothly -->
    <Grid Margin="24">
        <!-- Luminous outer gradient frame -->
        <Border Name="OuterGlowBorder" CornerRadius="20" Padding="1.8">
            <Border Name="MainSurface" CornerRadius="18.5" ClipToBounds="True">
                <Grid>
                    <!-- Subtle ambient Aurora interior radial washes -->
                    <Border Name="AmbientTopWash" IsHitTestVisible="False" VerticalAlignment="Top" Height="220" Opacity="0.22"/>
                    <Border Name="AmbientBottomWash" IsHitTestVisible="False" VerticalAlignment="Bottom" Height="160" Opacity="0.14"/>

                    <Grid Margin="22,18,22,16">
                        <Grid.RowDefinitions>
                            <RowDefinition Height="Auto"/>
                            <RowDefinition Height="*"/>
                            <RowDefinition Height="Auto"/>
                        </Grid.RowDefinitions>

                        <!-- COMPACT HEADER -->
                        <DockPanel Name="HeaderBar" Grid.Row="0" Margin="0,0,0,14" Background="Transparent" Cursor="Arrow">
                            <StackPanel Orientation="Horizontal" VerticalAlignment="Center" DockPanel.Dock="Left">
                                <Border Name="BrandTileRing" Width="34" Height="34" CornerRadius="10" Padding="1.4" Margin="0,0,12,0">
                                    <Border Name="BrandTileInner" CornerRadius="8.8">
                                        <Viewbox Width="18" Height="18">
                                            <Canvas Width="24" Height="24">
                                                <Path Name="BrandGlyph" Data="M5,7 L12,17.5 L19,7" Stroke="#F0F5FF" StrokeThickness="2.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round"/>
                                                <Ellipse Name="BrandAccentDot" Width="3.8" Height="3.8" Canvas.Left="10.1" Canvas.Top="4.8" Fill="#4EA5FF"/>
                                            </Canvas>
                                        </Viewbox>
                                    </Border>
                                </Border>
                                <StackPanel VerticalAlignment="Center">
                                    <TextBlock Name="HeaderTitle" Text="QUIET TRIGGER" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="13.5" Foreground="#F0F5FF"/>
                                    <TextBlock Name="HeaderSub" Text="BY VAYRO  ·  Less searching. More creating." FontFamily="Segoe UI" FontSize="10.5" Foreground="#7D8BA8" Margin="0,1,0,0"/>
                                </StackPanel>
                            </StackPanel>

                            <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
                                <Border Name="BtnPin" Width="32" Height="32" CornerRadius="9" Margin="0,0,8,0" Cursor="Hand" ToolTip="Pin Always on Top">
                                    <Viewbox Width="15" Height="15">
                                        <Canvas Width="24" Height="24">
                                            <Path Name="IconPin" Data="M15,4 L20,9 L17.5,11.5 L16,10 L11.5,14.5 L12.5,17 L11,18.5 L7.5,15 L3.5,20.5 L9,16.5 L5.5,13 L7,11.5 L9.5,12.5 L14,8 L12.5,6.5 Z"
                                                  Stroke="#DCE4F4" StrokeThickness="1.7" StrokeLineJoin="Round" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
                                        </Canvas>
                                    </Viewbox>
                                </Border>
                                <Border Name="BtnStudio" Width="32" Height="32" CornerRadius="9" Margin="0,0,8,0" Cursor="Hand" ToolTip="VAYRO Theme Studio">
                                    <Viewbox Width="15" Height="15">
                                        <Canvas Width="24" Height="24">
                                            <Path Name="IconGear" Data="M12,8.5 A3.5,3.5 0 1,0 12.01,8.5"
                                                  Stroke="#DCE4F4" StrokeThickness="1.7" StrokeLineJoin="Round" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
                                        </Canvas>
                                    </Viewbox>
                                </Border>
                                <Border Name="BtnClose" Width="32" Height="32" CornerRadius="9" Cursor="Hand" ToolTip="Close (Esc)">
                                    <Viewbox Width="14" Height="14">
                                        <Canvas Width="24" Height="24">
                                            <Path Name="IconClose" Data="M6,6 L18,18 M18,6 L6,18" Stroke="#B4C0D8" StrokeThickness="2" StrokeStartLineCap="Round"/>
                                        </Canvas>
                                    </Viewbox>
                                </Border>
                            </StackPanel>
                        </DockPanel>

                        <!-- MAIN VIEW: COMMAND PALETTE -->
                        <Grid Name="PaletteView" Grid.Row="1">
                            <Grid.RowDefinitions>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="*"/>
                            </Grid.RowDefinitions>

                            <!-- LUMINOUS SEARCH BAR -->
                            <Border Name="SearchRing" Grid.Row="0" CornerRadius="14" Padding="1.6" Margin="0,0,0,14">
                                <Border Name="SearchInner" CornerRadius="12.6" Height="50" Padding="14,0">
                                    <Grid>
                                        <Grid.ColumnDefinitions>
                                            <ColumnDefinition Width="Auto"/>
                                            <ColumnDefinition Width="*"/>
                                            <ColumnDefinition Width="Auto"/>
                                        </Grid.ColumnDefinitions>
                                        <Viewbox Grid.Column="0" Width="18" Height="18" Margin="0,0,12,0" VerticalAlignment="Center">
                                            <Canvas Width="24" Height="24">
                                                <Path Name="SearchIconPath" Data="M11,4 A7,7 0 1,0 11.01,4 M16.5,16.5 L21,21"
                                                      Stroke="#8FA2C4" StrokeThickness="2" StrokeStartLineCap="Round"/>
                                            </Canvas>
                                        </Viewbox>
                                        <Grid Grid.Column="1" VerticalAlignment="Center">
                                            <TextBlock Name="SearchPlaceholder" Text="Search commands, tools, effects..."
                                                       FontFamily="Segoe UI" FontSize="15" Foreground="#6F7E9B"
                                                       VerticalAlignment="Center" IsHitTestVisible="False"/>
                                            <TextBox Name="SearchBox" Background="Transparent" BorderThickness="0"
                                                     Foreground="#F4F7FF" CaretBrush="#4EA5FF"
                                                     FontFamily="Segoe UI" FontSize="15" VerticalContentAlignment="Center"
                                                     Padding="0"/>
                                        </Grid>
                                        <Border Name="BtnClearSearch" Grid.Column="2" Width="24" Height="24" CornerRadius="12"
                                                Background="#26FFFFFF" Cursor="Hand" Visibility="Collapsed" VerticalAlignment="Center">
                                            <TextBlock Text="×" Foreground="#DCE4F4" FontSize="14" HorizontalAlignment="Center" VerticalAlignment="Center" Margin="0,-2,0,0"/>
                                        </Border>
                                    </Grid>
                                </Border>
                            </Border>

                            <!-- COMPACT NAV ROW: FAVORITES | RECENT  +  ALL CATEGORIES DROPDOWN -->
                            <DockPanel Grid.Row="1" Margin="0,0,0,12">
                                <StackPanel Orientation="Horizontal" DockPanel.Dock="Left" VerticalAlignment="Center">
                                    <Border Name="PillFavorites" CornerRadius="10" Padding="12,6" Margin="0,0,8,0" BorderThickness="1" Cursor="Hand">
                                        <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                            <TextBlock Name="PillFavIcon" Text="★" FontSize="11.5" Foreground="#F5B942" Margin="0,0,6,0" VerticalAlignment="Center"/>
                                            <TextBlock Name="PillFavText" Text="Favorites" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="12.5" Foreground="#D0DAEE" VerticalAlignment="Center"/>
                                        </StackPanel>
                                    </Border>
                                    <Border Name="PillRecent" CornerRadius="10" Padding="12,6" Margin="0,0,8,0" BorderThickness="1" Cursor="Hand">
                                        <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                            <TextBlock Name="PillRecIcon" Text="◷" FontSize="12" Foreground="#8FA2C4" Margin="0,0,6,0" VerticalAlignment="Center"/>
                                            <TextBlock Name="PillRecText" Text="Recent" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="12.5" Foreground="#D0DAEE" VerticalAlignment="Center"/>
                                        </StackPanel>
                                    </Border>
                                    <TextBlock Name="ResultCountText" Text="" FontFamily="Segoe UI" FontSize="11.5" Foreground="#6E7C99" VerticalAlignment="Center" Margin="6,0,0,0"/>
                                </StackPanel>

                                <ComboBox Name="CategoryCombo" Style="{StaticResource AuroraCombo}" Width="168" HorizontalAlignment="Right" VerticalAlignment="Center"/>
                            </DockPanel>

                            <!-- SPACIOUS COMMAND RESULTS -->
                            <ScrollViewer Name="ResultsScroll" Grid.Row="2" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Disabled">
                                <ScrollViewer.Resources>
                                    <Style TargetType="ScrollBar" BasedOn="{StaticResource DarkScrollBar}"/>
                                </ScrollViewer.Resources>
                                <StackPanel Name="ResultsPanel" Margin="0,0,4,0"/>
                            </ScrollViewer>
                        </Grid>

                        <!-- ALTERNATE VIEW: BUILT-IN WPF ZAU THEME STUDIO -->
                        <Grid Name="StudioView" Grid.Row="1" Visibility="Collapsed">
                            <Grid.RowDefinitions>
                                <RowDefinition Height="*"/>
                                <RowDefinition Height="Auto"/>
                            </Grid.RowDefinitions>

                            <ScrollViewer Grid.Row="0" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Disabled">
                                <ScrollViewer.Resources>
                                    <Style TargetType="ScrollBar" BasedOn="{StaticResource DarkScrollBar}"/>
                                </ScrollViewer.Resources>
                                <StackPanel Margin="0,0,6,8">
                                    <!-- LIVE MINIATURE PREVIEW -->
                                    <TextBlock Text="LIVE PREVIEW" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10.5" Foreground="#7E8CA8" Margin="2,0,0,6"/>
                                    <Border Name="MiniOuter" CornerRadius="14" Padding="1.5" Margin="0,0,0,14">
                                        <Border Name="MiniSurface" CornerRadius="12.8" Padding="12,10">
                                            <StackPanel>
                                                <DockPanel Margin="0,0,0,8">
                                                    <StackPanel Orientation="Horizontal" DockPanel.Dock="Left" VerticalAlignment="Center">
                                                        <Border Name="MiniBrandDot" Width="16" Height="16" CornerRadius="5" Margin="0,0,7,0"/>
                                                        <TextBlock Name="MiniBrandText" Text="QUIET TRIGGER" FontFamily="Segoe UI" FontWeight="Bold" FontSize="10.5" Foreground="#EFF4FF"/>
                                                    </StackPanel>
                                                    <TextBlock Name="MiniThemeBadge" Text="Aurora · Three-Color · Diagonal" FontFamily="Segoe UI" FontSize="10" Foreground="#8E9CB8" HorizontalAlignment="Right"/>
                                                </DockPanel>
                                                <Border Name="MiniSearchRing" CornerRadius="8" Padding="1.2" Margin="0,0,0,8">
                                                    <Border Name="MiniSearchInner" CornerRadius="7" Height="26" Padding="9,0">
                                                        <TextBlock Name="MiniSearchText" Text="Search commands, tools, effects..." FontFamily="Segoe UI" FontSize="11" Foreground="#7A89A8" VerticalAlignment="Center"/>
                                                    </Border>
                                                </Border>
                                                <Border Name="MiniRowRing" CornerRadius="9" Padding="1.2">
                                                    <Border Name="MiniRowInner" CornerRadius="8" Padding="10,7">
                                                        <DockPanel>
                                                            <Border Name="MiniRowTile" Width="28" Height="28" CornerRadius="7" Margin="0,0,10,0" DockPanel.Dock="Left"/>
                                                            <StackPanel VerticalAlignment="Center" DockPanel.Dock="Left">
                                                                <TextBlock Name="MiniRowName" Text="Gaussian Blur" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="11.5" Foreground="#F0F5FF"/>
                                                                <TextBlock Name="MiniRowCat" Text="Filters / Blur" FontFamily="Segoe UI" FontSize="9.5" Foreground="#8E9CB8"/>
                                                            </StackPanel>
                                                            <TextBlock Text="★" Foreground="#F5B942" FontSize="12" HorizontalAlignment="Right" VerticalAlignment="Center"/>
                                                        </DockPanel>
                                                    </Border>
                                                </Border>
                                            </StackPanel>
                                        </Border>
                                    </Border>

                                    <!-- 6 BUILT-IN PRESET CARDS -->
                                    <TextBlock Text="BUILT-IN PRESETS" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10.5" Foreground="#7E8CA8" Margin="2,0,0,6"/>
                                    <UniformGrid Name="PresetCardsGrid" Columns="3" Margin="0,0,0,12"/>

                                    <!-- SAVED CUSTOM THEMES -->
                                    <StackPanel Name="SavedCustomSection" Margin="0,0,0,12" Visibility="Collapsed">
                                        <TextBlock Text="SAVED CUSTOM THEMES" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10.5" Foreground="#7E8CA8" Margin="2,0,0,6"/>
                                        <WrapPanel Name="SavedCustomWrap"/>
                                    </StackPanel>

                                    <!-- CUSTOM HEX COLOR EDITOR -->
                                    <DockPanel Margin="2,0,0,6">
                                        <TextBlock Text="CUSTOM HEX COLOR EDITOR" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10.5" Foreground="#7E8CA8" DockPanel.Dock="Left" VerticalAlignment="Center"/>
                                        <TextBlock Name="HexStatusText" Text="Enter #RRGGBB or click a swatch" FontFamily="Segoe UI" FontSize="10.5" Foreground="#6D7B98" HorizontalAlignment="Right" VerticalAlignment="Center"/>
                                    </DockPanel>
                                    <UniformGrid Name="HexInputsGrid" Columns="4" Margin="0,0,0,8"/>
                                    <WrapPanel Name="QuickSwatchesWrap" Margin="0,0,0,14"/>

                                    <!-- GRADIENT & VISUAL EFFECTS -->
                                    <UniformGrid Columns="2" Margin="0,0,0,10">
                                        <StackPanel Margin="0,0,8,0">
                                            <TextBlock Text="GRADIENT MODE" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsGradMode"/>
                                        </StackPanel>
                                        <StackPanel Margin="8,0,0,0">
                                            <TextBlock Text="GRADIENT DIRECTION" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsGradDir"/>
                                        </StackPanel>
                                    </UniformGrid>

                                    <UniformGrid Columns="2" Margin="0,0,0,10">
                                        <StackPanel Margin="0,0,8,0">
                                            <TextBlock Text="GLOW INTENSITY" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsGlow"/>
                                        </StackPanel>
                                        <StackPanel Margin="8,0,0,0">
                                            <TextBlock Text="SURFACE STYLE" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsSurface"/>
                                        </StackPanel>
                                    </UniformGrid>

                                    <UniformGrid Columns="2" Margin="0,0,0,10">
                                        <StackPanel Margin="0,0,8,0">
                                            <DockPanel Margin="2,0,0,5">
                                                <TextBlock Text="WINDOW OPACITY" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" DockPanel.Dock="Left"/>
                                                <TextBlock Name="OpacityValueLabel" Text="94%" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#B5C3DC" HorizontalAlignment="Right"/>
                                            </DockPanel>
                                            <Slider Name="OpacitySlider" Minimum="0.72" Maximum="1.00" TickFrequency="0.02" IsSnapToTickEnabled="True" Value="0.94"/>
                                        </StackPanel>
                                        <StackPanel Margin="8,0,0,0">
                                            <TextBlock Text="CORNER RADIUS" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsRadius"/>
                                        </StackPanel>
                                    </UniformGrid>

                                    <UniformGrid Columns="2" Margin="0,0,0,4">
                                        <StackPanel Margin="0,0,8,0">
                                            <TextBlock Text="UI DENSITY" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsDensity"/>
                                        </StackPanel>
                                        <StackPanel Margin="8,0,0,0">
                                            <TextBlock Text="APPEARANCE" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="10" Foreground="#7E8CA8" Margin="2,0,0,5"/>
                                            <WrapPanel Name="PillsAppearance"/>
                                        </StackPanel>
                                    </UniformGrid>
                                </StackPanel>
                            </ScrollViewer>

                            <!-- THEME STUDIO ACTION BAR -->
                            <DockPanel Grid.Row="1" Margin="0,10,0,0">
                                <StackPanel Orientation="Horizontal" DockPanel.Dock="Left">
                                    <Border Name="BtnStudioReset" CornerRadius="9" Padding="14,8" Margin="0,0,8,0" BorderThickness="1" Cursor="Hand">
                                        <TextBlock Text="Reset" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="12" Foreground="#C8D3E8"/>
                                    </Border>
                                    <Border Name="BtnStudioSaveCustom" CornerRadius="9" Padding="14,8" BorderThickness="1" Cursor="Hand">
                                        <TextBlock Text="+ Save Custom" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="12" Foreground="#DCE4F4"/>
                                    </Border>
                                </StackPanel>
                                <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
                                    <Border Name="BtnStudioCancel" CornerRadius="9" Padding="16,8" Margin="0,0,8,0" BorderThickness="1" Cursor="Hand">
                                        <TextBlock Text="Cancel" FontFamily="Segoe UI" FontWeight="SemiBold" FontSize="12" Foreground="#C8D3E8"/>
                                    </Border>
                                    <Border Name="BtnStudioApply" CornerRadius="9" Padding="20,8" Cursor="Hand">
                                        <TextBlock Text="Apply Theme" FontFamily="Segoe UI" FontWeight="Bold" FontSize="12" Foreground="#FFFFFF"/>
                                    </Border>
                                </StackPanel>
                            </DockPanel>
                        </Grid>

                        <!-- MINIMAL FOOTER -->
                        <DockPanel Grid.Row="2" Margin="2,12,2,0">
                            <StackPanel Orientation="Horizontal" DockPanel.Dock="Left" VerticalAlignment="Center">
                                <Ellipse Name="StatusDot" Width="7" Height="7" Fill="#34D399" Margin="0,0,8,0" VerticalAlignment="Center"/>
                                <TextBlock Name="DocText" FontFamily="Segoe UI" FontSize="11.5" Foreground="#8896B2" VerticalAlignment="Center"/>
                            </StackPanel>
                            <TextBlock Name="FooterHint" Text="↑↓ Navigate  ·  Enter Run  ·  Esc Close" FontFamily="Segoe UI" FontSize="11" Foreground="#667491" HorizontalAlignment="Right" VerticalAlignment="Center"/>
                        </DockPanel>
                    </Grid>
                </Grid>
            </Border>
        </Border>
    </Grid>
</Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $win = [Windows.Markup.XamlReader]::Load($reader)

    # Control references
    $outerGlowBorder  = $win.FindName("OuterGlowBorder")
    $mainSurface      = $win.FindName("MainSurface")
    $ambientTopWash   = $win.FindName("AmbientTopWash")
    $ambientBottomWash= $win.FindName("AmbientBottomWash")
    $headerBar        = $win.FindName("HeaderBar")
    $brandTileRing    = $win.FindName("BrandTileRing")
    $brandTileInner   = $win.FindName("BrandTileInner")
    $brandGlyph       = $win.FindName("BrandGlyph")
    $brandAccentDot   = $win.FindName("BrandAccentDot")
    $headerTitle      = $win.FindName("HeaderTitle")
    $headerSub        = $win.FindName("HeaderSub")
    $btnPin           = $win.FindName("BtnPin")
    $iconPin          = $win.FindName("IconPin")
    $btnStudio        = $win.FindName("BtnStudio")
    $iconGear         = $win.FindName("IconGear")
    $btnClose         = $win.FindName("BtnClose")
    $iconClose        = $win.FindName("IconClose")
    $paletteView      = $win.FindName("PaletteView")
    $studioView       = $win.FindName("StudioView")
    $searchRing       = $win.FindName("SearchRing")
    $searchInner      = $win.FindName("SearchInner")
    $searchIconPath   = $win.FindName("SearchIconPath")
    $searchPlaceholder= $win.FindName("SearchPlaceholder")
    $searchBox        = $win.FindName("SearchBox")
    $btnClearSearch   = $win.FindName("BtnClearSearch")
    $pillFavorites    = $win.FindName("PillFavorites")
    $pillFavText      = $win.FindName("PillFavText")
    $pillRecent       = $win.FindName("PillRecent")
    $pillRecText      = $win.FindName("PillRecText")
    $resultCountText  = $win.FindName("ResultCountText")
    $categoryCombo    = $win.FindName("CategoryCombo")
    $resultsScroll    = $win.FindName("ResultsScroll")
    $resultsPanel     = $win.FindName("ResultsPanel")
    $docText          = $win.FindName("DocText")
    $footerHint       = $win.FindName("FooterHint")

    # Theme Studio controls
    $miniOuter        = $win.FindName("MiniOuter")
    $miniSurface      = $win.FindName("MiniSurface")
    $miniBrandDot     = $win.FindName("MiniBrandDot")
    $miniBrandText    = $win.FindName("MiniBrandText")
    $miniThemeBadge   = $win.FindName("MiniThemeBadge")
    $miniSearchRing   = $win.FindName("MiniSearchRing")
    $miniSearchInner  = $win.FindName("MiniSearchInner")
    $miniSearchText   = $win.FindName("MiniSearchText")
    $miniRowRing      = $win.FindName("MiniRowRing")
    $miniRowInner     = $win.FindName("MiniRowInner")
    $miniRowTile      = $win.FindName("MiniRowTile")
    $miniRowName      = $win.FindName("MiniRowName")
    $miniRowCat       = $win.FindName("MiniRowCat")
    $presetCardsGrid  = $win.FindName("PresetCardsGrid")
    $savedCustomSec   = $win.FindName("SavedCustomSection")
    $savedCustomWrap  = $win.FindName("SavedCustomWrap")
    $hexInputsGrid    = $win.FindName("HexInputsGrid")
    $hexStatusText    = $win.FindName("HexStatusText")
    $quickSwatchesWrap= $win.FindName("QuickSwatchesWrap")
    $pillsGradMode    = $win.FindName("PillsGradMode")
    $pillsGradDir     = $win.FindName("PillsGradDir")
    $pillsGlow        = $win.FindName("PillsGlow")
    $pillsSurface     = $win.FindName("PillsSurface")
    $opacitySlider    = $win.FindName("OpacitySlider")
    $opacityValLabel  = $win.FindName("OpacityValueLabel")
    $pillsRadius      = $win.FindName("PillsRadius")
    $pillsDensity     = $win.FindName("PillsDensity")
    $pillsAppearance  = $win.FindName("PillsAppearance")
    $btnStudioReset   = $win.FindName("BtnStudioReset")
    $btnStudioSave    = $win.FindName("BtnStudioSaveCustom")
    $btnStudioCancel  = $win.FindName("BtnStudioCancel")
    $btnStudioApply   = $win.FindName("BtnStudioApply")

    $docText.Text = $docSummary

    # Fix clean gear SVG path inside 24x24
    $iconGear.Data = [System.Windows.Media.Geometry]::Parse("M12,9 A3,3 0 1,0 12.01,9 M12,3 L12,5 M12,19 L12,21 M3,12 L5,12 M19,12 L21,12 M5.6,5.6 L7,7 M17,17 L18.4,18.4 M18.4,5.6 L17,7 M7,17 L5.6,18.4 M12,6 A6,6 0 1,0 12.01,6")

    # Populate Category dropdown
    $categoryItems = @(
        @{ label = "All Categories"; value = "all" }
        @{ label = "Tools"; value = "tools" }
        @{ label = "Filters"; value = "filters" }
        @{ label = "Adjustments"; value = "adjustments" }
        @{ label = "Layers"; value = "layers" }
        @{ label = "Selections"; value = "selections" }
        @{ label = "Document"; value = "document" }
        @{ label = "View"; value = "view" }
        @{ label = "Export"; value = "export" }
    )
    foreach ($ci in $categoryItems) {
        [void]$categoryCombo.Items.Add($ci.label)
    }
    $categoryCombo.SelectedIndex = 0

    $allCommands = @($catalog.commands)
    $script:activeHexKey = "accentPrimary"
    $script:hexFieldControls = @{}

    # ------------------------------------------------------------------------
    # APPLY LIVE THEME TO WPF FLOATING WINDOW + MINIATURE PREVIEW
    # ------------------------------------------------------------------------
    $applyThemeToWindow = {
        param([hashtable]$t)
        $isLight = ($t.appearance -eq "light")
        $bgHex      = if ($isLight) { "#EEF2F9" } else { $t.background }
        $surfHex    = if ($isLight) { "#F8FAFE" } else { $t.surface }
        $selHex     = if ($isLight) { "#E0ECFF" } else { $t.selected }
        $bdrHex     = if ($isLight) { "#C7D2E6" } else { $t.border }
        $txtHex     = if ($isLight) { "#171D2B" } else { "#F2F6FF" }
        $mutedHex   = if ($isLight) { "#55627A" } else { "#9AA8C4" }
        $dimHex     = if ($isLight) { "#7C89A3" } else { "#6E7C99" }

        $alpha = switch ($t.surfaceStyle) {
            "solid"       { 1.0 }
            "flat"        { 0.99 }
            "translucent" { [Math]::Max(0.72, $t.windowOpacity - 0.08) }
            default       { $t.windowOpacity } # frosted
        }

        $r = [double]$t.cornerRadius
        $outerGlowBorder.CornerRadius = New-Object System.Windows.CornerRadius($r)
        $mainSurface.CornerRadius     = New-Object System.Windows.CornerRadius([Math]::Max(8, $r - 1.5))

        $gradBrush = New-ThemeGradientBrush $t 1.0
        $outerGlowBorder.Background = if ($t.surfaceStyle -eq "flat") { New-SolidBrush $bdrHex 1.0 } else { $gradBrush }
        $mainSurface.Background     = New-SolidBrush $bgHex $alpha

        $glowBlur = switch ($t.glowIntensity) { "off" { 0 } "low" { 14 } "high" { 34 } default { 24 } }
        $glowOp   = switch ($t.glowIntensity) { "off" { 0 } "low" { 0.28 } "high" { 0.65 } default { 0.45 } }
        $outerGlowBorder.Effect = New-GlowEffect $t.glowColor $glowBlur $glowOp

        # Ambient interior radial washes
        if ($t.surfaceStyle -eq "flat" -or $t.glowIntensity -eq "off") {
            $ambientTopWash.Background = [System.Windows.Media.Brushes]::Transparent
            $ambientBottomWash.Background = [System.Windows.Media.Brushes]::Transparent
        } else {
            $topRad = New-Object System.Windows.Media.RadialGradientBrush
            $topRad.Center = New-Object System.Windows.Point(0.22, 0.0)
            $topRad.GradientOrigin = New-Object System.Windows.Point(0.22, 0.0)
            $topRad.RadiusX = 0.72; $topRad.RadiusY = 0.95
            $topRad.GradientStops.Add((New-Object System.Windows.Media.GradientStop((ConvertTo-WpfColor $t.accentPrimary 0.55), 0.0)))
            $topRad.GradientStops.Add((New-Object System.Windows.Media.GradientStop((ConvertTo-WpfColor $t.accentSecondary 0.25), 0.45)))
            $topRad.GradientStops.Add((New-Object System.Windows.Media.GradientStop((ConvertTo-WpfColor $bgHex 0.0), 1.0)))
            $ambientTopWash.Background = $topRad

            $botRad = New-Object System.Windows.Media.RadialGradientBrush
            $botRad.Center = New-Object System.Windows.Point(0.82, 1.0)
            $botRad.GradientOrigin = New-Object System.Windows.Point(0.82, 1.0)
            $botRad.RadiusX = 0.65; $botRad.RadiusY = 0.95
            $botRad.GradientStops.Add((New-Object System.Windows.Media.GradientStop((ConvertTo-WpfColor $t.accentTertiary 0.45), 0.0)))
            $botRad.GradientStops.Add((New-Object System.Windows.Media.GradientStop((ConvertTo-WpfColor $bgHex 0.0), 1.0)))
            $ambientBottomWash.Background = $botRad
        }

        # Header & Icon buttons
        $brandTileRing.Background  = $gradBrush
        $brandTileInner.Background = New-SolidBrush $surfHex 0.95
        $brandGlyph.Stroke         = New-SolidBrush $txtHex 1.0
        if ($brandAccentDot) { $brandAccentDot.Fill = New-SolidBrush $t.accentPrimary 1.0 }
        $headerTitle.Foreground    = New-SolidBrush $txtHex 1.0
        $headerSub.Foreground      = New-SolidBrush $dimHex 1.0

        $btnBg = New-SolidBrush $surfHex 0.85
        $btnPin.Background    = if ($script:pinned) { New-SolidBrush $t.accentPrimary 0.22 } else { $btnBg }
        $btnPin.BorderThickness = New-Object System.Windows.Thickness(1)
        $btnPin.BorderBrush   = if ($script:pinned) { New-SolidBrush $t.accentPrimary 0.7 } else { New-SolidBrush $bdrHex 0.7 }
        $iconPin.Stroke       = if ($script:pinned) { New-SolidBrush $t.accentPrimary 1.0 } else { New-SolidBrush $mutedHex 1.0 }

        $btnStudio.Background = if ($script:studioOpen) { New-SolidBrush $t.accentPrimary 0.24 } else { $btnBg }
        $btnStudio.BorderThickness = New-Object System.Windows.Thickness(1)
        $btnStudio.BorderBrush = if ($script:studioOpen) { New-SolidBrush $t.accentPrimary 0.75 } else { New-SolidBrush $bdrHex 0.7 }
        $iconGear.Stroke      = if ($script:studioOpen) { New-SolidBrush $t.accentPrimary 1.0 } else { New-SolidBrush $mutedHex 1.0 }

        $btnClose.Background  = $btnBg
        $btnClose.BorderThickness = New-Object System.Windows.Thickness(1)
        $btnClose.BorderBrush = New-SolidBrush $bdrHex 0.7
        $iconClose.Stroke     = New-SolidBrush $mutedHex 1.0

        # Search bar
        $searchRing.Background  = $gradBrush
        $searchRing.Effect      = New-GlowEffect $t.glowColor ([Math]::Max(0, $glowBlur * 0.55)) ($glowOp * 0.55)
        $searchInner.Background = New-SolidBrush $surfHex 0.96
        $searchBox.Foreground   = New-SolidBrush $txtHex 1.0
        $searchBox.CaretBrush   = New-SolidBrush $t.accentPrimary 1.0
        $searchPlaceholder.Foreground = New-SolidBrush $dimHex 1.0
        $searchIconPath.Stroke  = New-SolidBrush $t.accentPrimary 0.9

        # Nav pills & category dropdown
        $pillFavActive = ($script:navFilter -eq "favorites")
        $pillRecActive = ($script:navFilter -eq "recent")
        $pillFavorites.Background  = if ($pillFavActive) { New-SolidBrush $t.accentPrimary 0.20 } else { New-SolidBrush $surfHex 0.80 }
        $pillFavorites.BorderBrush = if ($pillFavActive) { $gradBrush } else { New-SolidBrush $bdrHex 0.75 }
        $pillFavText.Foreground    = if ($pillFavActive) { New-SolidBrush $txtHex 1.0 } else { New-SolidBrush $mutedHex 1.0 }

        $pillRecent.Background     = if ($pillRecActive) { New-SolidBrush $t.accentPrimary 0.20 } else { New-SolidBrush $surfHex 0.80 }
        $pillRecent.BorderBrush    = if ($pillRecActive) { $gradBrush } else { New-SolidBrush $bdrHex 0.75 }
        $pillRecText.Foreground    = if ($pillRecActive) { New-SolidBrush $txtHex 1.0 } else { New-SolidBrush $mutedHex 1.0 }

        $categoryCombo.Background  = New-SolidBrush $surfHex 0.90
        $categoryCombo.BorderBrush = New-SolidBrush $bdrHex 0.85
        $categoryCombo.Foreground  = New-SolidBrush $txtHex 1.0

        # Footer
        $docText.Foreground    = New-SolidBrush $mutedHex 1.0
        $footerHint.Foreground = New-SolidBrush $dimHex 1.0

        # Studio action buttons & live miniature preview
        $btnStudioReset.Background  = New-SolidBrush $surfHex 0.9
        $btnStudioReset.BorderBrush = New-SolidBrush $bdrHex 0.9
        $btnStudioSave.Background   = New-SolidBrush $surfHex 0.9
        $btnStudioSave.BorderBrush  = New-SolidBrush $t.accentPrimary 0.65
        $btnStudioCancel.Background = New-SolidBrush $surfHex 0.9
        $btnStudioCancel.BorderBrush= New-SolidBrush $bdrHex 0.9
        $btnStudioApply.Background  = $gradBrush

        # Live miniature preview card
        $miniOuter.Background       = $gradBrush
        $miniOuter.CornerRadius     = New-Object System.Windows.CornerRadius([Math]::Max(8, $r * 0.7))
        $miniOuter.Effect           = New-GlowEffect $t.glowColor ([Math]::Max(0, $glowBlur * 0.45)) ($glowOp * 0.5)
        $miniSurface.Background     = New-SolidBrush $bgHex $alpha
        $miniSurface.CornerRadius   = New-Object System.Windows.CornerRadius([Math]::Max(7, $r * 0.7 - 1.2))
        $miniBrandDot.Background    = $gradBrush
        $miniBrandText.Foreground   = New-SolidBrush $txtHex 1.0
        $presetDisp = if ($t.preset -eq "custom") { if ($t.customName) { $t.customName } else { "Custom" } } elseif ($script:THEME_PRESETS.ContainsKey($t.preset)) { $script:THEME_PRESETS[$t.preset].name } else { $t.preset }
        $miniThemeBadge.Text        = "$presetDisp  ·  $($t.gradientMode)  ·  $($t.gradientDirection)  ·  $([int]($t.windowOpacity * 100))%"
        $miniThemeBadge.Foreground  = New-SolidBrush $mutedHex 1.0
        $miniSearchRing.Background  = $gradBrush
        $miniSearchInner.Background = New-SolidBrush $surfHex 0.95
        $miniSearchText.Foreground  = New-SolidBrush $dimHex 1.0
        $miniRowRing.Background     = $gradBrush
        $miniRowInner.Background    = New-SolidBrush $selHex 0.95
        $miniRowTile.Background     = New-SolidBrush $surfHex 0.95
        $miniRowTile.BorderBrush    = New-SolidBrush $bdrHex 0.8
        $miniRowTile.BorderThickness= New-Object System.Windows.Thickness(1)
        $miniRowName.Foreground     = New-SolidBrush $txtHex 1.0
        $miniRowCat.Foreground      = New-SolidBrush $mutedHex 1.0
    }

    # ------------------------------------------------------------------------
    # RENDER COMMAND RESULT ROWS
    # ------------------------------------------------------------------------
    $updateSelectionVisuals = {
        $t = $script:activeTheme
        $isLight  = ($t.appearance -eq "light")
        $surfHex  = if ($isLight) { "#F8FAFE" } else { $t.surface }
        $selHex   = if ($isLight) { "#E0ECFF" } else { $t.selected }
        $bdrHex   = if ($isLight) { "#C7D2E6" } else { $t.border }
        $grad     = New-ThemeGradientBrush $t 1.0
        $glowBlur = switch ($t.glowIntensity) { "off" { 0 } "low" { 8 } "high" { 18 } default { 13 } }
        $glowOp   = switch ($t.glowIntensity) { "off" { 0 } "low" { 0.22 } "high" { 0.48 } default { 0.34 } }

        for ($i = 0; $i -lt $script:rowBorders.Count; $i++) {
            $pair = $script:rowBorders[$i]
            $isSel = ($i -eq $script:selectedIndex)
            if ($isSel) {
                $pair.Ring.Background = $grad
                $pair.Ring.Effect = New-GlowEffect $t.glowColor $glowBlur $glowOp
                $pair.Inner.Background = New-SolidBrush $selHex 0.95
                $pair.Tile.BorderBrush = New-SolidBrush $t.accentPrimary 0.55
                $pair.Ring.BringIntoView()
            } else {
                $pair.Ring.Background = New-SolidBrush $bdrHex 0.35
                $pair.Ring.Effect = $null
                $pair.Inner.Background = New-SolidBrush $surfHex 0.62
                $pair.Tile.BorderBrush = New-SolidBrush $bdrHex 0.55
            }
        }
    }

    $executeSelected = {
        $idx = $script:selectedIndex
        if ($idx -ge 0 -and $idx -lt $script:filtered.Count) {
            $cmd = $script:filtered[$idx]
            $win.Close()
            [void][ZauWin32]::SetForegroundWindow($psHwnd)
            try {
                [void](Invoke-ZauBridge -Method POST -Path "/execute" -Body @{ commandId = $cmd.id })
            } catch {}
        }
    }

    $refreshList = {
        $q = $searchBox.Text.Trim()
        $searchPlaceholder.Visibility = if ([string]::IsNullOrEmpty($searchBox.Text)) { "Visible" } else { "Collapsed" }
        $btnClearSearch.Visibility    = if ([string]::IsNullOrEmpty($searchBox.Text)) { "Collapsed" } else { "Visible" }

        $scored = @()
        foreach ($cmd in $allCommands) {
            if ($script:navFilter -eq "favorites" -and -not $favSet.ContainsKey($cmd.id)) { continue }
            if ($script:navFilter -eq "recent" -and -not $recSet.ContainsKey($cmd.id)) { continue }
            if ($script:categoryFilter -ne "all" -and ([string]$cmd.category).ToLowerInvariant() -ne $script:categoryFilter) { continue }

            $sc = Get-MatchScore -Cmd $cmd -RawQuery $q -FavSet $favSet -RecSet $recSet
            if ($sc -gt 0) {
                $scored += [PSCustomObject]@{ Score = $sc; Cmd = $cmd }
            }
        }
        $script:filtered = @(
            $scored | Sort-Object -Property @{ Expression = "Score"; Descending = $true } | Select-Object -First 30 | ForEach-Object { $_.Cmd }
        )

        $resultsPanel.Children.Clear()
        $script:rowBorders.Clear()

        $t = $script:activeTheme
        $isLight  = ($t.appearance -eq "light")
        $txtHex   = if ($isLight) { "#171D2B" } else { "#F2F6FF" }
        $mutedHex = if ($isLight) { "#55627A" } else { "#9AA8C4" }
        $dimHex   = if ($isLight) { "#7C89A3" } else { "#6E7C99" }
        $surfHex  = if ($isLight) { "#FFFFFF" } else { $t.surface }
        $bdrHex   = if ($isLight) { "#C7D2E6" } else { $t.border }
        $iconStroke = if ($isLight) { "#2A3550" } else { "#E4ECFC" }

        $rowPadY = switch ($t.density) { "compact" { 7 } "spacious" { 13 } default { 10 } }
        $tileSz  = switch ($t.density) { "compact" { 40 } "spacious" { 52 } default { 46 } }
        $nameSz  = switch ($t.density) { "compact" { 13.5 } "spacious" { 15.5 } default { 14.5 } }
        $rowRad  = [Math]::Max(10, [int]($t.cornerRadius * 0.65))
        $rowGap  = switch ($t.density) { "compact" { 6 } "spacious" { 10 } default { 8 } }

        $resultCountText.Text = "$($script:filtered.Count) commands"

        if ($script:filtered.Count -eq 0) {
            $empty = New-Object System.Windows.Controls.TextBlock
            $empty.Text = "No matching Photoshop commands found."
            $empty.Foreground = New-SolidBrush $mutedHex 1.0
            $empty.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")
            $empty.FontSize = 13.5
            $empty.HorizontalAlignment = "Center"
            $empty.Margin = New-Object System.Windows.Thickness(0, 48, 0, 0)
            [void]$resultsPanel.Children.Add($empty)
            $script:selectedIndex = -1
            return
        }

        if ($script:selectedIndex -lt 0 -or $script:selectedIndex -ge $script:filtered.Count) {
            $script:selectedIndex = 0
        }

        for ($i = 0; $i -lt $script:filtered.Count; $i++) {
            $cmd = $script:filtered[$i]
            $rowIdx = $i

            $ring = New-Object System.Windows.Controls.Border
            $ring.CornerRadius = New-Object System.Windows.CornerRadius($rowRad)
            $ring.Padding = New-Object System.Windows.Thickness(1.4)
            $ring.Margin = New-Object System.Windows.Thickness(0, 0, 0, $rowGap)
            $ring.Cursor = [System.Windows.Input.Cursors]::Hand

            $inner = New-Object System.Windows.Controls.Border
            $inner.CornerRadius = New-Object System.Windows.CornerRadius([Math]::Max(8, $rowRad - 1.2))
            $inner.Padding = New-Object System.Windows.Thickness(12, $rowPadY, 14, $rowPadY)

            $grid = New-Object System.Windows.Controls.Grid
            $c0 = New-Object System.Windows.Controls.ColumnDefinition; $c0.Width = [System.Windows.GridLength]::Auto
            $c1 = New-Object System.Windows.Controls.ColumnDefinition; $c1.Width = New-Object System.Windows.GridLength(1, [System.Windows.GridUnitType]::Star)
            $c2 = New-Object System.Windows.Controls.ColumnDefinition; $c2.Width = [System.Windows.GridLength]::Auto
            $grid.ColumnDefinitions.Add($c0)
            $grid.ColumnDefinitions.Add($c1)
            $grid.ColumnDefinitions.Add($c2)

            # Left: Monochrome icon tile
            $tile = New-Object System.Windows.Controls.Border
            $tile.Width = $tileSz; $tile.Height = $tileSz
            $tile.CornerRadius = New-Object System.Windows.CornerRadius(11)
            $tile.Background = New-SolidBrush $surfHex 0.92
            $tile.BorderThickness = New-Object System.Windows.Thickness(1)
            $tile.BorderBrush = New-SolidBrush $bdrHex 0.55
            $tile.Margin = New-Object System.Windows.Thickness(0, 0, 14, 0)
            $tile.VerticalAlignment = "Center"

            $vb = New-Object System.Windows.Controls.Viewbox
            $vb.Width = [int]($tileSz * 0.46); $vb.Height = [int]($tileSz * 0.46)
            $cv = New-Object System.Windows.Controls.Canvas
            $cv.Width = 24; $cv.Height = 24
            $pathEl = New-Object System.Windows.Shapes.Path
            $pathEl.Data = [System.Windows.Media.Geometry]::Parse((Get-CommandIconGeometry $cmd))
            $pathEl.Stroke = New-SolidBrush $iconStroke 0.92
            $pathEl.StrokeThickness = 1.75
            $pathEl.StrokeStartLineCap = "Round"
            $pathEl.StrokeEndLineCap = "Round"
            $pathEl.StrokeLineJoin = "Round"
            [void]$cv.Children.Add($pathEl)
            $vb.Child = $cv
            $tile.Child = $vb
            [System.Windows.Controls.Grid]::SetColumn($tile, 0)
            [void]$grid.Children.Add($tile)

            # Center: Name + Category Breadcrumb
            $centerStack = New-Object System.Windows.Controls.StackPanel
            $centerStack.VerticalAlignment = "Center"

            $nameTb = New-Object System.Windows.Controls.TextBlock
            $nameTb.Text = [string]$cmd.name
            $nameTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")
            $nameTb.FontWeight = "SemiBold"
            $nameTb.FontSize = $nameSz
            $nameTb.Foreground = New-SolidBrush $txtHex 1.0
            $nameTb.TextTrimming = "CharacterEllipsis"
            [void]$centerStack.Children.Add($nameTb)

            $metaTb = New-Object System.Windows.Controls.TextBlock
            $crumb = Get-CategoryBreadcrumb $cmd
            $descTxt = [string](Get-PropVal $cmd "description" "")
            $metaTb.Text = if ($descTxt) { "$crumb   ·   $descTxt" } else { $crumb }
            $metaTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")
            $metaTb.FontSize = 11.5
            $metaTb.Foreground = New-SolidBrush $mutedHex 0.88
            $metaTb.Margin = New-Object System.Windows.Thickness(0, 2, 0, 0)
            $metaTb.TextTrimming = "CharacterEllipsis"
            [void]$centerStack.Children.Add($metaTb)

            [System.Windows.Controls.Grid]::SetColumn($centerStack, 1)
            [void]$grid.Children.Add($centerStack)

            # Right: Real Shortcut Badge (only if registered!) + Favorite Star
            $rightStack = New-Object System.Windows.Controls.StackPanel
            $rightStack.Orientation = "Horizontal"
            $rightStack.VerticalAlignment = "Center"
            $rightStack.Margin = New-Object System.Windows.Thickness(12, 0, 0, 0)

            $realShortcut = [string](Get-PropVal $cmd "shortcut" "")
            if (-not [string]::IsNullOrWhiteSpace($realShortcut)) {
                $kbdBorder = New-Object System.Windows.Controls.Border
                $kbdBorder.CornerRadius = New-Object System.Windows.CornerRadius(6)
                $kbdBorder.Background = New-SolidBrush $surfHex 0.95
                $kbdBorder.BorderBrush = New-SolidBrush $bdrHex 0.85
                $kbdBorder.BorderThickness = New-Object System.Windows.Thickness(1)
                $kbdBorder.Padding = New-Object System.Windows.Thickness(8, 3, 8, 3)
                $kbdBorder.Margin = New-Object System.Windows.Thickness(0, 0, 10, 0)
                $kbdBorder.VerticalAlignment = "Center"

                $kbdText = New-Object System.Windows.Controls.TextBlock
                $kbdText.Text = $realShortcut
                $kbdText.FontFamily = New-Object System.Windows.Media.FontFamily("Consolas")
                $kbdText.FontSize = 11
                $kbdText.Foreground = New-SolidBrush $mutedHex 1.0
                $kbdBorder.Child = $kbdText
                [void]$rightStack.Children.Add($kbdBorder)
            }

            $isFav = $favSet.ContainsKey($cmd.id)
            $starBtn = New-Object System.Windows.Controls.Border
            $starBtn.Width = 28; $starBtn.Height = 28
            $starBtn.CornerRadius = New-Object System.Windows.CornerRadius(8)
            $starBtn.Background = [System.Windows.Media.Brushes]::Transparent
            $starBtn.Cursor = [System.Windows.Input.Cursors]::Hand
            $starBtn.Tag = $cmd.id
            $starBtn.ToolTip = if ($isFav) { "Remove Favorite" } else { "Add to Favorites" }

            $starTb = New-Object System.Windows.Controls.TextBlock
            $starTb.Text = if ($isFav) { "★" } else { "☆" }
            $starTb.FontSize = 15
            $starTb.Foreground = if ($isFav) { New-SolidBrush "#F5B942" 1.0 } else { New-SolidBrush $dimHex 0.75 }
            $starTb.HorizontalAlignment = "Center"
            $starTb.VerticalAlignment = "Center"
            $starBtn.Child = $starTb

            $starBtn.Add_MouseLeftButtonDown({
                param($sender, $ev)
                $ev.Handled = $true
                $cid = [string]$sender.Tag
                if ($favSet.ContainsKey($cid)) { $favSet.Remove($cid) } else { $favSet[$cid] = $true }
                try {
                    [void](Invoke-ZauBridge -Method POST -Path "/favorite" -Body @{ commandId = $cid })
                } catch {}
                & $refreshList
            })
            [void]$rightStack.Children.Add($starBtn)

            [System.Windows.Controls.Grid]::SetColumn($rightStack, 2)
            [void]$grid.Children.Add($rightStack)

            $inner.Child = $grid
            $ring.Child = $inner
            $ring.Tag = $rowIdx

            $ring.Add_MouseLeftButtonDown({
                param($sender, $ev)
                $idxClicked = [int]$sender.Tag
                if ($ev.ClickCount -ge 2) {
                    $script:selectedIndex = $idxClicked
                    & $executeSelected
                } else {
                    $script:selectedIndex = $idxClicked
                    & $updateSelectionVisuals
                }
            })
            $ring.Add_MouseEnter({
                param($sender, $ev)
                $idxHover = [int]$sender.Tag
                if ($idxHover -ne $script:selectedIndex) {
                    $script:selectedIndex = $idxHover
                    & $updateSelectionVisuals
                }
            })

            [void]$resultsPanel.Children.Add($ring)
            [void]$script:rowBorders.Add(@{ Ring = $ring; Inner = $inner; Tile = $tile })
        }

        & $updateSelectionVisuals
    }

    # ------------------------------------------------------------------------
    # BUILD & SYNC WPF ZAU THEME STUDIO CONTROLS
    # ------------------------------------------------------------------------
    $makePillGroup = {
        param([System.Windows.Controls.WrapPanel]$Panel, [array]$Items, [string]$ThemeKey)
        $Panel.Children.Clear()
        $currentVal = [string]$script:draftTheme[$ThemeKey]
        $t = $script:draftTheme
        $isLight = ($t.appearance -eq "light")
        $surfHex = if ($isLight) { "#FFFFFF" } else { $t.surface }
        $bdrHex  = if ($isLight) { "#C7D2E6" } else { $t.border }
        $txtHex  = if ($isLight) { "#171D2B" } else { "#DCE4F4" }

        foreach ($item in $Items) {
            $isAct = ($currentVal -eq [string]$item.value)
            $b = New-Object System.Windows.Controls.Border
            $b.CornerRadius = New-Object System.Windows.CornerRadius(8)
            $b.Padding = New-Object System.Windows.Thickness(10, 5, 10, 5)
            $b.Margin = New-Object System.Windows.Thickness(0, 0, 6, 6)
            $b.BorderThickness = New-Object System.Windows.Thickness(1)
            $b.Cursor = [System.Windows.Input.Cursors]::Hand
            $b.Background = if ($isAct) { New-SolidBrush $t.accentPrimary 0.24 } else { New-SolidBrush $surfHex 0.85 }
            $b.BorderBrush = if ($isAct) { New-SolidBrush $t.accentPrimary 0.9 } else { New-SolidBrush $bdrHex 0.85 }

            $tb = New-Object System.Windows.Controls.TextBlock
            $tb.Text = $item.label
            $tb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")
            $tb.FontSize = 11.5
            $tb.FontWeight = if ($isAct) { "SemiBold" } else { "Normal" }
            $tb.Foreground = New-SolidBrush $txtHex 1.0
            $b.Child = $tb
            $b.Tag = @{ Key = $ThemeKey; Value = $item.value }

            $b.Add_MouseLeftButtonDown({
                param($sender, $ev)
                $tag = $sender.Tag
                $script:draftTheme[$tag.Key] = $tag.Value
                $script:activeTheme = Clone-Theme $script:draftTheme
                & $applyThemeToWindow $script:activeTheme
                & $refreshStudioControls
            })
            [void]$Panel.Children.Add($b)
        }
    }

    $refreshStudioControls = {
        $script:suppressStudioEvents = $true
        $t = $script:draftTheme
        $isLight = ($t.appearance -eq "light")
        $surfHex = if ($isLight) { "#FFFFFF" } else { $t.surface }
        $bdrHex  = if ($isLight) { "#C7D2E6" } else { $t.border }
        $txtHex  = if ($isLight) { "#171D2B" } else { "#EFF4FF" }
        $mutedHex= if ($isLight) { "#55627A" } else { "#8E9CB8" }

        # 1. Preset cards (3x2)
        $presetCardsGrid.Children.Clear()
        foreach ($presetKey in $script:PRESET_ORDER) {
            $p = $script:THEME_PRESETS[$presetKey]
            $isSel = ($t.preset -eq $presetKey)
            $card = New-Object System.Windows.Controls.Border
            $card.CornerRadius = New-Object System.Windows.CornerRadius(11)
            $card.Margin = New-Object System.Windows.Thickness(0, 0, 8, 8)
            $card.Padding = New-Object System.Windows.Thickness(10, 8, 10, 8)
            $card.BorderThickness = New-Object System.Windows.Thickness($(if ($isSel) { 1.6 } else { 1 }))
            $card.Background = New-SolidBrush $surfHex 0.88
            $card.BorderBrush = if ($isSel) { New-ThemeGradientBrush (New-ThemeFromPreset $presetKey) 1.0 } else { New-SolidBrush $bdrHex 0.75 }
            $card.Cursor = [System.Windows.Input.Cursors]::Hand
            $card.Tag = $presetKey

            $sp = New-Object System.Windows.Controls.StackPanel
            $topDock = New-Object System.Windows.Controls.DockPanel
            $nTb = New-Object System.Windows.Controls.TextBlock
            $nTb.Text = $p.name; $nTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")
            $nTb.FontWeight = "SemiBold"; $nTb.FontSize = 12; $nTb.Foreground = New-SolidBrush $txtHex 1.0
            [System.Windows.Controls.DockPanel]::SetDock($nTb, "Left")
            [void]$topDock.Children.Add($nTb)

            $dots = New-Object System.Windows.Controls.StackPanel
            $dots.Orientation = "Horizontal"; $dots.HorizontalAlignment = "Right"; $dots.VerticalAlignment = "Center"
            foreach ($hex in @($p.accentPrimary, $p.accentSecondary, $p.accentTertiary)) {
                $el = New-Object System.Windows.Shapes.Ellipse
                $el.Width = 9; $el.Height = 9; $el.Fill = New-SolidBrush $hex 1.0
                $el.Margin = New-Object System.Windows.Thickness(3, 0, 0, 0)
                [void]$dots.Children.Add($el)
            }
            [void]$topDock.Children.Add($dots)
            [void]$sp.Children.Add($topDock)

            $subTb = New-Object System.Windows.Controls.TextBlock
            $subTb.Text = $p.subtitle; $subTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")
            $subTb.FontSize = 10; $subTb.Foreground = New-SolidBrush $mutedHex 1.0
            $subTb.Margin = New-Object System.Windows.Thickness(0, 2, 0, 6)
            [void]$sp.Children.Add($subTb)

            $bar = New-Object System.Windows.Controls.Border
            $bar.Height = 4; $bar.CornerRadius = New-Object System.Windows.CornerRadius(2)
            $bar.Background = New-ThemeGradientBrush (New-ThemeFromPreset $presetKey) 1.0
            [void]$sp.Children.Add($bar)

            $card.Child = $sp
            $card.Add_MouseLeftButtonDown({
                param($sender, $ev)
                $chosen = [string]$sender.Tag
                $next = New-ThemeFromPreset $chosen
                # Keep user's current density & corner radius feel if desired, or load full preset cleanly
                $script:draftTheme = $next
                $script:activeTheme = Clone-Theme $script:draftTheme
                & $applyThemeToWindow $script:activeTheme
                & $refreshStudioControls
            })
            [void]$presetCardsGrid.Children.Add($card)
        }

        # 2. Saved custom theme chips
        $savedCustomWrap.Children.Clear()
        if ($script:savedCustomThemes.Count -gt 0) {
            $savedCustomSec.Visibility = "Visible"
            foreach ($scObj in @($script:savedCustomThemes)) {
                $cName = [string](Get-PropVal $scObj "name" "Custom")
                $cId   = [string](Get-PropVal $scObj "id" "")
                $cTh   = Sanitize-Theme (Get-PropVal $scObj "theme" $scObj)
                $chip = New-Object System.Windows.Controls.Border
                $chip.CornerRadius = New-Object System.Windows.CornerRadius(8)
                $chip.Background = New-SolidBrush $surfHex 0.9
                $chip.BorderBrush = New-SolidBrush $cTh.accentPrimary 0.7
                $chip.BorderThickness = New-Object System.Windows.Thickness(1)
                $chip.Padding = New-Object System.Windows.Thickness(9, 4, 8, 4)
                $chip.Margin = New-Object System.Windows.Thickness(0, 0, 6, 6)
                $chip.Cursor = [System.Windows.Input.Cursors]::Hand

                $rowSp = New-Object System.Windows.Controls.StackPanel
                $rowSp.Orientation = "Horizontal"
                $dot = New-Object System.Windows.Shapes.Ellipse
                $dot.Width = 8; $dot.Height = 8; $dot.Fill = New-SolidBrush $cTh.accentPrimary 1.0
                $dot.Margin = New-Object System.Windows.Thickness(0, 0, 6, 0)
                [void]$rowSp.Children.Add($dot)

                $lbl = New-Object System.Windows.Controls.TextBlock
                $lbl.Text = $cName; $lbl.FontSize = 11.5; $lbl.Foreground = New-SolidBrush $txtHex 1.0
                $lbl.Margin = New-Object System.Windows.Thickness(0, 0, 6, 0)
                [void]$rowSp.Children.Add($lbl)

                $del = New-Object System.Windows.Controls.TextBlock
                $del.Text = "×"; $del.FontSize = 12; $del.Foreground = New-SolidBrush $mutedHex 1.0
                $del.Tag = $cId
                $del.Add_MouseLeftButtonDown({
                    param($sDel, $eDel)
                    $eDel.Handled = $true
                    $remId = [string]$sDel.Tag
                    $kept = New-Object System.Collections.ArrayList
                    foreach ($it in $script:savedCustomThemes) {
                        if ([string](Get-PropVal $it "id" "") -ne $remId) { [void]$kept.Add($it) }
                    }
                    $script:savedCustomThemes = $kept
                    & $refreshStudioControls
                })
                [void]$rowSp.Children.Add($del)

                $chip.Child = $rowSp
                $chip.Tag = $cTh
                $chip.Add_MouseLeftButtonDown({
                    param($sChip, $eChip)
                    $script:draftTheme = Clone-Theme $sChip.Tag
                    $script:activeTheme = Clone-Theme $script:draftTheme
                    & $applyThemeToWindow $script:activeTheme
                    & $refreshStudioControls
                })
                [void]$savedCustomWrap.Children.Add($chip)
            }
        } else {
            $savedCustomSec.Visibility = "Collapsed"
        }

        # 3. 8 HEX Color Fields
        $hexInputsGrid.Children.Clear()
        $script:hexFieldControls.Clear()
        $hexDefs = @(
            @{ key = "accentPrimary";   label = "Primary" }
            @{ key = "accentSecondary"; label = "Secondary" }
            @{ key = "accentTertiary";  label = "Tertiary" }
            @{ key = "glowColor";       label = "Glow" }
            @{ key = "background";      label = "Background" }
            @{ key = "surface";         label = "Surface" }
            @{ key = "selected";        label = "Selected" }
            @{ key = "border";          label = "Border" }
        )
        foreach ($hd in $hexDefs) {
            $val = [string]$t[$hd.key]
            $isActiveField = ($script:activeHexKey -eq $hd.key)
            $box = New-Object System.Windows.Controls.Border
            $box.CornerRadius = New-Object System.Windows.CornerRadius(9)
            $box.Margin = New-Object System.Windows.Thickness(0, 0, 7, 7)
            $box.Padding = New-Object System.Windows.Thickness(8, 6, 8, 6)
            $box.Background = New-SolidBrush $surfHex 0.88
            $box.BorderThickness = New-Object System.Windows.Thickness(1)
            $box.BorderBrush = if ($isActiveField) { New-SolidBrush $t.accentPrimary 0.9 } else { New-SolidBrush $bdrHex 0.75 }

            $vsp = New-Object System.Windows.Controls.StackPanel
            $lbl = New-Object System.Windows.Controls.TextBlock
            $lbl.Text = $hd.label; $lbl.FontSize = 10; $lbl.Foreground = New-SolidBrush $mutedHex 1.0
            $lbl.Margin = New-Object System.Windows.Thickness(0, 0, 0, 4)
            [void]$vsp.Children.Add($lbl)

            $row = New-Object System.Windows.Controls.DockPanel
            $sw = New-Object System.Windows.Controls.Border
            $sw.Width = 18; $sw.Height = 18; $sw.CornerRadius = New-Object System.Windows.CornerRadius(5)
            $sw.Background = New-SolidBrush $val 1.0
            $sw.BorderBrush = New-SolidBrush "#FFFFFF" 0.25
            $sw.BorderThickness = New-Object System.Windows.Thickness(1)
            $sw.Margin = New-Object System.Windows.Thickness(0, 0, 7, 0)
            [System.Windows.Controls.DockPanel]::SetDock($sw, "Left")
            [void]$row.Children.Add($sw)

            $tb = New-Object System.Windows.Controls.TextBox
            $tb.Text = $val
            $tb.Background = [System.Windows.Media.Brushes]::Transparent
            $tb.BorderThickness = New-Object System.Windows.Thickness(0)
            $tb.Foreground = New-SolidBrush $txtHex 1.0
            $tb.CaretBrush = New-SolidBrush $t.accentPrimary 1.0
            $tb.FontFamily = New-Object System.Windows.Media.FontFamily("Consolas")
            $tb.FontSize = 11.5
            $tb.VerticalContentAlignment = "Center"
            $tb.Tag = @{ Key = $hd.key; Swatch = $sw; Box = $box }

            $tb.Add_GotFocus({
                param($s, $e)
                $script:activeHexKey = $s.Tag.Key
                $hexStatusText.Text = "Editing $($s.Tag.Key) — pick swatch or type #RRGGBB"
            })
            $tb.Add_TextChanged({
                param($s, $e)
                if ($script:suppressStudioEvents) { return }
                $norm = Normalize-HexColor $s.Text
                if ($norm) {
                    $s.Tag.Swatch.Background = New-SolidBrush $norm 1.0
                    $s.Tag.Box.BorderBrush = New-SolidBrush $script:draftTheme.accentPrimary 0.9
                    $script:draftTheme[$s.Tag.Key] = $norm
                    $script:draftTheme["preset"] = "custom"
                    if ($s.Tag.Key -eq "accentPrimary") { $script:draftTheme["glowColor"] = $norm }
                    $script:activeTheme = Clone-Theme $script:draftTheme
                    $hexStatusText.Text = "Applied $norm"
                    & $applyThemeToWindow $script:activeTheme
                } else {
                    $s.Tag.Box.BorderBrush = New-SolidBrush "#FF454F" 0.95
                    $hexStatusText.Text = "Invalid HEX (use #RRGGBB)"
                }
            })
            [void]$row.Children.Add($tb)
            [void]$vsp.Children.Add($row)
            $box.Child = $vsp
            [void]$hexInputsGrid.Children.Add($box)
            $script:hexFieldControls[$hd.key] = $tb
        }

        # 4. Quick swatches bar
        $quickSwatchesWrap.Children.Clear()
        foreach ($swHex in $script:QUICK_SWATCHES) {
            $sb = New-Object System.Windows.Controls.Border
            $sb.Width = 22; $sb.Height = 22
            $sb.CornerRadius = New-Object System.Windows.CornerRadius(6)
            $sb.Background = New-SolidBrush $swHex 1.0
            $sb.BorderBrush = New-SolidBrush "#FFFFFF" 0.25
            $sb.BorderThickness = New-Object System.Windows.Thickness(1)
            $sb.Margin = New-Object System.Windows.Thickness(0, 0, 6, 4)
            $sb.Cursor = [System.Windows.Input.Cursors]::Hand
            $sb.ToolTip = "Set $($script:activeHexKey) to $swHex"
            $sb.Tag = $swHex
            $sb.Add_MouseLeftButtonDown({
                param($sSw, $eSw)
                $chosenHex = [string]$sSw.Tag
                $targetKey = if ($script:activeHexKey) { $script:activeHexKey } else { "accentPrimary" }
                $script:draftTheme[$targetKey] = $chosenHex
                $script:draftTheme["preset"] = "custom"
                if ($targetKey -eq "accentPrimary") { $script:draftTheme["glowColor"] = $chosenHex }
                $script:activeTheme = Clone-Theme $script:draftTheme
                & $applyThemeToWindow $script:activeTheme
                & $refreshStudioControls
            })
            [void]$quickSwatchesWrap.Children.Add($sb)
        }

        # 5. Pills & Sliders
        & $makePillGroup $pillsGradMode @(
            @{ label = "Solid"; value = "solid" }
            @{ label = "2-Color"; value = "two" }
            @{ label = "3-Color"; value = "three" }
        ) "gradientMode"

        & $makePillGroup $pillsGradDir @(
            @{ label = "Horizontal"; value = "horizontal" }
            @{ label = "Diagonal"; value = "diagonal" }
            @{ label = "Vertical"; value = "vertical" }
        ) "gradientDirection"

        & $makePillGroup $pillsGlow @(
            @{ label = "Off"; value = "off" }
            @{ label = "Low"; value = "low" }
            @{ label = "Medium"; value = "medium" }
            @{ label = "High"; value = "high" }
        ) "glowIntensity"

        & $makePillGroup $pillsSurface @(
            @{ label = "Frosted"; value = "frosted" }
            @{ label = "Translucent"; value = "translucent" }
            @{ label = "Solid"; value = "solid" }
            @{ label = "Flat"; value = "flat" }
        ) "surfaceStyle"

        & $makePillGroup $pillsRadius @(
            @{ label = "12px"; value = 12 }
            @{ label = "16px"; value = 16 }
            @{ label = "20px"; value = 20 }
            @{ label = "24px"; value = 24 }
        ) "cornerRadius"

        & $makePillGroup $pillsDensity @(
            @{ label = "Compact"; value = "compact" }
            @{ label = "Comfortable"; value = "comfortable" }
            @{ label = "Spacious"; value = "spacious" }
        ) "density"

        & $makePillGroup $pillsAppearance @(
            @{ label = "Dark"; value = "dark" }
            @{ label = "Light"; value = "light" }
        ) "appearance"

        $opacitySlider.Value = [double]$t.windowOpacity
        $opacityValLabel.Text = "$([int]([Math]::Round([double]$t.windowOpacity * 100)))%"

        $script:suppressStudioEvents = $false
    }

    $setStudioOpen = {
        param([bool]$Open)
        $script:studioOpen = $Open
        if ($Open) {
            $script:draftTheme = Clone-Theme $script:committedTheme
            $paletteView.Visibility = "Collapsed"
            $studioView.Visibility  = "Visible"
            $headerTitle.Text = "VAYRO THEME STUDIO"
            $headerSub.Text   = "Live Aurora Design Customization"
            $footerHint.Text  = "Live Preview Active  ·  Apply to Sync with Photoshop"
            & $applyThemeToWindow $script:activeTheme
            & $refreshStudioControls
        } else {
            $studioView.Visibility  = "Collapsed"
            $paletteView.Visibility = "Visible"
            $headerTitle.Text = "QUIET TRIGGER"
            $headerSub.Text   = "BY VAYRO  ·  Less searching. More creating."
            $footerHint.Text  = "↑↓ Navigate  ·  Enter Run  ·  Esc Close"
            & $applyThemeToWindow $script:activeTheme
            & $refreshList
            $searchBox.Focus()
        }
    }

    # ------------------------------------------------------------------------
    # INTERACTIVE EVENT WIRING
    # ------------------------------------------------------------------------
    $headerBar.Add_MouseLeftButtonDown({
        param($s, $e)
        if ($e.LeftButton -eq "Pressed") {
            try { $win.DragMove() } catch {}
        }
    })

    $btnPin.Add_MouseLeftButtonDown({
        param($s, $e)
        $e.Handled = $true
        $script:pinned = -not $script:pinned
        $win.Topmost = $script:pinned
        & $applyThemeToWindow $script:activeTheme
    })

    $btnStudio.Add_MouseLeftButtonDown({
        param($s, $e)
        $e.Handled = $true
        if ($script:studioOpen) {
            # Closing studio via gear without apply reverts draft
            $script:activeTheme = Clone-Theme $script:committedTheme
            & $setStudioOpen $false
        } else {
            & $setStudioOpen $true
        }
    })

    $btnClose.Add_MouseLeftButtonDown({
        param($s, $e)
        $e.Handled = $true
        $win.Close()
        [void][ZauWin32]::SetForegroundWindow($psHwnd)
    })

    $btnClearSearch.Add_MouseLeftButtonDown({
        param($s, $e)
        $e.Handled = $true
        $searchBox.Text = ""
        $searchBox.Focus()
    })

    $pillFavorites.Add_MouseLeftButtonDown({
        param($s, $e)
        $script:navFilter = if ($script:navFilter -eq "favorites") { "all" } else { "favorites" }
        $script:selectedIndex = 0
        & $applyThemeToWindow $script:activeTheme
        & $refreshList
    })

    $pillRecent.Add_MouseLeftButtonDown({
        param($s, $e)
        $script:navFilter = if ($script:navFilter -eq "recent") { "all" } else { "recent" }
        $script:selectedIndex = 0
        & $applyThemeToWindow $script:activeTheme
        & $refreshList
    })

    $categoryCombo.Add_SelectionChanged({
        $idx = $categoryCombo.SelectedIndex
        if ($idx -ge 0 -and $idx -lt $categoryItems.Count) {
            $script:categoryFilter = $categoryItems[$idx].value
            $script:selectedIndex = 0
            & $refreshList
        }
    })

    $opacitySlider.Add_ValueChanged({
        if ($script:suppressStudioEvents) { return }
        $v = [Math]::Round([double]$opacitySlider.Value, 2)
        $script:draftTheme["windowOpacity"] = $v
        $script:activeTheme = Clone-Theme $script:draftTheme
        $opacityValLabel.Text = "$([int]([Math]::Round($v * 100)))%"
        & $applyThemeToWindow $script:activeTheme
    })

    $btnStudioReset.Add_MouseLeftButtonDown({
        $script:draftTheme = New-ThemeFromPreset "aurora"
        $script:activeTheme = Clone-Theme $script:draftTheme
        & $applyThemeToWindow $script:activeTheme
        & $refreshStudioControls
    })

    $btnStudioSave.Add_MouseLeftButtonDown({
        $customNum = $script:savedCustomThemes.Count + 1
        $label = if ($script:draftTheme.customName) { $script:draftTheme.customName } else { "Custom $customNum" }
        $entry = [ordered]@{
            id = "custom_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            name = $label
            theme = (Sanitize-Theme $script:draftTheme)
        }
        $entry.theme.preset = "custom"
        $entry.theme.customName = $label
        if ($script:savedCustomThemes.Count -ge 12) { $script:savedCustomThemes.RemoveAt(0) }
        [void]$script:savedCustomThemes.Add($entry)
        $script:draftTheme = Clone-Theme $entry.theme
        $script:activeTheme = Clone-Theme $script:draftTheme
        $hexStatusText.Text = "Saved '$label'"
        & $applyThemeToWindow $script:activeTheme
        & $refreshStudioControls
    })

    $btnStudioCancel.Add_MouseLeftButtonDown({
        $script:activeTheme = Clone-Theme $script:committedTheme
        & $setStudioOpen $false
    })

    $btnStudioApply.Add_MouseLeftButtonDown({
        $sanitized = Sanitize-Theme $script:draftTheme
        $script:committedTheme = Clone-Theme $sanitized
        $script:activeTheme    = Clone-Theme $sanitized
        Save-LocalThemeFallback $sanitized @($script:savedCustomThemes)
        try {
            [void](Invoke-ZauBridge -Method POST -Path "/theme" -Body @{
                theme = $sanitized
                savedCustomThemes = @($script:savedCustomThemes)
            })
        } catch {}
        & $setStudioOpen $false
    })

    $searchBox.Add_TextChanged({
        $script:selectedIndex = 0
        & $refreshList
    })

    $win.Add_PreviewKeyDown({
        param($s, $e)
        if ($e.Key -eq "Escape") {
            $e.Handled = $true
            if ($script:studioOpen) {
                $script:activeTheme = Clone-Theme $script:committedTheme
                & $setStudioOpen $false
            } else {
                $win.Close()
                [void][ZauWin32]::SetForegroundWindow($psHwnd)
            }
            return
        }
        if ($script:studioOpen) { return }

        if ($e.Key -eq "Down") {
            $e.Handled = $true
            if ($script:filtered.Count -gt 0) {
                $script:selectedIndex = ($script:selectedIndex + 1) % $script:filtered.Count
                & $updateSelectionVisuals
            }
        } elseif ($e.Key -eq "Up") {
            $e.Handled = $true
            if ($script:filtered.Count -gt 0) {
                $script:selectedIndex = ($script:selectedIndex - 1 + $script:filtered.Count) % $script:filtered.Count
                & $updateSelectionVisuals
            }
        } elseif ($e.Key -eq "Return") {
            $e.Handled = $true
            & $executeSelected
        }
    })

    # Initial render
    & $applyThemeToWindow $script:activeTheme
    if (-not [string]::IsNullOrWhiteSpace($InitialQuery)) {
        $searchBox.Text = $InitialQuery
    }
    & $refreshList
    if ($OpenStudio -or $OpenSettings) {
        & $setStudioOpen $true
    }

    $win.Add_Loaded({
        if (-not $script:studioOpen) { $searchBox.Focus() }
    })

    # Optional automated high-DPI screenshot capture for visual QA
    if (-not [string]::IsNullOrWhiteSpace($CaptureOut)) {
        $win.Add_ContentRendered({
            $script:captureTimer = New-Object System.Windows.Threading.DispatcherTimer
            $script:captureTimer.Interval = [TimeSpan]::FromMilliseconds(450)
            $script:captureTimer.Add_Tick({
                param($tSender, $tArgs)
                $tSender.Stop()
                try {
                    $outDir = Split-Path -Parent $CaptureOut
                    if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
                    $wPx = [int][Math]::Ceiling($win.ActualWidth)
                    $hPx = [int][Math]::Ceiling($win.ActualHeight)
                    $rtb = New-Object System.Windows.Media.Imaging.RenderTargetBitmap($wPx, $hPx, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
                    # Render onto a dark backdrop so translucent glass & Aurora outer glow show realistically
                    $dv = New-Object System.Windows.Media.DrawingVisual
                    $dc = $dv.RenderOpen()
                    $bgRect = New-Object System.Windows.Rect(0, 0, $wPx, $hPx)
                    $dc.DrawRectangle((New-SolidBrush "#0A0D16" 1.0), $null, $bgRect)
                    $vbWin = New-Object System.Windows.Media.VisualBrush($win)
                    $dc.DrawRectangle($vbWin, $null, $bgRect)
                    $dc.Close()
                    $rtb.Render($dv)
                    $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
                    $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb))
                    $fs = [System.IO.File]::Open($CaptureOut, [System.IO.FileMode]::Create)
                    $enc.Save($fs)
                    $fs.Close()
                } finally {
                    $win.Close()
                }
            })
            $script:captureTimer.Start()
        })
    }

    [void]$win.ShowDialog()
}

if ($Once -or $OpenStudio -or $OpenSettings -or -not [string]::IsNullOrWhiteSpace($CaptureOut)) {
    Show-ZauFloatingPalette
    exit 0
}

# Prevent duplicate background hotkey helper instances
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Local\ZAU_Console_Hotkey_Helper_v1", [ref]$createdNew)
if (-not $createdNew) {
    Write-Host "Quiet Trigger Hotkey Helper is already running."
    exit 0
}

try {
    $MOD_ALT = 0x0001
    $MOD_CONTROL = 0x0002
    $MOD_SHIFT = 0x0004
    $VK_SPACE = 0x20

    $mods = switch ($Hotkey) {
        "Ctrl+Space"       { $MOD_CONTROL }
        "Ctrl+Shift+Space" { $MOD_CONTROL -bor $MOD_SHIFT }
        default            { $MOD_CONTROL -bor $MOD_ALT }
    }

    $form = New-Object System.Windows.Forms.Form
    $form.ShowInTaskbar = $false
    $form.WindowState = "Minimized"
    $form.Opacity = 0
    $HOTKEY_ID = 0x5A41

    $form.Add_Load({
        $ok = [ZauWin32]::RegisterHotKey($form.Handle, $HOTKEY_ID, $mods, $VK_SPACE)
        if (-not $ok) {
            Write-Error "Failed to register global hotkey $Hotkey (already in use)."
            $form.Close()
        } else {
            Write-Host "Quiet Trigger by VAYRO (v2.1.0) Hotkey Helper active ($Hotkey when Photoshop is focused). Press Ctrl+C to stop."
        }
    })

    $form.Add_FormClosing({
        [void][ZauWin32]::UnregisterHotKey($form.Handle, $HOTKEY_ID)
    })

    Add-Type -ReferencedAssemblies System.Windows.Forms @"
using System;
using System.Windows.Forms;

public class ZauHotkeyMessageFilter : IMessageFilter {
    public event Action HotkeyPressed;
    public bool PreFilterMessage(ref Message m) {
        if (m.Msg == 0x0312) {
            if (HotkeyPressed != null) HotkeyPressed();
            return true;
        }
        return false;
    }
}
"@

    $filter = New-Object ZauHotkeyMessageFilter
    $filter.add_HotkeyPressed({
        if (Test-PhotoshopActive) {
            Show-ZauFloatingPalette
        }
    })
    [System.Windows.Forms.Application]::AddMessageFilter($filter)
    [System.Windows.Forms.Application]::Run($form)
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
