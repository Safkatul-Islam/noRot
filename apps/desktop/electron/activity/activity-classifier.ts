import { app, desktopCapturer, screen, systemPreferences } from 'electron';
import path from 'path';
import type { CategoryRule } from '../types';
import { classifyApp, extractDomain, isBrowser } from '../window-classifier';
import type { RawImage } from '@xenova/transformers';
import { analyzeVisionOutputs, voteVisionDecisions, VISION_LABELS } from './vision-decision';

type ActivityCategory = 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown';

export type ActivityKind =
  | 'unknown'
  | 'coding'
  | 'spreadsheets'
  | 'presentations'
  | 'writing'
  | 'docs'
  | 'email'
  | 'chat'
  | 'video'
  | 'social_feed'
  | 'shopping'
  | 'games'
  | 'settings'
  | 'file_manager';

export type ActivityClassification = {
  category: ActivityCategory;
  activityLabel?: string;
  activityKind?: ActivityKind;
  activityConfidence?: number;
  activitySource?: 'rules' | 'vision';
};

export type VisionProgress = { attempt: number; total: number };

type ActiveWindowContext = {
  appName: string;
  windowTitle?: string;
  windowUrl?: string;
  bounds?: { x: number; y: number; width: number; height: number };
};

const VISION_MODEL_ID = 'Xenova/clip-vit-base-patch32';
const VISION_THROTTLE_MS = 10_000;
const MIN_VISION_CONFIDENCE = 0.18; // used only as an early-stop heuristic for voting runs

function brandFromDomain(domain: string): string | null {
  const d = domain.toLowerCase();
  if (d.includes('instagram.com')) return 'Instagram';
  if (d.includes('tiktok.com')) return 'TikTok';
  if (d.includes('youtube.com') || d.includes('youtu.be')) return 'YouTube';
  if (d.includes('reddit.com')) return 'Reddit';
  if (d === 'x.com' || d.includes('twitter.com')) return 'X';
  if (d.includes('facebook.com')) return 'Facebook';
  if (d.includes('twitch.tv')) return 'Twitch';
  if (d.includes('netflix.com')) return 'Netflix';
  if (d.includes('linkedin.com')) return 'LinkedIn';
  if (d.includes('github.com')) return 'GitHub';
  if (d.includes('stackoverflow.com')) return 'Stack Overflow';
  if (d.includes('docs.google.com')) return 'Google Docs';
  return null;
}

