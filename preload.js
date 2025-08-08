const { contextBridge, ipcRenderer } = require('electron');

const yearArg = process.argv.find(arg => arg.startsWith('--simulatedYear='));
const simulatedYear = yearArg ? parseInt(yearArg.split('=')[1], 10) : 2009;

contextBridge.exposeInMainWorld('electron', {
  setSimulationTime: (data) => ipcRenderer.invoke('set-simulation-time', data),
  getSimTime: () => ipcRenderer.invoke('get-sim-time'),
  onTick: (callback) => ipcRenderer.on('tick', (_, time) => callback(time)),
  loadVideoList: () => ipcRenderer.invoke('load-video-list'),
  getVideoPath: (filename) => ipcRenderer.invoke('get-video-path', filename),
  removeFirstVideoAndUpdate: () => ipcRenderer.invoke('remove-played-video'),
  getImageSchedule: () => ipcRenderer.invoke('get-image-schedule'),
  getImagePath: (filename) => ipcRenderer.invoke('get-image-path', filename),
  getMessageSchedule: () => ipcRenderer.invoke('get-message-schedule'),
  getCachedDir: () => ipcRenderer.invoke('get-cached-dir'),
  getTickerData: () => ipcRenderer.invoke('get-ticker-data'),
  cache: (youtubeUrl) => ipcRenderer.invoke('cache-video', youtubeUrl),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveCachedMap: (mapObj) => ipcRenderer.invoke('save-cached-map', mapObj),
  launchStreamingWindow: (url, bounds) => ipcRenderer.invoke('launch-streaming-window', url, bounds),
  openExternalLink: (url) => ipcRenderer.send('open-external', url),
  relaunchApp: (data) => ipcRenderer.send('relaunch-app', data),
  

  // ✅ NEW: Listen for skip-time-scene event
  onSkipStartup: (callback) => ipcRenderer.on('skip-startup', (_, time) => callback(time)),
  onSetTimezone: (callback) => ipcRenderer.on('set-timezone', (_, tz) => callback(tz)),

  simulatedYear,
  getSimulatedYear: () => ipcRenderer.invoke('get-simulated-year'),
  getBgPreference: () => ipcRenderer.invoke('get-bg-preference'),
  getArchiveMode: () => ipcRenderer.invoke('get-archive-mode'),
  getSpeed: () => ipcRenderer.invoke('get-speed'),
  deleteCachedFile: (filename) => ipcRenderer.invoke('delete-cached-file', filename),
  saveSettings: (settingsObj) => ipcRenderer.invoke('save-settings', settingsObj),
  sendToMain: (channel, data) => ipcRenderer.send(channel, data)
});