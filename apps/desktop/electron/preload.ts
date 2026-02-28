import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

export interface NorotPreloadApi {
  invoke: <TResult = unknown>(channel: string, payload?: unknown) => Promise<TResult>
  send: (channel: string, payload?: unknown) => void
  on: (channel: string, listener: (payload: unknown) => void) => () => void
}

const norot: NorotPreloadApi = {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  send: (channel, payload) => ipcRenderer.send(channel, payload),
  on: (channel, listener) => {
    const wrapped = (_event: IpcRendererEvent, payload: unknown) => listener(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
}

contextBridge.exposeInMainWorld('norot', norot)

