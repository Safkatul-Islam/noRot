import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'

import { Shell } from './components/Shell'
import { IPC_CHANNELS } from './ipc-channels'
import { todayKey } from './lib/date'
import { ContinuePromptPage } from './pages/ContinuePromptPage'
import { DailySetupPage } from './pages/DailySetupPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodoOverlayPage } from './pages/TodoOverlayPage'
import { WelcomePage } from './pages/WelcomePage'
import { useSettingsStore } from './stores/settings-store'

function Loading() {
  return (
    <div className="min-h-screen p-10 text-sm text-white/70">
      Loading…
    </div>
  )
}

export default function App() {
  const queryClient = useMemo(() => new QueryClient(), [])
  const load = useSettingsStore(s => s.load)
  const update = useSettingsStore(s => s.update)
  const settings = useSettingsStore(s => s.settings)
  const loading = useSettingsStore(s => s.loading)
  const error = useSettingsStore(s => s.error)

  useEffect(() => {
    void load()
  }, [load])

  const isTodoOverlay = window.location.hash === '#todo-overlay'

  return (
    <QueryClientProvider client={queryClient}>
      {isTodoOverlay ? (
        <TodoOverlayPage />
      ) : loading || !settings ? (
        <Loading />
      ) : error ? (
        <div className="min-h-screen p-10 text-sm text-red-300">{error}</div>
      ) : !settings.onboardingComplete ? (
        <WelcomePage onContinue={() => void update({ onboardingComplete: true })} />
      ) : settings.dailySetupDate !== todayKey() ? (
        <DailySetupPage onComplete={() => {
          void (async () => {
            const res = await update({ dailySetupDate: todayKey() })
            if (res.ok) {
              await window.norot.invoke(IPC_CHANNELS.telemetry.start)
            }
          })()
        }}
        />
      ) : settings.monitoringEnabled === false ? (
        <ContinuePromptPage onContinue={() => {
          void (async () => {
            const res = await update({ monitoringEnabled: true })
            if (res.ok) {
              await window.norot.invoke(IPC_CHANNELS.telemetry.start)
            }
          })()
        }}
        />
      ) : (
        <HashRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </HashRouter>
      )}
    </QueryClientProvider>
  )
}