function rulesBasedActivity(ctx: ActiveWindowContext): ActivityClassification | null {
  const domain = ctx.windowUrl || ctx.windowTitle ? extractDomain(ctx.windowUrl, ctx.windowTitle) : undefined;
  if (domain) {
    const brand = brandFromDomain(domain);
    if (brand === 'Instagram') {
      return { category: 'social', activityLabel: 'scrolling Instagram', activityKind: 'social_feed', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'TikTok') {
      return { category: 'entertainment', activityLabel: 'scrolling TikTok', activityKind: 'video', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'YouTube') {
      return { category: 'entertainment', activityLabel: 'watching YouTube', activityKind: 'video', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'Reddit') {
      return { category: 'entertainment', activityLabel: 'browsing Reddit', activityKind: 'social_feed', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'X') {
      return { category: 'entertainment', activityLabel: 'browsing X', activityKind: 'social_feed', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'GitHub') {
      return { category: 'productive', activityLabel: 'coding on GitHub', activityKind: 'coding', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'Stack Overflow') {
      return { category: 'productive', activityLabel: 'debugging on Stack Overflow', activityKind: 'coding', activityConfidence: 1, activitySource: 'rules' };
    }
    if (brand === 'Google Docs') {
      return { category: 'productive', activityLabel: 'working in Google Docs', activityKind: 'docs', activityConfidence: 1, activitySource: 'rules' };
    }
  }

  const appName = ctx.appName.toLowerCase();
  if (appName.includes('code') || appName.includes('xcode') || appName.includes('intellij') || appName.includes('webstorm')) {
    return { category: 'productive', activityLabel: 'coding', activityKind: 'coding', activityConfidence: 1, activitySource: 'rules' };
  }
  if (appName.includes('excel') || appName.includes('numbers') || appName.includes('google sheets') || appName.includes('spreadsheet')) {
    return { category: 'productive', activityLabel: 'working in a spreadsheet', activityKind: 'spreadsheets', activityConfidence: 1, activitySource: 'rules' };
  }
  if (appName.includes('powerpoint') || appName.includes('keynote') || appName.includes('slides')) {
    return { category: 'productive', activityLabel: 'editing a presentation', activityKind: 'presentations', activityConfidence: 1, activitySource: 'rules' };
  }
  if (appName.includes('word') || appName.includes('pages') || appName.includes('notes') || appName.includes('notion')) {
    return { category: 'productive', activityLabel: 'writing', activityKind: 'writing', activityConfidence: 0.9, activitySource: 'rules' };
  }
  if (appName.includes('finder') || appName.includes('file explorer')) {
    return { category: 'productive', activityLabel: 'browsing files', activityKind: 'file_manager', activityConfidence: 0.9, activitySource: 'rules' };
  }
  if (appName.includes('system settings') || appName === 'settings') {
    return { category: 'productive', activityLabel: 'changing settings', activityKind: 'settings', activityConfidence: 0.9, activitySource: 'rules' };
  }

  return null;
}

async function captureActiveWindowPng(ctx: ActiveWindowContext): Promise<Buffer | null> {
  try {
    if (!ctx.bounds || ctx.bounds.width <= 1 || ctx.bounds.height <= 1) return null;

    // Prefer window-only thumbnails when available so we capture *only* the app window.
    // Fall back to screen thumbnail + crop if window sources aren't available.
    try {
      const windowSources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 900, height: 600 },
        fetchWindowIcons: false,
      });

      const title = (ctx.windowTitle ?? '').trim().toLowerCase();
      const appName = (ctx.appName ?? '').trim().toLowerCase();
      const match =
        windowSources.find((s) => title && s.name?.toLowerCase?.() === title) ??
        windowSources.find((s) => title && s.name?.toLowerCase?.().includes(title)) ??
        windowSources.find((s) => appName && s.name?.toLowerCase?.().includes(appName));

      if (match?.thumbnail) {
        const sz = match.thumbnail.getSize();
        if (sz.width > 1 && sz.height > 1) {
          const resized = match.thumbnail.resize({ width: 384, height: 384, quality: 'good' });
          const buf = resized.toPNG();
          if (buf && buf.length > 0) return buf;
        }
      }
    } catch {
      // ignore
    }

    const displays = screen.getAllDisplays();
    const centerX = ctx.bounds.x + ctx.bounds.width / 2;
    const centerY = ctx.bounds.y + ctx.bounds.height / 2;
    const display =
      displays.find((d) =>
        centerX >= d.bounds.x &&
        centerX < d.bounds.x + d.bounds.width &&
        centerY >= d.bounds.y &&
        centerY < d.bounds.y + d.bounds.height
      ) ?? screen.getPrimaryDisplay();

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 900, height: 600 },
      fetchWindowIcons: false,
    });

    const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!source) return null;

    const thumb = source.thumbnail;
    const thumbSize = thumb.getSize();
    if (thumbSize.width <= 1 || thumbSize.height <= 1) return null;

    const displayBounds = display.bounds;
    const scaleX = thumbSize.width / displayBounds.width;
    const scaleY = thumbSize.height / displayBounds.height;

    const x = Math.round((ctx.bounds.x - displayBounds.x) * scaleX);
    const y = Math.round((ctx.bounds.y - displayBounds.y) * scaleY);
    const width = Math.round(ctx.bounds.width * scaleX);
    const height = Math.round(ctx.bounds.height * scaleY);

    const cropX = Math.max(0, Math.min(thumbSize.width - 1, x));
    const cropY = Math.max(0, Math.min(thumbSize.height - 1, y));
    const cropW = Math.max(1, Math.min(thumbSize.width - cropX, width));
    const cropH = Math.max(1, Math.min(thumbSize.height - cropY, height));

    if (cropW < 20 || cropH < 20) return null;

    const cropped = thumb.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
    const resized = cropped.resize({ width: 384, height: 384, quality: 'good' });
    return resized.toPNG();
  } catch (err) {
    console.warn('[vision] capture failed:', err);
    return null;
  }
}

type ZeroShotOutput = { label: string; score: number };
type ZeroShotClassifier = (image: RawImage, labels: string[], options?: Record<string, unknown>) => Promise<ZeroShotOutput[]>;

type RawImageClass = {
  fromBlob: (blob: Blob) => Promise<RawImage>;
};

type VisionPipeline = {
  classifier: ZeroShotClassifier;
  RawImage: RawImageClass;
};

let cachedVisionPipeline: VisionPipeline | null = null;
let cachedVisionPipelinePromise: Promise<VisionPipeline> | null = null;

