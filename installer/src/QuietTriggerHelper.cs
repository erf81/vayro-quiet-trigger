// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

// VAYRO — Quiet Trigger 2.1.0
// Native Silent Windows Background Helper, Local Bridge Supervisor, Global Hotkey & System Tray
// Zero console windows, single-instance Mutex, per-user startup compatible.

using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Quiet Trigger Helper")]
[assembly: AssemblyDescription("Quiet Trigger by VAYRO — Background Helper & Global Hotkey Service")]
[assembly: AssemblyCompany("VAYRO")]
[assembly: AssemblyProduct("Quiet Trigger by VAYRO")]
[assembly: AssemblyVersion("2.1.0.0")]
[assembly: AssemblyFileVersion("2.1.0.0")]

namespace Vayro.QuietTrigger
{
    internal static class NativeMethods
    {
        public const int WM_HOTKEY = 0x0312;
        public const uint MOD_ALT = 0x0001;
        public const uint MOD_CONTROL = 0x0002;
        public const uint MOD_SHIFT = 0x0004;
        public const uint MOD_NOREPEAT = 0x4000;
        public const uint VK_SPACE = 0x20;

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    }

    internal sealed class HelperConfig
    {
        public string Hotkey = "Ctrl+Alt+Space";
        public bool Paused = false;

        public static string DataDir
        {
            get
            {
                string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string dir = Path.Combine(local, "VAYRO", "Quiet Trigger");
                Directory.CreateDirectory(dir);
                return dir;
            }
        }

        public static string ConfigPath { get { return Path.Combine(DataDir, "helper-settings.json"); } }

        public static HelperConfig Load()
        {
            var cfg = new HelperConfig();
            try
            {
                if (File.Exists(ConfigPath))
                {
                    string json = File.ReadAllText(ConfigPath, Encoding.UTF8);
                    Match mHk = Regex.Match(json, "\"hotkey\"\\s*:\\s*\"([^\"]+)\"");
                    if (mHk.Success)
                    {
                        string v = mHk.Groups[1].Value;
                        if (v == "Ctrl+Alt+Space" || v == "Ctrl+Shift+Space" || v == "Ctrl+Space")
                            cfg.Hotkey = v;
                    }
                    Match mP = Regex.Match(json, "\"paused\"\\s*:\\s*(true|false)");
                    if (mP.Success) cfg.Paused = (mP.Groups[1].Value == "true");
                }
            }
            catch { }
            return cfg;
        }

        public void Save()
        {
            try
            {
                string json = "{\r\n" +
                    "  \"hotkey\": \"" + Hotkey + "\",\r\n" +
                    "  \"paused\": " + (Paused ? "true" : "false") + "\r\n" +
                    "}\r\n";
                string tmp = ConfigPath + ".tmp";
                File.WriteAllText(tmp, json, new UTF8Encoding(false));
                if (File.Exists(ConfigPath)) File.Delete(ConfigPath);
                File.Move(tmp, ConfigPath);
            }
            catch { }
        }
    }

    internal static class StartupManager
    {
        private const string RunSubKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string ValueName = "VAYRO Quiet Trigger";

