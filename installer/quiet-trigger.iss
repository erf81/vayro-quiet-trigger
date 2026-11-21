; Copyright 2026 erf81
; SPDX-License-Identifier: Apache-2.0

; ============================================================================
; Quiet Trigger Setup (Published by VAYRO) — Single-File Windows Installer
; "Less searching. More creating."
;
; Bundles:
;   - Official Adobe Photoshop UXP package (VAYRO-Quiet-Trigger-Photoshop-<ver>.ccx)
;   - Silent Native Windows Background Helper & System Tray (QuietTriggerHelper.exe)
;   - Local Loopback Bridge Server (companion\bridge\bridge-server.js + themeSystem.js)
;   - Bundled Portable Node.js Runtime (runtime\node.exe — zero global Node needed)
;   - Floating WPF Command Palette & VAYRO Theme Studio (quiet-trigger-palette.ps1)
;   - Per-user automatic startup (HKCU Run, no UAC admin prompt required)
;   - Safe ZAU Console 2.0.0 upgrade & clean Windows Uninstaller
; ============================================================================

#ifndef MyAppVersion
  #define MyAppVersion "2.1.0"
#endif
#ifndef CcxDir
  #define CcxDir "..\dist"
#endif

#define MyAppName "Quiet Trigger"
#define MyAppPublisher "VAYRO"
#define MyAppFullName "Quiet Trigger by VAYRO"
#define MyAppExeName "QuietTriggerHelper.exe"
#define MyCcxName "VAYRO-Quiet-Trigger-Photoshop-" + MyAppVersion + ".ccx"

