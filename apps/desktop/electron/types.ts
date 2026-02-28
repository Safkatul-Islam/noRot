export const IPC_CHANNELS = {
  window: {
    shown: 'window:shown',
    focusChanged: 'app:focus-changed'
  },
  telemetry: {
    start: 'telemetry:start',
    stop: 'telemetry:stop',
    isActive: 'telemetry:is-active'
  },
  scores: {
    getLatest: 'scores:get-latest',
    getUsageHistory: 'scores:get-usage-history',
    getAppStats: 'scores:get-app-stats',
    getWins: 'wins:get'
  },
  interventions: {
    respond: 'intervention:respond',
    testIntervention: 'intervention:test',
    reportAudioPlayed: 'intervention:audio-played',
    onIntervention: 'event:intervention',
    onPlayAudio: 'event:play-audio',
    onScoreUpdate: 'event:score-update',
    onLiveScoreUpdate: 'event:live-score-update'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update'
  },
  permissions: {
    getStatus: 'permissions:get-status',
    request: 'permissions:request'
  },
  chat: {
    stream: 'chat:stream',
    onToken: 'event:chat-token',
    onDone: 'event:chat-done',
    onError: 'event:chat-error'
  },
  todos: {
    list: 'todos:list',
    create: 'todos:create',
    update: 'todos:update',
    delete: 'todos:delete',
    extract: 'todos:extract',
    onUpdated: 'event:todos-updated'
  },
  todoOverlay: {
    open: 'todo-overlay:open',
    close: 'todo-overlay:close',
    isOpen: 'todo-overlay:is-open'
  },
  voice: {
    statusBroadcast: 'voice:status-broadcast',
    ensureVoiceAgent: 'voice:ensure-agent',
    ensureCheckinAgent: 'voice:ensure-checkin-agent',
    openVoiceChat: 'voice:chat-open',
    onVoiceChatOpen: 'event:voice-chat-open'
  },
  elevenlabs: {
    synthesizeTts: 'elevenlabs:tts'
  }
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS][keyof (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]]

