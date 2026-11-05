const { app, BrowserWindow, ipcMain, Tray, Menu, shell, Notification, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTrayIcon } = require('./trayIcon.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let currentTrayStatus = {
  text: 'Status: Pending',
  status: 'default',
  commitsToday: 0,
};

const isDev = process.env.VITE_DEV === 'true';

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

// Single instance handling (do NOT quit if lock fails, just focus or proceed)
const gotTheLock = app.requestSingleInstanceLock();
if (gotTheLock) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    } else {
      createWindow();
    }
  });
}

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
  return nativeImage.createEmpty();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 570,
    minWidth: 360,
    minHeight: 520,
    maxWidth: 440,
    maxHeight: 650,
    center: true, // Center directly on screen on launch
    frame: false,
    resizable: false,
    maximizable: false,
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

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-hide-to-tray', () => {
  if (mainWindow) mainWindow.hide();
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

// App lifecycle
app.whenReady().then(() => {
  // On Windows, set AppUserModelId early so icon renders properly grouped on taskbar
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gitpulse.app');
  }

  createWindow();
  createTray();

  // Global keyboard shortcut: Ctrl+Shift+G (or Cmd+Shift+G on macOS) toggles window visibility
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      // Briefly force on top to ensure it surfaces above other windows
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  });

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