        public static bool IsAutoStartEnabled()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunSubKey, false))
                {
                    if (key == null) return false;
                    object val = key.GetValue(ValueName);
                    return val != null && !string.IsNullOrEmpty(val.ToString());
                }
            }
            catch { return false; }
        }

        public static void SetAutoStart(bool enable)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunSubKey, true))
                {
                    if (key == null) return;
                    if (enable)
                    {
                        string exe = Assembly.GetExecutingAssembly().Location;
                        key.SetValue(ValueName, "\"" + exe + "\" --startup");
                    }
                    else
                    {
                        if (key.GetValue(ValueName) != null)
                            key.DeleteValue(ValueName, false);
                    }
                }
            }
            catch { }
        }
    }

    internal sealed class SettingsDialog : Form
    {
        private readonly ComboBox _hotkeyCombo;
        private readonly Label _warningLabel;
        private readonly CheckBox _startupCheck;
        public string SelectedHotkey { get { return _hotkeyCombo.SelectedItem.ToString(); } }
        public bool SelectedAutoStart { get { return _startupCheck.Checked; } }

        public SettingsDialog(string currentHotkey, bool autoStart, bool bridgeRunning, Icon appIcon)
        {
            Text = "Quiet Trigger by VAYRO — Settings";
            Icon = appIcon;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(460, 355);
            BackColor = Color.FromArgb(17, 21, 34);
            ForeColor = Color.FromArgb(240, 244, 255);
            Font = new Font("Segoe UI", 9.5f);

            var lblTitle = new Label
            {
                Text = "QUIET TRIGGER — SETTINGS",
                Font = new Font("Segoe UI Semibold", 11.5f),
                ForeColor = Color.FromArgb(240, 244, 255),
                Location = new Point(22, 18),
                AutoSize = true
            };
            var lblSub = new Label
            {
                Text = "BY VAYRO  ·  Less searching. More creating.",
                Font = new Font("Segoe UI", 8.5f),
                ForeColor = Color.FromArgb(136, 150, 178),
                Location = new Point(22, 42),
                AutoSize = true
            };

            var lblHk = new Label
            {
                Text = "Global Photoshop Hotkey:",
                Location = new Point(22, 78),
                AutoSize = true
            };
            _hotkeyCombo = new ComboBox
            {
                DropDownStyle = ComboBoxStyle.DropDownList,
                Location = new Point(22, 102),
                Width = 414,
                BackColor = Color.FromArgb(27, 33, 51),
                ForeColor = Color.FromArgb(240, 244, 255),
                FlatStyle = FlatStyle.Flat
            };
            _hotkeyCombo.Items.AddRange(new object[] { "Ctrl+Alt+Space", "Ctrl+Shift+Space", "Ctrl+Space" });
            int idx = _hotkeyCombo.Items.IndexOf(currentHotkey);
            _hotkeyCombo.SelectedIndex = idx >= 0 ? idx : 0;

            _warningLabel = new Label
            {
                Text = "Warning: Ctrl + Space overrides Photoshop's native temporary Zoom In shortcut while Quiet Trigger is active.",
                ForeColor = Color.FromArgb(255, 132, 102),
                Font = new Font("Segoe UI", 8.5f),
                Location = new Point(22, 134),
                Size = new Size(414, 34),
                Visible = (currentHotkey == "Ctrl+Space")
            };
            _hotkeyCombo.SelectedIndexChanged += (s, e) =>
            {
                _warningLabel.Visible = (_hotkeyCombo.SelectedItem.ToString() == "Ctrl+Space");
            };

            _startupCheck = new CheckBox
            {
                Text = "Start Quiet Trigger automatically when signing in to Windows",
                Checked = autoStart,
                Location = new Point(22, 176),
                AutoSize = true,
                ForeColor = Color.FromArgb(224, 232, 248)
            };

            var lblBridge = new Label
            {
                Text = "Local Bridge:  127.0.0.1:47821 (Loopback Only · " + (bridgeRunning ? "Running" : "Stopped") + ")",
                ForeColor = bridgeRunning ? Color.FromArgb(60, 209, 148) : Color.FromArgb(245, 185, 66),
                Font = new Font("Segoe UI", 9f),
                Location = new Point(22, 214),
                AutoSize = true
            };

            var lblAbout = new Label
            {
                Text = "Quiet Trigger by VAYRO  ·  Version 2.1.0\r\n98 Photoshop commands · VAYRO Theme Studio · Authenticated Loopback IPC",
                ForeColor = Color.FromArgb(148, 162, 190),
                Font = new Font("Segoe UI", 8.5f),
                Location = new Point(22, 248),
                Size = new Size(414, 40)
            };

            var btnCancel = new Button
            {
                Text = "Cancel",
                DialogResult = DialogResult.Cancel,
                Location = new Point(260, 304),
                Size = new Size(84, 32),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(30, 36, 54),
                ForeColor = Color.FromArgb(220, 228, 244)
            };
            btnCancel.FlatAppearance.BorderColor = Color.FromArgb(56, 68, 102);

            var btnSave = new Button
            {
                Text = "Save",
                DialogResult = DialogResult.OK,
                Location = new Point(352, 304),
                Size = new Size(84, 32),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(78, 165, 255),
                ForeColor = Color.White
            };
            btnSave.FlatAppearance.BorderSize = 0;

            Controls.AddRange(new Control[]
            {
                lblTitle, lblSub, lblHk, _hotkeyCombo, _warningLabel,
                _startupCheck, lblBridge, lblAbout, btnCancel, btnSave
            });
            AcceptButton = btnSave;
            CancelButton = btnCancel;
        }
    }

    internal sealed class HelperHostForm : Form
    {
        private const int HOTKEY_ID = 0x5659; // 'VY'
        private readonly string _appDir;
        private readonly string _nodeExe;
        private readonly string _bridgeScript;
        private readonly string _paletteScript;
        private readonly Icon _trayIconAsset;
        private readonly NotifyIcon _tray;
        private readonly ToolStripMenuItem _miPause;
        private readonly ToolStripMenuItem _miResume;
        private readonly HelperConfig _config;
        private readonly EventWaitHandle _stopEvent;
        private readonly EventWaitHandle _openEvent;
        private readonly EventWaitHandle _studioEvent;
        private readonly EventWaitHandle _settingsEvent;

        private Process _bridgeProc;
        private Process _paletteProc;
        private volatile bool _exiting;
        private bool _hotkeyRegistered;

        public HelperHostForm(string appDir)
        {
            _appDir = appDir;
            _config = HelperConfig.Load();

            // Resolve bundled runtime & scripts (works both when installed and in dev workspace)
            _nodeExe = ResolveFirstExisting(
                Path.Combine(_appDir, "runtime", "node.exe"),
                Path.Combine(_appDir, "node.exe"),
                @"C:\Program Files\nodejs\node.exe"
            );
            _bridgeScript = ResolveFirstExisting(
                Path.Combine(_appDir, "bridge", "bridge-server.js"),
                Path.Combine(_appDir, "hotkey-helper", "bridge-server.js"),
                Path.GetFullPath(Path.Combine(_appDir, "..", "..", "hotkey-helper", "bridge-server.js"))
            );
            _paletteScript = ResolveFirstExisting(
                Path.Combine(_appDir, "palette", "zau-palette.ps1"),
                Path.Combine(_appDir, "hotkey-helper", "zau-palette.ps1"),
                Path.GetFullPath(Path.Combine(_appDir, "..", "..", "hotkey-helper", "zau-palette.ps1"))
            );

            string icoPath = ResolveFirstExisting(
                Path.Combine(_appDir, "assets", "brand", "quiet-trigger.ico"),
                Path.Combine(_appDir, "quiet-trigger.ico"),
                Path.GetFullPath(Path.Combine(_appDir, "..", "..", "assets", "brand", "quiet-trigger.ico"))
            );
            _trayIconAsset = File.Exists(icoPath)
                ? new Icon(icoPath)
                : Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);

            // Hidden host window (never shown on screen or taskbar)
            ShowInTaskbar = false;
            WindowState = FormWindowState.Minimized;
            FormBorderStyle = FormBorderStyle.None;
            Opacity = 0;
            Size = new Size(0, 0);

            // Build native System Tray context menu (all 8 required items)
            var menu = new ContextMenuStrip();
            var miOpen = new ToolStripMenuItem("Open Quiet Trigger", null, (s, e) => LaunchPalette("-Once"));
            miOpen.Font = new Font(miOpen.Font, FontStyle.Bold);
            var miStudio = new ToolStripMenuItem("Theme Studio", null, (s, e) => LaunchPalette("-Once -OpenStudio"));
            var miSettings = new ToolStripMenuItem("Settings", null, (s, e) => OpenSettingsDialog());
            _miPause = new ToolStripMenuItem("Pause Hotkey", null, (s, e) => SetPaused(true));
            _miResume = new ToolStripMenuItem("Resume Hotkey", null, (s, e) => SetPaused(false));
            var miStartPs = new ToolStripMenuItem("Start Photoshop", null, (s, e) => LaunchPhotoshop());
            var miUpdates = new ToolStripMenuItem("Check for Updates", null, (s, e) => CheckForUpdates());
            var miExit = new ToolStripMenuItem("Exit Quiet Trigger", null, (s, e) => ShutdownCleanly());

            menu.Items.Add(miOpen);
            menu.Items.Add(miStudio);
            menu.Items.Add(miSettings);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(_miPause);
            menu.Items.Add(_miResume);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(miStartPs);
            menu.Items.Add(miUpdates);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(miExit);

            _tray = new NotifyIcon
            {
                Icon = _trayIconAsset,
                ContextMenuStrip = menu,
                Visible = true,
                Text = "Quiet Trigger by VAYRO"
            };
            _tray.DoubleClick += (s, e) => LaunchPalette("-Once");

            // IPC wait handles for graceful stop / open from Start Menu / installer / uninstaller
            _stopEvent = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\VAYRO_QuietTrigger_StopEvent");
            _openEvent = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\VAYRO_QuietTrigger_OpenEvent");
            _studioEvent = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\VAYRO_QuietTrigger_StudioEvent");
            _settingsEvent = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\VAYRO_QuietTrigger_SettingsEvent");

            StartSignalListener();
        }

        private static string ResolveFirstExisting(params string[] paths)
        {
            foreach (string p in paths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }
            return paths.Length > 0 ? paths[0] : "";
        }

        protected override void SetVisibleCore(bool value)
        {
            if (!IsHandleCreated)
            {
                CreateHandle();
            }
            base.SetVisibleCore(false);
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            StartBridgeSupervisor();
            ApplyHotkeyRegistration();
            UpdateTrayMenuState();
        }

        private void StartSignalListener()
        {
            var t = new Thread(() =>
            {
                var handles = new WaitHandle[] { _stopEvent, _openEvent, _studioEvent, _settingsEvent };
                while (!_exiting)
                {
                    int signaled = WaitHandle.WaitAny(handles, 1000);
                    if (_exiting) break;
                    if (signaled == 0)
                    {
                        BeginInvoke((Action)(() => ShutdownCleanly()));
                        break;
                    }
                    else if (signaled == 1)
                    {
                        BeginInvoke((Action)(() => LaunchPalette("-Once")));
                    }
                    else if (signaled == 2)
                    {
                        BeginInvoke((Action)(() => LaunchPalette("-Once -OpenStudio")));
                    }
                    else if (signaled == 3)
                    {
                        BeginInvoke((Action)(() => OpenSettingsDialog()));
                    }
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        private void StartBridgeSupervisor()
        {
            var t = new Thread(() =>
            {
                int backoffMs = 1000;
                while (!_exiting)
                {
                    try
                    {
                        if (!File.Exists(_nodeExe) || !File.Exists(_bridgeScript))
                        {
                            Thread.Sleep(5000);
                            continue;
                        }

                        var psi = new ProcessStartInfo
                        {
                            FileName = _nodeExe,
                            Arguments = "\"" + _bridgeScript + "\" --silent",
                            WorkingDirectory = Path.GetDirectoryName(_bridgeScript),
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            WindowStyle = ProcessWindowStyle.Hidden
                        };
                        _bridgeProc = Process.Start(psi);
                        if (_bridgeProc != null)
                        {
                            backoffMs = 1000;
                            _bridgeProc.WaitForExit();
                        }
                    }
                    catch { }

                    if (_exiting) break;
                    Thread.Sleep(backoffMs);
                    backoffMs = Math.Min(backoffMs * 2, 10000);
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        private bool IsBridgeRunning()
        {
            try { return _bridgeProc != null && !_bridgeProc.HasExited; }
            catch { return false; }
        }

        private void ApplyHotkeyRegistration()
        {
            if (_hotkeyRegistered)
            {
                NativeMethods.UnregisterHotKey(Handle, HOTKEY_ID);
                _hotkeyRegistered = false;
            }
            if (_config.Paused) return;

            uint mods = NativeMethods.MOD_CONTROL | NativeMethods.MOD_ALT | NativeMethods.MOD_NOREPEAT;
            if (_config.Hotkey == "Ctrl+Space")
                mods = NativeMethods.MOD_CONTROL | NativeMethods.MOD_NOREPEAT;
            else if (_config.Hotkey == "Ctrl+Shift+Space")
                mods = NativeMethods.MOD_CONTROL | NativeMethods.MOD_SHIFT | NativeMethods.MOD_NOREPEAT;

            _hotkeyRegistered = NativeMethods.RegisterHotKey(Handle, HOTKEY_ID, mods, NativeMethods.VK_SPACE);
        }

        private void SetPaused(bool paused)
        {
            _config.Paused = paused;
            _config.Save();
            ApplyHotkeyRegistration();
            UpdateTrayMenuState();
        }

        private void UpdateTrayMenuState()
        {
            _miPause.Enabled = !_config.Paused;
            _miPause.Checked = _config.Paused;
            _miResume.Enabled = _config.Paused;
            _miResume.Checked = !_config.Paused;

            string status = _config.Paused
                ? "Quiet Trigger by VAYRO — Paused"
                : "Quiet Trigger by VAYRO (" + _config.Hotkey + ")";
            // NotifyIcon.Text max length is 63 chars
            _tray.Text = status.Length > 63 ? status.Substring(0, 63) : status;
        }

        private static bool IsPhotoshopForeground()
        {
            try
            {
                IntPtr hwnd = NativeMethods.GetForegroundWindow();
                if (hwnd == IntPtr.Zero) return false;
                uint pid;
                NativeMethods.GetWindowThreadProcessId(hwnd, out pid);
                if (pid == 0) return false;
                using (Process p = Process.GetProcessById((int)pid))
                {
                    return string.Equals(p.ProcessName, "Photoshop", StringComparison.OrdinalIgnoreCase);
                }
            }
            catch { return false; }
        }

        private void LaunchPalette(string extraArgs)
        {
            try
            {
                // Avoid stacking multiple floating palette instances
                if (_paletteProc != null && !_paletteProc.HasExited)
                    return;

                if (!File.Exists(_paletteScript)) return;

                string psExe = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.System),
                    @"WindowsPowerShell\v1.0\powershell.exe"
                );
                var psi = new ProcessStartInfo
                {
                    FileName = File.Exists(psExe) ? psExe : "powershell.exe",
                    Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"" +
                                _paletteScript + "\" -Hotkey \"" + _config.Hotkey + "\" " + extraArgs,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                _paletteProc = Process.Start(psi);
            }
            catch { }
        }

        private void OpenSettingsDialog()
        {
            using (var dlg = new SettingsDialog(_config.Hotkey, StartupManager.IsAutoStartEnabled(), IsBridgeRunning(), _trayIconAsset))
            {
                if (dlg.ShowDialog() == DialogResult.OK)
                {
                    _config.Hotkey = dlg.SelectedHotkey;
                    _config.Save();
                    StartupManager.SetAutoStart(dlg.SelectedAutoStart);
                    ApplyHotkeyRegistration();
                    UpdateTrayMenuState();
                }
            }
        }

        private static void LaunchPhotoshop()
        {
            try
            {
                string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                string adobeDir = Path.Combine(pf, "Adobe");
                string found = null;
                if (Directory.Exists(adobeDir))
                {
                    string[] dirs = Directory.GetDirectories(adobeDir, "Adobe Photoshop*");
                    Array.Sort(dirs);
                    Array.Reverse(dirs); // Prefer newest version (e.g. 2025)
                    foreach (string d in dirs)
                    {
                        string exe = Path.Combine(d, "Photoshop.exe");
                        if (File.Exists(exe)) { found = exe; break; }
                    }
                }
                if (found != null)
                {
                    Process.Start(new ProcessStartInfo { FileName = found, UseShellExecute = true });
                }
                else
                {
                    MessageBox.Show(
                        "Adobe Photoshop was not found in Program Files\\Adobe.\r\nPlease launch Photoshop manually.",
                        "Quiet Trigger by VAYRO",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }
            catch { }
        }

        private static void CheckForUpdates()
        {
            MessageBox.Show(
                "Quiet Trigger by VAYRO\r\nInstalled Version: 2.1.0\r\n\r\nQuiet Trigger runs 100% locally and never phones home automatically.\r\nCheck your VAYRO release channel for newer 2.x builds.",
                "Quiet Trigger — Version & Updates",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == NativeMethods.WM_HOTKEY && m.WParam.ToInt32() == HOTKEY_ID)
            {
                if (!_config.Paused && IsPhotoshopForeground())
                {
                    LaunchPalette("-Once");
                }
                return;
            }
            base.WndProc(ref m);
        }

        private void ShutdownCleanly()
        {
            if (_exiting) return;
            _exiting = true;

            try
            {
                if (_hotkeyRegistered)
                {
                    NativeMethods.UnregisterHotKey(Handle, HOTKEY_ID);
                    _hotkeyRegistered = false;
                }
            }
            catch { }

            try
            {
                if (_bridgeProc != null && !_bridgeProc.HasExited)
                {
                    _bridgeProc.Kill();
                    _bridgeProc.WaitForExit(2000);
                }
            }
            catch { }

            try
            {
                if (_paletteProc != null && !_paletteProc.HasExited)
                {
                    _paletteProc.Kill();
                }
            }
            catch { }

            try
            {
                _tray.Visible = false;
                _tray.Dispose();
            }
            catch { }

            Application.Exit();
        }
    }

    internal static class Program
    {
        private const string MutexName = @"Local\VAYRO_QuietTrigger_Helper_v1";

        [STAThread]
        private static int Main(string[] args)
        {
            bool wantsStop = HasArg(args, "--stop");
            bool wantsOpen = HasArg(args, "--open");
            bool wantsStudio = HasArg(args, "--studio");
            bool wantsSettings = HasArg(args, "--settings");

            if (wantsStop)
            {
                SignalExisting(@"Local\VAYRO_QuietTrigger_StopEvent");
                // Give running helper up to 3s to release Mutex cleanly
                for (int i = 0; i < 30; i++)
                {
                    bool free;
                    using (var testMtx = new Mutex(true, MutexName, out free))
                    {
                        if (free) { testMtx.ReleaseMutex(); break; }
                    }
                    Thread.Sleep(100);
                }
                return 0;
            }

            bool createdNew;
            using (var mutex = new Mutex(true, MutexName, out createdNew))
            {
                if (!createdNew)
                {
                    if (wantsStudio) SignalExisting(@"Local\VAYRO_QuietTrigger_StudioEvent");
                    else if (wantsSettings) SignalExisting(@"Local\VAYRO_QuietTrigger_SettingsEvent");
                    else if (wantsOpen || args.Length == 0) SignalExisting(@"Local\VAYRO_QuietTrigger_OpenEvent");
                    return 0;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                string appDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                using (var host = new HelperHostForm(appDir))
                {
                    if (wantsOpen)
                    {
                        host.Shown += (s, e) => { };
                        SignalExisting(@"Local\VAYRO_QuietTrigger_OpenEvent");
                    }
                    else if (wantsStudio)
                    {
                        SignalExisting(@"Local\VAYRO_QuietTrigger_StudioEvent");
                    }
                    else if (wantsSettings)
                    {
                        SignalExisting(@"Local\VAYRO_QuietTrigger_SettingsEvent");
                    }
                    Application.Run(host);
                }

                try { mutex.ReleaseMutex(); } catch { }
            }
            return 0;
        }

        private static bool HasArg(string[] args, string flag)
        {
            foreach (string a in args)
            {
                if (string.Equals(a, flag, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static void SignalExisting(string eventName)
        {
            try
            {
                using (var ev = EventWaitHandle.OpenExisting(eventName))
                {
                    ev.Set();
                }
            }
            catch { }
        }
    }
}
