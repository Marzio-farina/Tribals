const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipc', {
    send: (channel, data) => ipcRenderer.send(channel, data)
});