import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'

function TodoOverlayPlaceholder() {
  return (
    <div className="p-6">
      <div className="text-sm text-white/70">Todo Overlay</div>
      <div className="mt-2 text-xl font-semibold">noRot</div>
    </div>
  )
}

function MainPlaceholder() {
  return (
    <div className="p-6">
      <div className="text-sm text-white/70">Dashboard</div>
      <div className="mt-2 text-2xl font-semibold">noRot</div>
      <div className="mt-4 text-white/70">
        Shared scoring + API are wired; desktop UI/electron orchestration in progress.
      </div>
    </div>
  )
}

export default function App() {
  const queryClient = useMemo(() => new QueryClient(), [])

  const isTodoOverlay = window.location.hash === '#todo-overlay'

  return (
    <QueryClientProvider client={queryClient}>
      {isTodoOverlay ? <TodoOverlayPlaceholder /> : <MainPlaceholder />}
    </QueryClientProvider>
  )
}

