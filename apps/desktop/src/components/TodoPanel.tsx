import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, PanelRightClose, ChevronDown } from 'lucide-react';
import { TodoItemList } from '@/components/TodoItemList';
import { CompletedTodoList } from '@/components/CompletedTodoList';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTodos } from '@/hooks/useTodos';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 600;

interface TodoPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function TodoPanel({ open, onToggle }: TodoPanelProps) {
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

  const [isOverlay, setIsOverlay] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Reset to push mode when panel re-opens
  useEffect(() => {
    if (open) {
      setIsOverlay(false);
      setPanelWidth(DEFAULT_WIDTH);
      setIsDragging(false);
    }
  }, [open]);

  const handlePopOut = async () => {
    try {
      await getNorotAPI().openTodoOverlay();
    } catch { /* ignore */ }
  };

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsOverlay(true);
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = panelWidth;
    dragRef.current = { startX, startWidth };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragRef.current.startWidth + delta));
      setPanelWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [panelWidth]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={
            isDragging
              ? { duration: 0 }
              : { type: 'spring', stiffness: 350, damping: 30 }
          }
          className={cn(
            'flex flex-col h-full overflow-hidden',
            'border-l border-white/[0.06]',
            'bg-[var(--color-glass)] backdrop-blur-[14px]',
            isOverlay
              ? 'absolute right-0 top-0 bottom-0 z-30'
              : 'shrink-0',
          )}
          style={{
            boxShadow: isOverlay
              ? '-8px 0 24px rgba(0,0,0,0.3), inset 1px 0 0 rgba(255,255,255,0.04)'
              : 'inset 1px 0 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Drag handle — left edge */}
          <div
            onPointerDown={handleDragStart}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10',
              'bg-white/[0.08] hover:bg-white/[0.20]',
              'transition-colors duration-150',
            )}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-text-primary">Todo</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePopOut}
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center',
                  'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]',
                  'transition-colors duration-200',
                )}
                title="Pop out as floating window"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <button
                onClick={onToggle}
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center',
                  'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]',
                  'transition-colors duration-200',
                )}
                title="Collapse panel"
              >
                <PanelRightClose className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable todo list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3">
              <TodoItemList
                todos={todos}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
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
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