async function getVisionPipeline(): Promise<VisionPipeline> {
  if (cachedVisionPipeline) return cachedVisionPipeline;
  if (cachedVisionPipelinePromise) return cachedVisionPipelinePromise;

  cachedVisionPipelinePromise = (async () => {
    const mod = await import('@xenova/transformers');
    const { env, pipeline, RawImage: RawImageClass } = mod as unknown as { env: any; pipeline: any; RawImage: RawImageClass };

    try {
      env.useBrowserCache = false;
      env.useFSCache = true;
      env.cacheDir = path.join(app.getPath('userData'), 'hf-cache');
    } catch {
      // ignore
    }

    const p = await pipeline('zero-shot-image-classification', VISION_MODEL_ID);
    cachedVisionPipeline = { classifier: p as ZeroShotClassifier, RawImage: RawImageClass };
    return cachedVisionPipeline;
  })();

  return cachedVisionPipelinePromise;
}

export function createActivityClassifier() {
  let lastKey = '';
  let lastAt = 0;
  let lastResult: ActivityClassification | null = null;

  return {
    async classify(
      ctx: ActiveWindowContext,
      categoryRules: CategoryRule[],
      visionEnabled: boolean,
      opts?: {
        attempts?: number;
        attemptDelayMs?: number;
        onProgress?: (p: VisionProgress) => void;
      }
    ): Promise<ActivityClassification> {
      const baseCategory = classifyApp(ctx.appName, categoryRules, ctx.windowTitle, ctx.windowUrl);
      const baseDomain = isBrowser(ctx.appName) ? extractDomain(ctx.windowUrl, ctx.windowTitle) : undefined;

      const base: ActivityClassification = {
        category: baseCategory,
        ...(baseDomain ? { activityLabel: brandFromDomain(baseDomain) ? `browsing ${brandFromDomain(baseDomain)}` : undefined } : {}),
        activityKind: baseDomain ? 'unknown' : undefined,
        activityConfidence: 0.5,
        activitySource: 'rules',
      };

      const rulesActivity = rulesBasedActivity(ctx);
      if (rulesActivity) {
        return { ...base, ...rulesActivity };
      }

      if (!visionEnabled) return base;

      // Don't spend vision cycles on clearly-productive apps by rules.
      // Vision is used to continuously re-check neutral/unproductive contexts (e.g., browser content).
      if (baseCategory === 'productive') return base;

      if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('screen');
        if (status !== 'granted') return base;
      }

      // Stable key so we don't restart inference constantly when window titles change.
      const key = `${ctx.appName}|${baseDomain ?? ''}`;
      const now = Date.now();
      if (key === lastKey && lastResult && now - lastAt < VISION_THROTTLE_MS) {
        return lastResult;
      }

      try {
        const { classifier, RawImage: RawImageClass } = await getVisionPipeline();
        const attempts = Math.max(1, Math.min(5, Math.floor(opts?.attempts ?? 3)));
        const attemptDelayMs = Math.max(0, Math.min(10_000, Math.floor(opts?.attemptDelayMs ?? 1500)));

        const labels = VISION_LABELS.map((c) => c.label);
        const attemptDecisions: Array<ReturnType<typeof analyzeVisionOutputs>> = [];

        for (let i = 0; i < attempts; i++) {
          opts?.onProgress?.({ attempt: i + 1, total: attempts });

          const png = await captureActiveWindowPng(ctx);
          if (!png) {
            if (attemptDelayMs > 0) await new Promise<void>((r) => setTimeout(r, attemptDelayMs));
            continue;
          }

          // Best-effort privacy: avoid extra copies and wipe bytes after decoding.
          const pngBytes = new Uint8Array(png.buffer, png.byteOffset, png.byteLength);
          const image = await RawImageClass.fromBlob(new Blob([pngBytes], { type: 'image/png' }));
          try { pngBytes.fill(0); } catch { /* ignore */ }

          const output = await classifier(image, labels, {
            hypothesis_template: 'This is a screenshot of someone {}.',
          });

          if (!output || output.length === 0) {
            if (attemptDelayMs > 0) await new Promise<void>((r) => setTimeout(r, attemptDelayMs));
            continue;
          }

          const decision = analyzeVisionOutputs(output);
          attemptDecisions.push(decision);

          // Early stop if we already have a confident decision.
          if (decision.decidedCategory && decision.confidence >= MIN_VISION_CONFIDENCE) break;

          if (attemptDelayMs > 0) await new Promise<void>((r) => setTimeout(r, attemptDelayMs));
        }

        const voted = voteVisionDecisions(attemptDecisions);
        if (!voted.decidedCategory) return base;

        const result: ActivityClassification = {
          category: voted.decidedCategory,
          activityLabel: voted.topLabel ?? base.activityLabel,
          activityKind: voted.decidedKind ?? 'unknown',
          activityConfidence: voted.confidence,
          activitySource: 'vision',
        };

        lastKey = key;
        lastAt = Date.now();
        lastResult = result;
        return result;
      } catch (err) {
        console.warn('[vision] classify failed:', err);
        return base;
      }
    },
  };
}
