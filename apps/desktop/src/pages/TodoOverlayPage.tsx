import { useState, useEffect, useCallback } from 'react';
import { TodoItemList } from '@/components/TodoItemList';
import { VoiceOrb } from '@/components/VoiceOrb';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { useScoreStore } from '@/stores/score-store';
import type { TodoItem } from '@norot/shared';
import type { Severity } from '@norot/shared';

export function TodoOverlayPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [hasKey, setHasKey] = useState(false);

  const loadTodos = useCallback(async () => {
    try {
      const items = await getNorotAPI().getTodos();
      setTodos(items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // Make body transparent for Electron transparent window
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    loadTodos();
    const api = getNorotAPI();
    const unsubTodos = api.onTodosUpdated((updated) => setTodos(updated));

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
      unsubTodos();
      unsubVoice?.();
    };
  }, [loadTodos]);

  const handleToggle = async (id: string) => {
    try { await getNorotAPI().toggleTodo(id); } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try { await getNorotAPI().deleteTodo(id); } catch { /* ignore */ }
  };

  const handleAdd = async (text: string, app?: string, url?: string) => {
    try {
      const newTodo: TodoItem = {
        id: crypto.randomUUID(),
        text,
        done: false,
        order: todos.length,
        ...(app ? { app } : {}),
        ...(url ? { url } : {}),
      };
      await getNorotAPI().addTodo(newTodo);
    } catch { /* ignore */ }
  };

  const handleUpdate = async (id: string, fields: Partial<Omit<TodoItem, 'id'>>) => {
    try {
      await getNorotAPI().updateTodo(id, fields);
    } catch { /* ignore */ }
  };

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
            />
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
