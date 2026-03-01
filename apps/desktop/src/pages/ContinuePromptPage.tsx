import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { TodoItemList } from '@/components/TodoItemList';
import { useTodos } from '@/hooks/useTodos';
import { ArrowRight, ListTodo, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContinuePromptPageProps {
  onContinue: () => void;
  onStartFresh: () => void;
}

export function ContinuePromptPage({
  onContinue,
  onStartFresh,
}: ContinuePromptPageProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { todos, handleToggle, handleDelete, handleAdd, handleUpdate } = useTodos();
  const hasTodos = todos.length > 0;
  const doneCount = todos.filter(t => t.done).length;

  return (
    <div className="flex flex-col h-screen">
      {/* Draggable title bar for macOS */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'w-full flex flex-col md:flex-row gap-4 items-stretch md:items-start justify-center',
          'max-w-2xl',
        )}
      >
        {/* Left: Welcome card */}
        <GlassCard className="px-0 flex-1 self-stretch md:self-center">
          <div className="flex flex-col items-center text-center gap-5 px-8 justify-center h-full">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Welcome back!
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              You already set up your tasks today.
            </p>

            <div className="flex flex-col gap-3 w-full mt-2">
              <Button
                size="lg"
                className="w-full justify-between"
                onClick={onContinue}
              >
                Continue where I left off
                <ArrowRight className="size-4" />
              </Button>

              <AnimatePresence mode="wait">
                {!showConfirm ? (
                  <motion.div
                    key="trigger"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-full justify-between text-text-muted hover:text-destructive"
                      onClick={() => setShowConfirm(true)}
                    >
                      Start completely fresh
                      <RotateCcw className="size-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-2"
                  >
                    <p className="text-xs text-destructive">
                      This will clear all your current tasks.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={onStartFresh}
                      >
                        Clear & start fresh
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>

        {/* Right: Editable task panel */}
        <GlassCard className="w-full md:w-[300px] shrink-0 p-0 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ListTodo className="size-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">
                {hasTodos ? 'Your tasks' : 'Plan your focus'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary/70">
              {hasTodos ? (
                <>
                  {doneCount}/{todos.length} completed &middot; edit or add below
                </>
              ) : (
                'Adding even one task helps noRot keep you on track'
              )}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
            <TodoItemList
              todos={todos}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              showAddInput={true}
            />
          </div>
        </GlassCard>
      </motion.div>
      </div>
    </div>
  );
}
