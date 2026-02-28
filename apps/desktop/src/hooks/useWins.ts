import { useEffect, useState } from 'react'

import { IPC_CHANNELS } from '../ipc-channels'

export interface WinsData {
  refocusCount: number
  totalFocusedMinutes: number
}

export function useWins() {
  const [wins, setWins] = useState<WinsData | null>(null)

  useEffect(() => {
    let canceled = false

    const refresh = async () => {
      try {
        const next = await window.norot.invoke<WinsData>(IPC_CHANNELS.scores.getWins)
        if (!canceled) setWins(next)
      } catch {
        // ignore
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 15_000)

    return () => {
      canceled = true
      window.clearInterval(timer)
    }
  }, [])

  return wins
}

