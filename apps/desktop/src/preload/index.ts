import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  getScore: () => ipcRenderer.invoke('get-score'),
  getActivities: () => ipcRenderer.invoke('get-activities'),
  getAppStats: () => ipcRenderer.invoke('get-app-stats'),
  getInterventions: () => ipcRenderer.invoke('get-interventions'),
  getTodos: () => ipcRenderer.invoke('get-todos'),
  addTodo: (text: string) => ipcRenderer.invoke('add-todo', text),
  toggleTodo: (id: number) => ipcRenderer.invoke('toggle-todo', id),
  deleteTodo: (id: number) => ipcRenderer.invoke('delete-todo', id),
  getWins: () => ipcRenderer.invoke('get-wins'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('update-settings', settings),
  snooze: (minutes: number) => ipcRenderer.invoke('snooze', minutes),
  dismissIntervention: () => ipcRenderer.invoke('dismiss-intervention'),
  commitToWork: () => ipcRenderer.invoke('commit-to-work'),
  startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onScoreUpdate: (callback: (score: number) => void) => {
    const sub = (_event: Electron.IpcRendererEvent, score: number) => callback(score)
    ipcRenderer.on('score-update', sub)
    return () => ipcRenderer.removeListener('score-update', sub)
  },
  onIntervention: (callback: (data: unknown) => void) => {
    const sub = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('intervention', sub)
    return () => ipcRenderer.removeListener('intervention', sub)
  },
  onPlayAudio: (callback: (base64: string) => void) => {
    const sub = (_event: Electron.IpcRendererEvent, base64: string) => callback(base64)
    ipcRenderer.on('play-audio', sub)
    return () => ipcRenderer.removeListener('play-audio', sub)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
