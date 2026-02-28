interface ElectronAPI {
  getScore: () => Promise<{ score: number; severity: string; stats: Record<string, unknown> }>
  getActivities: () => Promise<unknown[]>
  getAppStats: () => Promise<unknown[]>
  getInterventions: () => Promise<unknown[]>
  getTodos: () => Promise<unknown[]>
  addTodo: (text: string) => Promise<unknown>
  toggleTodo: (id: number) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
  getWins: () => Promise<unknown[]>
  getSettings: () => Promise<Record<string, unknown>>
  updateSettings: (settings: Record<string, unknown>) => Promise<void>
  snooze: (minutes: number) => Promise<void>
  dismissIntervention: () => Promise<void>
  commitToWork: () => Promise<void>
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  onScoreUpdate: (callback: (score: number) => void) => () => void
  onIntervention: (callback: (data: unknown) => void) => () => void
  onPlayAudio: (callback: (base64: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
