export function shouldTreatInterventionAsDismissed(opts: {
  activeInterventionId: string | null;
  overlayVisible: boolean;
  startedAt: number;
  now: number;
  graceMs?: number;
}): boolean {
  const graceMs = typeof opts.graceMs === 'number' && Number.isFinite(opts.graceMs) ? Math.max(0, opts.graceMs) : 10_000;
  if (!opts.activeInterventionId) return false;
  if (opts.overlayVisible) return false;
  if (!Number.isFinite(opts.startedAt) || opts.startedAt <= 0) return false;
  return opts.now - opts.startedAt >= graceMs;
}

export function hasInterventionGapElapsed(opts: {
  lastShownAt: number;
  now: number;
  minGapMs?: number;
}): boolean {
  const minGapMs = typeof opts.minGapMs === 'number' && Number.isFinite(opts.minGapMs) ? Math.max(0, opts.minGapMs) : 5_000;
  if (!Number.isFinite(opts.lastShownAt) || opts.lastShownAt <= 0) return true;
  return opts.now - opts.lastShownAt >= minGapMs;
}
