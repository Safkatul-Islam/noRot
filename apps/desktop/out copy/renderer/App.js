import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            gcTime: 5 * 60 * 1000, // 5 minutes - explicit for long-running Electron app
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
            .catch(() => { });
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
        if (!window.norot?.onWindowShown)
            return;
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
    return (_jsxs(DashboardLayout, { children: [_jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { className: "flex-1 flex flex-col min-h-0", initial: { opacity: 0, filter: 'blur(8px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(8px)' }, transition: { duration: 0.25 }, children: [activePage === 'dashboard' && (_jsx(DashboardPage, { interventions: interventions, activeIntervention: activeIntervention, onRespond: respondToIntervention })), activePage === 'apps' && _jsx(AppsPage, {}), activePage === 'history' && _jsx(HistoryPage, {}), activePage === 'settings' && _jsx(SettingsPage, {})] }, activePage) }), _jsx(CommandPalette, {}), _jsx(InterventionDialog, { intervention: activeIntervention, onRespond: respondToIntervention }), _jsx(VoiceChatDialog, {})] }));
}
// Check if this window is the todo overlay pop-out
const isTodoOverlay = typeof window !== 'undefined' &&
    (window.location.hash === '#todo-overlay' || window.location.hash === '#/todo-overlay');
function App() {
    const { completeOnboarding, completeDailySetup, continueSession } = useSettings();
    const { screen, goToDailySetup, goToDashboard } = useStartupFlow();
    const showProposed = useVoiceChatStore(selectShowProposedPanel);
    const voiceChatOpen = useVoiceChatStore((s) => s.isOpen);
    // Close todo overlay when navigating away from dashboard
    useEffect(() => {
        if (!isTodoOverlay && screen !== 'dashboard' && screen !== 'loading') {
            getNorotAPI().closeTodoOverlay().catch(() => { });
        }
    }, [screen]);
    // Todo overlay gets its own minimal page — no DashboardLayout, no LiquidEther
    if (isTodoOverlay) {
        return (_jsx(ThemeProvider, { children: _jsx(TooltipProvider, { children: _jsx(TodoOverlayPage, {}) }) }));
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
        }
        catch (err) {
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
        }
        catch { /* ignore */ }
        goToDailySetup();
    }, [goToDailySetup]);
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ThemeProvider, { children: _jsxs(TooltipProvider, { children: [_jsx(Toaster, { theme: "dark", position: "bottom-right", toastOptions: {
                            style: {
                                background: 'rgba(15, 15, 25, 0.85)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                backdropFilter: 'blur(16px)',
                                color: 'var(--color-text-primary)',
                            },
                        } }), _jsxs(AnimatePresence, { mode: "wait", children: [screen === 'loading' && (_jsx(motion.div, { className: "h-screen flex items-center justify-center", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 }, children: _jsx("div", { className: "w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" }) }, "loading")), screen === 'first-time-welcome' && (_jsx(motion.div, { initial: { opacity: 0, filter: 'blur(6px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(6px)' }, transition: { duration: 0.3 }, children: _jsx(WelcomePage, { onComplete: handleWelcomeComplete }) }, "welcome")), screen === 'daily-setup' && (_jsx(motion.div, { initial: { opacity: 0, filter: 'blur(6px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(6px)' }, transition: { duration: 0.3 }, children: _jsx(DailySetupPage, { onComplete: handleDailySetupComplete, onSkip: handleDailySetupSkip }) }, "daily-setup")), screen === 'continue-prompt' && (_jsx(motion.div, { initial: { opacity: 0, filter: 'blur(6px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(6px)' }, transition: { duration: 0.3 }, children: _jsx(ContinuePromptPage, { onContinue: handleContinue, onStartFresh: handleStartFresh }) }, "continue-prompt")), screen === 'dashboard' && (_jsx(motion.div, { className: "h-screen", initial: { opacity: 0, filter: 'blur(6px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(6px)' }, transition: { duration: 0.3 }, children: _jsx(AppContent, {}) }, "app"))] }), _jsx(ProposedTasksPanel, { open: voiceChatOpen && showProposed && screen === 'dashboard' })] }) }) }));
}
export default App;