[Setup]
AppId={{B4E7F2A1-8C93-4D6E-9B12-5F0A8E3D2100}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppFullName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppComments=Quiet Trigger Setup — Published by VAYRO. Less searching. More creating.
DefaultDirName={localappdata}\Programs\{#MyAppPublisher}\{#MyAppName}
DefaultGroupName={#MyAppPublisher}\{#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=VAYRO-Quiet-Trigger-Setup-{#MyAppVersion}-x64
SetupIconFile=..\assets\brand\quiet-trigger\quiet-trigger.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppFullName}
WizardStyle=modern
WizardImageFile=..\assets\brand\quiet-trigger\installer-sidebar.bmp
WizardSmallImageFile=..\assets\brand\quiet-trigger\installer-header.bmp
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes
RestartApplications=no
InfoBeforeFile=THIRD_PARTY_NOTICES.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "autostart"; Description: "Start Quiet Trigger automatically when signing in to Windows (recommended)"; GroupDescription: "Windows Integration:"
Name: "installplugin"; Description: "Install or upgrade the Quiet Trigger plugin in Adobe Photoshop (official Adobe installer)"; GroupDescription: "Adobe Photoshop Integration:"

[Files]
; Native silent Windows background helper & system tray
Source: "build\QuietTriggerHelper.exe"; DestDir: "{app}"; Flags: ignoreversion
; Bundled portable Node.js runtime (eliminates any global Node.js requirement)
Source: "stage\runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
; Local loopback bridge server & shared Aurora theme schema
Source: "..\companion\bridge\bridge-server.js"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "..\photoshop-plugin\src\theme\themeSystem.js"; DestDir: "{app}\src\theme"; Flags: ignoreversion
; Floating WPF command palette & VAYRO Theme Studio
Source: "..\companion\windows-helper\quiet-trigger-palette.ps1"; DestDir: "{app}\palette"; Flags: ignoreversion
; Official Adobe Photoshop UXP CCX package
Source: "{#CcxDir}\{#MyCcxName}"; DestDir: "{app}\plugin"; Flags: ignoreversion
; Brand icon & installer helper scripts
Source: "..\assets\brand\quiet-trigger\quiet-trigger.ico"; DestDir: "{app}\assets\brand\quiet-trigger"; Flags: ignoreversion
Source: "scripts\install-uxp-plugin.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\uninstall-uxp-plugin.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
; Third-party notices & docs
Source: "THIRD_PARTY_NOTICES.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docs\THEME_STUDIO.md"; DestDir: "{app}\docs"; Flags: ignoreversion

[Icons]
Name: "{group}\Quiet Trigger"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--open"; IconFilename: "{app}\assets\brand\quiet-trigger\quiet-trigger.ico"; Comment: "Open Quiet Trigger by VAYRO"
Name: "{group}\VAYRO Theme Studio"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--studio"; IconFilename: "{app}\assets\brand\quiet-trigger\quiet-trigger.ico"; Comment: "Customize Quiet Trigger themes"
Name: "{group}\Quiet Trigger Settings"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--settings"; IconFilename: "{app}\assets\brand\quiet-trigger\quiet-trigger.ico"; Comment: "Configure hotkey & startup"
Name: "{group}\Uninstall Quiet Trigger"; Filename: "{uninstallexe}"; IconFilename: "{app}\assets\brand\quiet-trigger\quiet-trigger.ico"

[Registry]
; Clean per-user Windows Startup entry (no admin elevation required, automatically removed on uninstall)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "VAYRO Quiet Trigger"; ValueData: """{app}\{#MyAppExeName}"" --startup"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; 1. Install or upgrade Photoshop UXP plugin via official Adobe UnifiedPluginInstallerAgent.exe
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ""{app}\scripts\install-uxp-plugin.ps1"" -CcxPath ""{app}\plugin\{#MyCcxName}"" -Silent"; StatusMsg: "Installing Quiet Trigger plugin into Adobe Photoshop..."; Flags: runhidden waituntilterminated; Tasks: installplugin
; 2. Start silent background helper via ShellExecute (detached handles — never blocks /VERYSILENT automation)
Filename: "{app}\{#MyAppExeName}"; Parameters: "--startup"; Description: "Launch Quiet Trigger silently in the Windows System Tray"; Flags: nowait postinstall skipifsilent shellexec
; Also ensure helper starts cleanly during silent installs
Filename: "{app}\{#MyAppExeName}"; Parameters: "--startup"; Flags: nowait runhidden shellexec; Check: WizardSilent

[UninstallRun]
; Gracefully stop running helper & local bridge before deleting application files
Filename: "{app}\{#MyAppExeName}"; Parameters: "--stop"; Flags: runhidden waituntilterminated; RunOnceId: "StopQuietTriggerHelper"

[Code]
var
  RemovePluginOnUninstall: Boolean;
  RemoveUserDataOnUninstall: Boolean;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ExistingExe: String;
  ResultCode: Integer;
begin
  Result := '';
  ExistingExe := ExpandConstant('{app}\{#MyAppExeName}');
  if FileExists(ExistingExe) then
  begin
    Exec(ExistingExe, '--stop', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(500);
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
  RemovePluginOnUninstall := False;
  RemoveUserDataOnUninstall := False;

  if not UninstallSilent then
  begin
    if MsgBox('Do you also want to remove the Quiet Trigger plugin from Adobe Photoshop using Adobe''s official plugin installer?', mbConfirmation, MB_YESNO) = IDYES then
      RemovePluginOnUninstall := True;

    if MsgBox('Preserve your Quiet Trigger settings, custom themes, and Favorites?' + #13#10#13#10 + 'Click YES to keep your user data (recommended), or NO to delete all Quiet Trigger user data.', mbConfirmation, MB_YESNO) = IDNO then
      RemoveUserDataOnUninstall := True;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  PsExe, ScriptPath, Args: String;
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    PsExe := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
    ScriptPath := ExpandConstant('{app}\scripts\uninstall-uxp-plugin.ps1');
    if FileExists(ScriptPath) then
    begin
      Args := '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + ScriptPath + '"';
      if RemovePluginOnUninstall then Args := Args + ' -RemovePlugin';
      if RemoveUserDataOnUninstall then Args := Args + ' -RemoveUserData';
      Exec(PsExe, Args, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;
