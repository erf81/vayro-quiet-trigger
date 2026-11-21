; ============================================================================
; ZAU Console — Optional AutoHotkey v2 Global Hotkey Script
; ============================================================================
; Default hotkey: Ctrl + Alt + Space (recommended; preserves Photoshop's
; native Ctrl + Space Zoom In shortcut).
;
; Optional override: To use Ctrl + Space instead, uncomment ^Space:: below
; and comment out ^!Space::. WARNING: Ctrl + Space replaces Photoshop's
; native temporary Zoom In shortcut while this script is running.
; ============================================================================

#Requires AutoHotkey v2.0
#SingleInstance Force

#HotIf WinActive("ahk_exe Photoshop.exe")

; Recommended default: Ctrl + Alt + Space
^!Space::LaunchZauPalette()

; Optional override (uncomment ONLY if you accept overriding Photoshop Zoom):
; ^Space::LaunchZauPalette()

#HotIf

LaunchZauPalette() {
    scriptDir := A_ScriptDir
    Run('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' scriptDir '\zau-palette.ps1" -Once', , "Hide")
}
