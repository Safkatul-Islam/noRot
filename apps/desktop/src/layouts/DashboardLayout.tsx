import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { TodoPanel } from '@/components/TodoPanel';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [todoPanelOpen, setTodoPanelOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Title bar — draggable region for macOS traffic lights */}
      <div
        className="h-10 shrink-0 flex items-center border-b border-white/[0.04]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Spacer for traffic lights on macOS */}
        <div className="w-[80px] shrink-0" />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar onToggleTodo={() => setTodoPanelOpen((v) => !v)} />
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 overflow-y-auto pt-6 px-6 pb-12 flex flex-col min-h-0">
            {children}
          </main>
        </div>
        <TodoPanel open={todoPanelOpen} onToggle={() => setTodoPanelOpen(false)} />
      </div>

      {/* Floating status indicators */}
      <StatusBar />
    </div>
  );
}
