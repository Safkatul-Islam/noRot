import { useState, useEffect } from 'react';
import { LayoutDashboard, AppWindow, Clock, Settings, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { useVoiceChatStore } from '@/stores/voice-chat-store';
import { VoiceOrb } from '@/components/VoiceOrb';
import { getNorotAPI } from '@/lib/norot-api';
import { LogoEasterEgg } from '@/components/LogoEasterEgg';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'apps' as const, label: 'Apps', icon: AppWindow },
  { id: 'history' as const, label: 'History', icon: Clock },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

interface SidebarProps {
  onToggleTodo?: () => void;
}

export function Sidebar({ onToggleTodo }: SidebarProps) {
  const { activePage, appFocused, setActivePage } = useAppStore();
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);

  // Re-check key whenever active page changes (e.g. user returns from Settings)
  useEffect(() => {
    getNorotAPI().getSettings().then((s) => {
      setHasElevenLabsKey(Boolean(s.elevenLabsApiKey));
    }).catch(() => {});
  }, [activePage]);

  const handleOrbClick = () => {
    if (hasElevenLabsKey) {
      useVoiceChatStore.getState().open();
    } else {
      toast('Add your ElevenLabs API key in Settings to chat with noRot');
    }
  };

  return (
    <aside className="flex h-full w-[200px] flex-col items-center py-4 gap-3">
      {/* Logo — floating circle with glitch hover */}
      <LogoEasterEgg />

      {/* Thin connecting line — ether shows between pills */}
      <div className="w-px h-3 bg-gradient-to-b from-transparent via-white/8 to-transparent" />

      {/* Navigation — individual floating pills */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'relative flex items-center gap-2.5 rounded-full transition-all duration-200',
                'backdrop-blur-[16px] backdrop-saturate-[1.3]',
                'border border-transparent',
                'w-full h-10 px-4 justify-start',
                isActive
                  ? 'bg-[var(--color-glass)] border-primary/40 text-primary'
                  : 'bg-[var(--color-glass-well)] text-text-secondary hover:text-text-primary hover:bg-[var(--color-glass)] hover:border-white/[0.06]'
              )}
              style={isActive ? {
                boxShadow: `0 0 16px -4px var(--color-glow-primary), inset 0 1px 0 rgba(255,255,255,0.06)`,
              } : undefined}
            >
              {/* Shared layout indicator — accent dot behind active icon */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-full bg-primary/10 border border-primary/20"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="size-[18px] shrink-0 relative z-10" />
              <span className="text-sm font-medium relative z-10 whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            </motion.button>
          );
        })}
        {/* Todo toggle — not a page, toggles the side panel */}
        {onToggleTodo && (
          <motion.button
            onClick={onToggleTodo}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'relative flex items-center gap-2.5 rounded-full transition-all duration-200',
              'backdrop-blur-[16px] backdrop-saturate-[1.3]',
              'border border-transparent',
              'w-full h-10 px-4 justify-start',
              'bg-[var(--color-glass-well)] text-text-secondary hover:text-text-primary hover:bg-[var(--color-glass)] hover:border-white/[0.06]'
            )}
          >
            <ListTodo className="size-[18px] shrink-0 relative z-10" />
            <span className="text-sm font-medium relative z-10 whitespace-nowrap overflow-hidden">
              Todo
            </span>
          </motion.button>
        )}
      </nav>

      {/* Thin connecting line */}
      <div className="w-px h-3 bg-gradient-to-b from-transparent via-white/8 to-transparent" />

      {/* Sidebar VoiceOrb */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="shrink-0 self-center cursor-pointer"
            style={{
              width: 160,
              height: 160,
              opacity: appFocused ? 1 : 0,
              transition: 'opacity 0.15s',
            }}
            onClick={handleOrbClick}
          >
            <VoiceOrb paused={!appFocused} detail={10} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={-12}>
          {hasElevenLabsKey
            ? 'Click to talk to noRot'
            : 'Add your ElevenLabs API key in Settings to chat with noRot'}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
