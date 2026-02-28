export interface NorotPreloadApi {
  invoke: <TResult = unknown>(channel: string, payload?: unknown) => Promise<TResult>
  send: (channel: string, payload?: unknown) => void
  on: (channel: string, listener: (payload: unknown) => void) => () => void
}

declare global {
  interface Window {
    norot: NorotPreloadApi
  }
}

