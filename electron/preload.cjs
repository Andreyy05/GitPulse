const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  close: () => ipcRenderer.send('window-close'),
  hideToTray: () => ipcRenderer.send('window-hide-to-tray'),
  focusWindow: () => ipcRenderer.send('window-focus'),

  // Tray synchronization
  updateTrayStatus: (statusData) => ipcRenderer.send('update-tray-status', statusData),

  // Notifications
  sendNotification: (data) => ipcRenderer.send('show-notification', data),

  // External Links
  openExternal: (url) => ipcRenderer.send('open-external-url', url),

  // Startup & Login items
  getLoginItemSettings: () => ipcRenderer.invoke('get-login-item-settings'),
  setLoginItemSettings: (enabled) => ipcRenderer.invoke('set-login-item-settings', enabled),

  // Window theme & background synchronization
  setWindowTheme: (isDark) => ipcRenderer.send('set-window-theme', isDark),

  // GitHub contribution calendar scraping/fallback
  fetchGithubContributions: (username) => ipcRenderer.invoke('fetch-github-contributions', username),

  // System events listeners
  onRefreshRequested: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-refresh-requested', handler);
    return () => ipcRenderer.removeListener('tray-refresh-requested', handler);
  },
});
