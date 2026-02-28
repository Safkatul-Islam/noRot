export type TabId = 'dashboard' | 'apps' | 'history' | 'settings'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u25C9' },
  { id: 'apps', label: 'Apps', icon: '\uD83D\uDCCA' },
  { id: 'history', label: 'History', icon: '\uD83D\uDCC5' },
  { id: 'settings', label: 'Settings', icon: '\u2699' },
]

interface NavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="flex items-center justify-around h-14 bg-white/5 backdrop-blur-xl border-t border-white/10">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-lg
              transition-all duration-200 relative
              ${isActive
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
              }
            `}
          >
            {isActive && (
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#4ade80] rounded-full" />
            )}
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
