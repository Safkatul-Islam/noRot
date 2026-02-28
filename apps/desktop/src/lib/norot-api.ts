import type { NoRotAPI } from '@/lib/electron-api';
import { mockNorotAPI } from '@/lib/mock-electron-api';

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.norot;
}

export function getNorotAPI(): NoRotAPI {
  if (isElectron()) {
    return window.norot;
  }
  return mockNorotAPI;
}
