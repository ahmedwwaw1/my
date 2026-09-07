/**
 * VSA Mastermind - Preload Bridge
 * --------------------------------------------------
 * يعمل كجسر أمني يمرر صلاحيات الويندوز إلى صفحة الويب بشكل آمن.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isDesktop: true,
    executeCommand: (command) => ipcRenderer.invoke('os-command', command),
    listLocalFiles: (path) => ipcRenderer.invoke('list-local-files', path)
});
