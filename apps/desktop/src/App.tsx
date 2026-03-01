import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AppsPage } from '@/pages/AppsPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { DailySetupPage } from '@/pages/DailySetupPage';
import { ContinuePromptPage } from '@/pages/ContinuePromptPage';
import { TodoOverlayPage } from '@/pages/TodoOverlayPage';
import { CommandPalette } from '@/components/CommandPalette';
import { InterventionDialog } from '@/components/InterventionDialog';
import { VoiceChatDialog } from '@/components/VoiceChatDialog';
import { useScore } from '@/hooks/useScore';
import { useInterventions } from '@/hooks/useInterventions';
import { useVoice } from '@/hooks/useVoice';
import { useSettings } from '@/hooks/useSettings';
import { useStartupFlow } from '@/hooks/useStartupFlow';
import { useAppStore } from '@/stores/app-store';
import { useVoiceChatStore, selectShowProposedPanel } from '@/stores/voice-chat-store';
import { ProposedTasksPanel } from '@/components/ProposedTasksPanel';
import { getNorotAPI } from '@/lib/norot-api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppContent() {
  // Mount hooks to start subscriptions
  useScore();
  useVoice();
  const { interventions, activeIntervention, respondToIntervention } = useInterventions();
  const activePage = useAppStore((s) => s.activePage);
  const setTelemetryActive = useAppStore((s) => s.setTelemetryActive);

  // Sync telemetry active state from main process on mount
  useEffect(() => {
    getNorotAPI().isTelemetryActive()
      .then((active) => setTelemetryActive(active))
      .catch(() => {});
  }, [setTelemetryActive]);

  // Listen for voice chat open requests from overlay orb
  useEffect(() => {
    const unsub = getNorotAPI().onVoiceChatOpen?.(() => {
      useVoiceChatStore.getState().open();
    });
    return () => { unsub?.(); };
  }, []);

  // === DIAGNOSTIC: log DOM state when window is shown again ===
  useEffect(() => {
    if (!window.norot?.onWindowShown) return;

    const unsub = window.norot.onWindowShown(() => {
      const motionDiv = document.querySelector('.flex-1.flex.flex-col.min-h-0');
      const computedStyle = motionDiv ? getComputedStyle(motionDiv) : null;

      const canvas = document.querySelector('canvas');
      const canvasStyle = canvas ? getComputedStyle(canvas) : null;

      const contentDiv = document.querySelector('.relative.z-10');
      const contentStyle = contentDiv ? getComputedStyle(contentDiv) : null;

      console.log('[App] window:shown diagnostic', {
        motionDivOpacity: computedStyle?.opacity,
        motionDivFilter: computedStyle?.filter,
        motionDivDisplay: computedStyle?.display,
        motionDivVisibility: computedStyle?.visibility,
        canvasDisplay: canvasStyle?.display,
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
        contentDivOpacity: contentStyle?.opacity,
        contentDivDisplay: contentStyle?.display,
        activePage,
        documentHidden: document.hidden,
      });
    });

    return unsub;
  }, [activePage]);

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          className="flex-1 flex flex-col min-h-0"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.25 }}
        >
          {activePage === 'dashboard' && (
            <DashboardPage
              interventions={interventions}
              activeIntervention={activeIntervention}
              onRespond={respondToIntervention}
            />
          )}
          {activePage === 'apps' && <AppsPage />}
          {activePage === 'history' && <HistoryPage />}
          {activePage === 'settings' && <SettingsPage />}
        </motion.div>
      </AnimatePresence>
      <CommandPalette />
      <InterventionDialog
        intervention={activeIntervention}
        onRespond={respondToIntervention}
      />
      <VoiceChatDialog />
    </DashboardLayout>
  );
}

// Check if this window is the todo overlay pop-out
const isTodoOverlay =
  typeof window !== 'undefined' &&
  (window.location.hash === '#todo-overlay' || window.location.hash === '#/todo-overlay');

function App() {
  const { completeOnboarding, completeDailySetup, continueSession } = useSettings();
  const { screen, goToDailySetup, goToDashboard } = useStartupFlow();
  const showProposed = useVoiceChatStore(selectShowProposedPanel);
  const voiceChatOpen = useVoiceChatStore((s) => s.isOpen);

  // Close todo overlay when navigating away from dashboard
  useEffect(() => {
    if (!isTodoOverlay && screen !== 'dashboard' && screen !== 'loading') {
      getNorotAPI().closeTodoOverlay().catch(() => {});
    }
  }, [screen]);

  // Todo overlay gets its own minimal page — no DashboardLayout, no LiquidEther
  if (isTodoOverlay) {
    return (
      <ThemeProvider>
        <TooltipProvider>
          <TodoOverlayPage />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  // Welcome page: mark onboarding complete, then go to daily setup
  const handleWelcomeComplete = useCallback(async () => {
    await completeOnboarding();
    goToDailySetup();
  }, [completeOnboarding, goToDailySetup]);

  // Daily setup: mark date, start telemetry, go to dashboard
  const handleDailySetupComplete = useCallback(async () => {
    await completeDailySetup();
    goToDashboard();
  }, [completeDailySetup, goToDashboard]);

  // Skip daily setup: mark complete, go straight to dashboard
  const handleDailySetupSkip = useCallback(async () => {
    try {
      await completeDailySetup();
    } catch (err) {
      console.error('[App] completeDailySetup failed on skip:', err);
    }
    goToDashboard();
  }, [completeDailySetup, goToDashboard]);

  // Continue prompt: just start telemetry and go
  const handleContinue = useCallback(async () => {
    await continueSession();
    goToDashboard();
  }, [continueSession, goToDashboard]);

  // Start fresh: clear todos, then go to daily setup
  const handleStartFresh = useCallback(async () => {
    try {
      await getNorotAPI().setTodos([]);
    } catch { /* ignore */ }
    goToDailySetup();
  }, [goToDailySetup]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgba(15, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                color: 'var(--color-text-primary)',
              },
            }}
          />
          <AnimatePresence mode="wait">
            {screen === 'loading' && (
              <motion.div
                key="loading"
                className="h-screen flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </motion.div>
            )}
            {screen === 'first-time-welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.3 }}
              >
                <WelcomePage onComplete={handleWelcomeComplete} />
              </motion.div>
            )}
            {screen === 'daily-setup' && (
              <motion.div
                key="daily-setup"
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.3 }}
              >
                <DailySetupPage onComplete={handleDailySetupComplete} onSkip={handleDailySetupSkip} />
              </motion.div>
            )}
            {screen === 'continue-prompt' && (
              <motion.div
                key="continue-prompt"
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.3 }}
              >
                <ContinuePromptPage
                  onContinue={handleContinue}
                  onStartFresh={handleStartFresh}
                />
              </motion.div>
            )}
            {screen === 'dashboard' && (
              <motion.div
                key="app"
                className="h-screen"
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.3 }}
              >
                <AppContent />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Proposed tasks panel — rendered outside motion wrappers to escape stacking context */}
          <ProposedTasksPanel open={voiceChatOpen && showProposed && screen === 'dashboard'} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
