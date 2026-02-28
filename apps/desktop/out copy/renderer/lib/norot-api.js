import { mockNorotAPI } from '@/lib/mock-electron-api';
export function isElectron() {
    return typeof window !== 'undefined' && !!window.norot;
}
export function getNorotAPI() {
    if (isElectron()) {
        return window.norot;
    }
    return mockNorotAPI;
}
