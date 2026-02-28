import { useQuery } from '@tanstack/react-query'
import type { AppStats, Intervention, Win } from '@norot/shared'

export function useAppStats() {
  return useQuery<AppStats[]>({
    queryKey: ['app-stats'],
    queryFn: async () => {
      const stats = await window.electronAPI.getAppStats()
      return stats as AppStats[]
    },
  })
}

export function useInterventionHistory() {
  return useQuery<Intervention[]>({
    queryKey: ['interventions'],
    queryFn: async () => {
      const interventions = await window.electronAPI.getInterventions()
      return interventions as Intervention[]
    },
  })
}

export function useWins() {
  return useQuery<Win[]>({
    queryKey: ['wins'],
    queryFn: async () => {
      const wins = await window.electronAPI.getWins()
      return wins as Win[]
    },
  })
}
