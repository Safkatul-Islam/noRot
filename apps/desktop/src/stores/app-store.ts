import { create } from 'zustand';

type Page = 'dashboard' | 'apps' | 'settings' | 'history';
type ConnectionStatus = 'connected' | 'disconnected';

interface AppState {
  activePage: Page;
  telemetryActive: boolean;
  connectionStatus: ConnectionStatus;
  appFocused: boolean;
  setActivePage: (page: Page) => void;
  setTelemetryActive: (active: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAppFocused: (focused: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'dashboard',
  telemetryActive: false,
  connectionStatus: 'disconnected',
  appFocused: true,
  setActivePage: (page) => set({ activePage: page }),
  setTelemetryActive: (active) => set({ telemetryActive: active }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setAppFocused: (focused) => set({ appFocused: focused }),
}));
