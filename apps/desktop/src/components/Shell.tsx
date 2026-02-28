import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { IPC_CHANNELS } from '../ipc-channels'
import { VoiceChatDialog } from './VoiceChatDialog'

function NavLink(props: { to: string; label: string }) {
  const location = useLocation()
  const active = location.pathname === props.to
  return (
    <Link
      to={props.to}
      className={`rounded px-3 py-1 text-sm ${active ? 'bg-white/15' : 'hover:bg-white/10'}`}
    >
      {props.label}
    </Link>
  )
}

export function Shell() {
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const [voiceChatMode, setVoiceChatMode] = useState<'coach' | 'checkin'>('coach')

  useEffect(() => {
    const off = window.norot.on(IPC_CHANNELS.voice.onVoiceChatOpen, (payload) => {
      const mode = payload && typeof payload === 'object' ? (payload as { mode?: unknown }).mode : undefined
      if (mode === 'coach' || mode === 'checkin') {
        setVoiceChatMode(mode)
      }
      setVoiceChatOpen(true)
    })
    return () => off()
  }, [])

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-sm font-semibold">noRot</div>
        <div className="flex gap-2">
          <NavLink to="/" label="Dashboard" />
          <NavLink to="/settings" label="Settings" />
        </div>
      </div>
      <div className="p-6">
        <Outlet />
      </div>
      <VoiceChatDialog open={voiceChatOpen} mode={voiceChatMode} onClose={() => setVoiceChatOpen(false)} />
    </div>
  )
}
