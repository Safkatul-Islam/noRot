import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { TodoItemList } from '@/components/TodoItemList';
import { CompletedTodoList } from '@/components/CompletedTodoList';
import { VoiceOrb } from '@/components/VoiceOrb';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useTodos } from '@/hooks/useTodos';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { useScoreStore } from '@/stores/score-store';
import type { Severity } from '@norot/shared';

export function TodoOverlayPage() {
  const {
    todos,
    completedTodos,
    completingIds,
    handleToggle,
    handleDelete,
    handleAdd,
    handleUpdate,
    handleRestore,
    handleDeleteCompleted,
  } = useTodos();

  const [hasKey, setHasKey] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    // Make body transparent for Electron transparent window
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    const api = getNorotAPI();

    // Check if ElevenLabs API key is configured
    api.hasElevenLabsKey?.().then(setHasKey).catch(() => {});

    // Listen for voice status broadcasts from main window
    const unsubVoice = api.onVoiceStatus?.((data: { isSpeaking: boolean; severity: number; amplitude: number; lastWordBoundaryAt: number }) => {
      useVoiceStatusStore.getState().setIsSpeaking(data.isSpeaking);
      useVoiceStatusStore.getState().setAmplitude(data.amplitude);
      useScoreStore.getState().setSeverity(data.severity as Severity);
      if (data.lastWordBoundaryAt > 0) {
        useVoiceStatusStore.setState({ lastWordBoundaryAt: data.lastWordBoundaryAt });
      }
    });

    return () => {
      unsubVoice?.();
    };
  }, []);

  const handleOrbClick = () => {
    if (hasKey) {
      getNorotAPI().openVoiceChat();
    }
  };

  return (
    <div className="dark">
      <div
        className={cn(
          'flex flex-col h-screen w-screen overflow-hidden',
          'bg-[rgba(9,9,11,0.85)] backdrop-blur-[20px] rounded-xl',
        )}
      >
        {/* Drag bar */}
        <div
          className="h-8 shrink-0 flex items-center px-3"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-xs font-medium text-text-secondary">Todo</span>
        </div>

        {/* Todo list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 pb-3">
            <TodoItemList
              todos={todos}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              enableAppDropdown={false}
              completingIds={completingIds}
            />

            {/* Recently Completed section */}
            {completedTodos.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={cn(
                    'flex items-center gap-1.5 w-full text-left',
                    'text-xs text-text-muted hover:text-text-secondary transition-colors',
                    'mb-2',
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'size-3 transition-transform duration-200',
                      !showCompleted && '-rotate-90',
                    )}
                  />
                  <span>Recently Completed ({completedTodos.length})</span>
                </button>

                <AnimatePresence>
                  {showCompleted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <CompletedTodoList
                        todos={completedTodos}
                        onRestore={handleRestore}
                        onDelete={handleDeleteCompleted}
                      />
                      <p className="text-[10px] text-text-muted mt-2 px-1">
                        Completed tasks are stored for 30 days
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Voice orb bottom bar */}
        <div className="shrink-0 h-[100px] flex items-center justify-center border-t border-white/[0.06] overflow-visible">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-[140px] h-[140px] -mt-[20px] cursor-pointer"
                onClick={handleOrbClick}
              >
                <VoiceOrb detail={10} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={-12}>
              {hasKey
                ? 'Click to talk to noRot'
                : 'Add your ElevenLabs API key in Settings to chat with noRot'}
            </TooltipContent>
          </Tooltip>
        </div>

      </div>
    </div>
  );
}
