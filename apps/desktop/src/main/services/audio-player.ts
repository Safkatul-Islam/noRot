import { BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'

/**
 * Sends an audio buffer to the renderer process for playback.
 * Converts the buffer to base64 and sends it via the 'play-audio' IPC channel.
 */
export function playAudioInRenderer(mainWindow: BrowserWindow, audioBuffer: Buffer): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('[audio-player] Main window not available, cannot play audio')
    return
  }

  try {
    const base64Audio = audioBuffer.toString('base64')
    mainWindow.webContents.send('play-audio', base64Audio)
    console.log('[audio-player] Sent audio to renderer for playback')
  } catch (err) {
    console.error('[audio-player] Failed to send audio to renderer:', err)
  }
}

/**
 * Reads an audio file from disk and sends it to the renderer for playback.
 */
export async function playAudioFile(mainWindow: BrowserWindow, filePath: string): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('[audio-player] Main window not available, cannot play audio')
    return
  }

  try {
    const fileBuffer = await readFile(filePath)
    const base64Audio = fileBuffer.toString('base64')
    mainWindow.webContents.send('play-audio', base64Audio)
    console.log(`[audio-player] Sent audio file to renderer: ${filePath}`)
  } catch (err) {
    console.error(`[audio-player] Failed to read/send audio file ${filePath}:`, err)
  }
}
