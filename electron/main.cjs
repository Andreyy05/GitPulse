delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, ipcMain, Tray, Menu, shell, Notification, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTrayIcon } = require('./trayIcon.cjs');

// Single Instance Lock check
if (app) {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gitpulse.app');
  }

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let currentTrayStatus = {
  text: 'Status: Pending',
  status: 'default',
  commitsToday: 0,
};

const isDev = process.env.VITE_DEV === 'true';

// Handle second-instance event
if (app) {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    } else {
      createWindow();
    }
  });
}

function resolveAssetPath(relativePath) {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', relativePath);
    if (fs.existsSync(unpacked)) return unpacked;
  }
  const local = path.join(__dirname, '..', relativePath);
  if (fs.existsSync(local)) return local;
  return path.join(__dirname, relativePath);
}

// Resolve application icons
const iconIcoPath = resolveAssetPath('assets/icon.ico');
const iconPngPath = resolveAssetPath('assets/icon.png');
const appIconPath = process.platform === 'win32'
  ? (fs.existsSync(iconIcoPath) ? iconIcoPath : iconPngPath)
  : iconPngPath;

// Prevent crashes from uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Main Process:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in Main Process at:', promise, 'reason:', reason);
});


function getAppTrayIcon() {
  try {
    const realPng = resolveAssetPath('assets/icon.png');
    if (fs.existsSync(realPng)) {
      return nativeImage.createFromPath(realPng).resize({ width: 16, height: 16 });
    }
    const realIco = resolveAssetPath('assets/icon.ico');
    if (fs.existsSync(realIco)) {
      return nativeImage.createFromPath(realIco).resize({ width: 16, height: 16 });
    }
  } catch (err) {
    console.warn('Could not load assets icon for tray:', err);
  }
  return createTrayIcon('default');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 570,
    minWidth: 340,
    minHeight: 480,
    maxWidth: 900,
    maxHeight: 1100,
    center: true, // Center directly on screen on launch
    frame: false,
    resizable: true,
    maximizable: true,
    fullscreenable: false,
    transparent: false,
    backgroundColor: '#090d16',
    show: true, // Immediate window visibility
    skipTaskbar: false, // Ensure permanently visible and clickable on the Windows taskbar
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173').catch((err) => {
      console.error('Dev server loadURL error:', err);
    });
  } else if (app.isPackaged || fs.existsSync(distHtmlPath)) {
    mainWindow.loadFile(distHtmlPath).catch((err) => {
      console.error('Failed to load dist file:', err);
    });
  } else {
    mainWindow.loadURL('http://127.0.0.1:5173').catch((err) => {
      console.error('Fallback loadURL error:', err);
    });
  }

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER LOG ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[RENDERER FAIL-LOAD] ${errorCode}: ${errorDescription} (${validatedURL})`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[RENDERER GONE]`, details);
  });

  // Ensure window is shown and focused immediately once DOM is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
  });

  // Handle close to minimize to tray instead of hard quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Prevent default window navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  try {
    const icon = getAppTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('GitPulse - GitHub Commit Streak Monitor');

    buildTrayMenu();

    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
      }
    });
  } catch (error) {
    console.error('Safe tray initialization failed:', error);
  }
}

function buildTrayMenu() {
  if (!tray) return;

  const statusLabel = currentTrayStatus.status === 'green'
    ? `🟢 Active: ${currentTrayStatus.commitsToday} commit(s) today`
    : currentTrayStatus.status === 'red'
      ? `🔴 Pending: 0 commits today`
      : `⚪ Checking GitHub activity...`;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'GitPulse',
      enabled: false,
    },
    {
      label: statusLabel,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open GitPulse',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.restore();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Refresh Activity Now',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-refresh-requested');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Always On Top',
      type: 'checkbox',
      checked: mainWindow ? mainWindow.isAlwaysOnTop() : false,
      click: (item) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(item.checked);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit GitPulse',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.on('window-focus', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-hide-to-tray', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('set-window-theme', (_, isDark) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(isDark ? '#09090b' : '#f4f5f7');
  }
});

ipcMain.on('update-tray-status', (_, { status, commitsToday, text }) => {
  currentTrayStatus = {
    status: status || 'default',
    commitsToday: commitsToday || 0,
    text: text || '',
  };

  if (tray) {
    try {
      const icon = getAppTrayIcon();
      tray.setImage(icon);
      tray.setToolTip(`GitPulse: ${currentTrayStatus.commitsToday} commits today (${status === 'green' ? 'Streak Active' : 'Pending'})`);
      buildTrayMenu();
    } catch (e) {
      console.warn('Tray update error:', e);
    }
  }
});

ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const icon = fs.existsSync(iconPngPath) ? iconPngPath : createTrayIcon(currentTrayStatus.status);
    const notification = new Notification({
      title: title || 'GitPulse',
      body: body || '',
      icon: icon,
    });
    // Interactive Notification Click: bring app to the front
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setAlwaysOnTop(false);
      }
    });
    notification.show();
  }
});

ipcMain.on('open-external-url', (_, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

// Startup & Login item settings
ipcMain.handle('get-login-item-settings', () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (err) {
    console.warn('Failed to get login item settings:', err);
    return false;
  }
});

ipcMain.handle('set-login-item-settings', (_, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
    });
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (err) {
    console.warn('Failed to set login item settings:', err);
    return false;
  }
});

// Fetch GitHub contributions HTML without CORS or CSP restrictions
ipcMain.handle('fetch-github-contributions', async (_, username) => {
  if (!username) return null;
  try {
    const url = `https://github.com/users/${encodeURIComponent(username.trim())}/contributions`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      console.warn(`[GitPulse Main] GitHub contributions response not ok: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn('[GitPulse Main] Error fetching contributions HTML:', err);
    return null;
  }
});

// App lifecycle
app.whenReady().then(() => {
  // On Windows, set AppUserModelId early so icon renders properly grouped on taskbar
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gitpulse.app');
  }

  createWindow();
  createTray();

  function toggleWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
    }
  }

  const shortcutKey = 'CommandOrControl+Shift+G';
  const success = globalShortcut.register(shortcutKey, () => {
    toggleWindow();
  });

  if (!success) {
    console.error(`[GitPulse] Failed to register global shortcut: ${shortcutKey}`);
  } else {
    console.log(`[GitPulse] Registered global shortcut: ${shortcutKey}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all global shortcuts before the app exits
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // If not quitting explicitly, keep alive in tray
    if (isQuitting) {
      app.quit();
    }
  }
});
