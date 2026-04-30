'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('td', {
  isElectron: true,
  notes: {
    list:           ()       => ipcRenderer.invoke('notes:list'),
    create:         (n)      => ipcRenderer.invoke('notes:create', n),
    update:         (n)      => ipcRenderer.invoke('notes:update', n),
    delete:         (id)     => ipcRenderer.invoke('notes:delete', id),
    bringToFront:   (id)     => ipcRenderer.invoke('notes:bringToFront', id),
  },
  tasks: {
    list:   ()    => ipcRenderer.invoke('tasks:list'),
    create: (t)   => ipcRenderer.invoke('tasks:create', t),
    update: (t)   => ipcRenderer.invoke('tasks:update', t),
    delete: (id)  => ipcRenderer.invoke('tasks:delete', id),
  },
  settings: {
    get: (k, fb) => ipcRenderer.invoke('settings:get', k, fb),
    set: (k, v)  => ipcRenderer.invoke('settings:set', k, v),
  },
  podium: {
    set: (on) => ipcRenderer.invoke('podium:set', on),
  },
  notify:    (msg)  => ipcRenderer.invoke('notify', msg),
  backup: {
    export:        () => ipcRenderer.invoke('backup:export'),
    import:        () => ipcRenderer.invoke('backup:import'),
    listAuto:      () => ipcRenderer.invoke('backup:listAuto'),
    restoreAuto:   (name) => ipcRenderer.invoke('backup:restoreAuto', name),
    openAutoFolder:() => ipcRenderer.invoke('backup:openAutoFolder'),
  },
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
  getVersion:     () => ipcRenderer.invoke('app:getVersion'),
});
