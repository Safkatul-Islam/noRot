import crypto from 'node:crypto';
// Vitest jsdom provides `window`, but `crypto.randomUUID()` may be missing.
if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = crypto.webcrypto;
}
if (typeof globalThis.crypto?.randomUUID !== 'function') {
    globalThis.crypto.randomUUID = crypto.randomUUID;
}
