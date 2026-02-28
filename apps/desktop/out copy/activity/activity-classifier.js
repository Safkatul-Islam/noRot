import { app, desktopCapturer, screen, systemPreferences } from 'electron';
import path from 'path';
import { classifyApp, extractDomain, isBrowser } from '../window-classifier';
const VISION_MODEL_ID = 'Xenova/clip-vit-base-patch32';
const VISION_THROTTLE_MS = 10_000;
const MIN_VISION_CONFIDENCE = 0.35;
const CANDIDATE_LABELS = [
    { label: 'writing code in an IDE', kind: 'coding', category: 'productive' },
    { label: 'debugging code', kind: 'coding', category: 'productive' },
    { label: 'working in a spreadsheet', kind: 'spreadsheets', category: 'productive' },
    { label: 'editing a presentation slide', kind: 'presentations', category: 'productive' },
    { label: 'writing a document', kind: 'writing', category: 'productive' },
    { label: 'reading technical documentation', kind: 'docs', category: 'productive' },
    { label: 'checking email', kind: 'email', category: 'neutral' },
    { label: 'chatting in a messaging app', kind: 'chat', category: 'social' },
    { label: 'scrolling social media', kind: 'social_feed', category: 'social' },
    { label: 'watching an online video', kind: 'video', category: 'entertainment' },
    { label: 'shopping online', kind: 'shopping', category: 'entertainment' },
    { label: 'playing a video game', kind: 'games', category: 'entertainment' },
    { label: 'using system settings', kind: 'settings', category: 'neutral' },
    { label: 'browsing files in a file manager', kind: 'file_manager', category: 'neutral' },
];
function brandFromDomain(domain) {
    const d = domain.toLowerCase();
    if (d.includes('instagram.com'))
        return 'Instagram';
    if (d.includes('tiktok.com'))
        return 'TikTok';
    if (d.includes('youtube.com') || d.includes('youtu.be'))
        return 'YouTube';
    if (d.includes('reddit.com'))
        return 'Reddit';
    if (d === 'x.com' || d.includes('twitter.com'))
        return 'X';
    if (d.includes('facebook.com'))
        return 'Facebook';
    if (d.includes('twitch.tv'))
        return 'Twitch';
    if (d.includes('netflix.com'))
        return 'Netflix';
    if (d.includes('linkedin.com'))
        return 'LinkedIn';
    if (d.includes('github.com'))
        return 'GitHub';
    if (d.includes('stackoverflow.com'))
        return 'Stack Overflow';
    if (d.includes('docs.google.com'))
        return 'Google Docs';
    return null;
}
function rulesBasedActivity(ctx) {
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
        return { category: 'neutral', activityLabel: 'browsing files', activityKind: 'file_manager', activityConfidence: 0.9, activitySource: 'rules' };
    }
    if (appName.includes('system settings') || appName === 'settings') {
        return { category: 'neutral', activityLabel: 'changing settings', activityKind: 'settings', activityConfidence: 0.9, activitySource: 'rules' };
    }
    return null;
}
async function captureActiveWindowPng(ctx) {
    try {
        if (!ctx.bounds || ctx.bounds.width <= 1 || ctx.bounds.height <= 1)
            return null;
        const displays = screen.getAllDisplays();
        const centerX = ctx.bounds.x + ctx.bounds.width / 2;
        const centerY = ctx.bounds.y + ctx.bounds.height / 2;
        const display = displays.find((d) => centerX >= d.bounds.x &&
            centerX < d.bounds.x + d.bounds.width &&
            centerY >= d.bounds.y &&
            centerY < d.bounds.y + d.bounds.height) ?? screen.getPrimaryDisplay();
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 900, height: 600 },
            fetchWindowIcons: false,
        });
        const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
        if (!source)
            return null;
        const thumb = source.thumbnail;
        const thumbSize = thumb.getSize();
        if (thumbSize.width <= 1 || thumbSize.height <= 1)
            return null;
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
        if (cropW < 20 || cropH < 20)
            return null;
        const cropped = thumb.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
        const resized = cropped.resize({ width: 384, height: 384, quality: 'good' });
        return resized.toPNG();
    }
    catch (err) {
        console.warn('[vision] capture failed:', err);
        return null;
    }
}
let cachedVisionPipeline = null;
let cachedVisionPipelinePromise = null;
async function getVisionPipeline() {
    if (cachedVisionPipeline)
        return cachedVisionPipeline;
    if (cachedVisionPipelinePromise)
        return cachedVisionPipelinePromise;
    cachedVisionPipelinePromise = (async () => {
        const mod = await import('@xenova/transformers');
        const { env, pipeline, RawImage: RawImageClass } = mod;
        try {
            env.useBrowserCache = false;
            env.useFSCache = true;
            env.cacheDir = path.join(app.getPath('userData'), 'hf-cache');
        }
        catch {
            // ignore
        }
        const p = await pipeline('zero-shot-image-classification', VISION_MODEL_ID);
        cachedVisionPipeline = { classifier: p, RawImage: RawImageClass };
        return cachedVisionPipeline;
    })();
    return cachedVisionPipelinePromise;
}
export function createActivityClassifier() {
    let lastKey = '';
    let lastAt = 0;
    let lastResult = null;
    return {
        async classify(ctx, categoryRules, visionEnabled) {
            const baseCategory = classifyApp(ctx.appName, categoryRules, ctx.windowTitle, ctx.windowUrl);
            const baseDomain = isBrowser(ctx.appName) ? extractDomain(ctx.windowUrl, ctx.windowTitle) : undefined;
            const base = {
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
            if (!visionEnabled)
                return base;
            if (process.platform === 'darwin') {
                const status = systemPreferences.getMediaAccessStatus('screen');
                if (status !== 'granted')
                    return base;
            }
            // Avoid expensive inference for known productive native apps
            if (!isBrowser(ctx.appName) && baseCategory === 'productive')
                return base;
            const key = `${ctx.appName}|${baseDomain ?? ''}|${ctx.windowTitle ?? ''}`;
            const now = Date.now();
            if (key === lastKey && lastResult && now - lastAt < VISION_THROTTLE_MS) {
                return lastResult;
            }
            const png = await captureActiveWindowPng(ctx);
            if (!png)
                return base;
            try {
                const { classifier, RawImage: RawImageClass } = await getVisionPipeline();
                const pngArrayBuffer = Uint8Array.from(png).buffer;
                const image = await RawImageClass.fromBlob(new Blob([pngArrayBuffer], { type: 'image/png' }));
                const labels = CANDIDATE_LABELS.map((c) => c.label);
                const output = await classifier(image, labels, {
                    hypothesis_template: 'This is a screenshot of someone {}.',
                });
                const top = output?.[0];
                if (!top || typeof top.label !== 'string' || typeof top.score !== 'number')
                    return base;
                if (!Number.isFinite(top.score) || top.score < MIN_VISION_CONFIDENCE)
                    return base;
                const mapped = CANDIDATE_LABELS.find((c) => c.label === top.label);
                const result = {
                    category: mapped?.category ?? baseCategory,
                    activityLabel: mapped ? top.label : undefined,
                    activityKind: mapped?.kind ?? 'unknown',
                    activityConfidence: top.score,
                    activitySource: 'vision',
                };
                lastKey = key;
                lastAt = now;
                lastResult = result;
                return result;
            }
            catch (err) {
                console.warn('[vision] classify failed:', err);
                return base;
            }
        },
    };
}
