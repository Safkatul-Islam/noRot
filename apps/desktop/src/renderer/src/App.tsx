import { useState, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { useSettingsStore } from './stores/settings-store'
import { useScoreStore } from './stores/score-store'
import { useInterventionStore } from './stores/intervention-store'

import Titlebar from './components/layout/Titlebar'
import Navigation, { type TabId } from './components/layout/Navigation'
import InterventionOverlay from './components/InterventionOverlay'
import TodoOverlay from './components/TodoOverlay'

import Dashboard from './pages/Dashboard'
import Apps from './pages/Apps'
import History from './pages/History'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'

function AppContent() {
  const { onboardingComplete, loaded, fetchSettings } = useSettingsStore()
  const { startPolling, stopPolling } = useScoreStore()
  const { initListener } = useInterventionStore()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Start score polling on mount
  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [startPolling, stopPolling])

  // Listen for interventions on mount
  useEffect(() => {
    const unsub = initListener()
    return unsub
  }, [initListener])

  // Show loading while settings load
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a1a]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#4ade80] rounded-full animate-spin" />
      </div>
    )
  }

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a1a] rounded-xl overflow-hidden border border-white/5">
        <Titlebar />
        <Onboarding />
      </div>
    )
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'apps':
        return <Apps />
      case 'history':
        return <History />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a1a] rounded-xl overflow-hidden border border-white/5">
      <Titlebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderPage()}
      </div>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overlays */}
      <InterventionOverlay />
      <TodoOverlay />
    </div>
  )
}

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
