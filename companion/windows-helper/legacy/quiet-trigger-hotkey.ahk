; Copyright 2026 erf81
; SPDX-License-Identifier: Apache-2.0
; LEGACY OPTIONAL AUTOHOTKEY v2 WRAPPER — End users should use QuietTriggerHelper.exe.
#Requires AutoHotkey v2.0
#SingleInstance Force

#HotIf WinActive("ahk_exe Photoshop.exe")
^!Space:: {
    Run('powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' A_ScriptDir '\..\quiet-trigger-palette.ps1" -Once', , "Hide")
}
#HotIf
