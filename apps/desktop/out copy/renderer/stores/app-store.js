import { create } from 'zustand';
export const useAppStore = create((set) => ({
    activePage: 'dashboard',
    telemetryActive: false,
    connectionStatus: 'disconnected',
    appFocused: true,
    setActivePage: (page) => set({ activePage: page }),
    setTelemetryActive: (active) => set({ telemetryActive: active }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setAppFocused: (focused) => set({ appFocused: focused }),
}));
