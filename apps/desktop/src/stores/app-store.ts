import { create } from 'zustand';

type Page = 'dashboard' | 'apps' | 'settings' | 'history';
type ConnectionStatus = 'connected' | 'disconnected';

interface AppState {
  activePage: Page;
  telemetryActive: boolean;
  connectionStatus: ConnectionStatus;
  appFocused: boolean;
  activityStatus: null | {
    appName: string;
    activeDomain?: string;
    activeCategory: 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown';
    activityLabel?: string;
    activitySource?: 'rules' | 'vision';
    visionStatus?: 'disabled' | 'idle' | 'classifying' | 'classified';
    visionMessage?: string;
    visionNextScanInSec?: number | null;
    updatedAt: number;
  };
  setActivePage: (page: Page) => void;
  setTelemetryActive: (active: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAppFocused: (focused: boolean) => void;
  setActivityStatus: (data: {
    appName: string;
    activeDomain?: string;
    activeCategory: 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown';
    activityLabel?: string;
    activitySource?: 'rules' | 'vision';
    visionStatus?: 'disabled' | 'idle' | 'classifying' | 'classified';
    visionMessage?: string;
    visionNextScanInSec?: number | null;
  }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'dashboard',
  telemetryActive: false,
  connectionStatus: 'disconnected',
  appFocused: true,
  activityStatus: null,
  setActivePage: (page) => set({ activePage: page }),
  setTelemetryActive: (active) => set({ telemetryActive: active }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setAppFocused: (focused) => set({ appFocused: focused }),
  setActivityStatus: (data) => set({ activityStatus: { ...data, updatedAt: Date.now() } }),
}));
