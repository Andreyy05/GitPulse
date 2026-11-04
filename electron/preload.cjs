const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  hideToTray: () => ipcRenderer.send('window-hide-to-tray'),
  focusWindow: () => ipcRenderer.send('window-focus'),

  // Tray synchronization
  updateTrayStatus: (statusData) => ipcRenderer.send('update-tray-status', statusData),

  // Notifications
  sendNotification: (data) => ipcRenderer.send('show-notification', data),

  // External Links
  openExternal: (url) => ipcRenderer.send('open-external-url', url),

  // System events listeners
  onRefreshRequested: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-refresh-requested', handler);
    return () => ipcRenderer.removeListener('tray-refresh-requested', handler);
  },
});
