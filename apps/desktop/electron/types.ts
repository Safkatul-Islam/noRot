export { IPC_CHANNELS } from '../src/ipc-channels'
import { IPC_CHANNELS } from '../src/ipc-channels'

type ValueOf<T> = T[keyof T]
type DeepValueOf<T> = T extends string ? T : T extends Record<string, unknown> ? DeepValueOf<ValueOf<T>> : never

export type IpcChannel = DeepValueOf<typeof IPC_CHANNELS>
