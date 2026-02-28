import crypto from 'node:crypto';

// Vitest jsdom provides `window`, but `crypto.randomUUID()` may be missing.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = crypto.webcrypto;
}

if (typeof (globalThis.crypto as any)?.randomUUID !== 'function') {
  (globalThis.crypto as any).randomUUID = crypto.randomUUID;
}
