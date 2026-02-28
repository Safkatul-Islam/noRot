import { desktopCapturer, screen } from 'electron'

/**
 * Captures a screenshot of the primary display.
 * Returns the screenshot as a PNG buffer, or null on failure.
 */
export async function captureScreenshot(): Promise<Buffer | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    if (sources.length === 0) {
      console.warn('[screenshot] No screen sources found')
      return null
    }

    // Use the first screen source (primary display)
    const primarySource = sources[0]
    const thumbnail = primarySource.thumbnail

    if (thumbnail.isEmpty()) {
      console.warn('[screenshot] Screenshot thumbnail is empty')
      return null
    }

    const pngBuffer = thumbnail.toPNG()
    console.log(`[screenshot] Captured screenshot: ${pngBuffer.length} bytes (${width}x${height})`)
    return pngBuffer
  } catch (err) {
    console.error('[screenshot] Failed to capture screenshot:', err)
    return null
  }
}
