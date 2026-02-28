import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import * as database from './database';
import { registerIpcHandlers } from './ipc-handlers';
import { startTelemetry, stopTelemetry } from './orchestrator';
import { createTray, destroyTray } from './tray';
import { IPC_CHANNELS } from './types';
import { shouldAutoCreateTodoOverlay, shouldAutoStartTelemetry } from './startup';
import { setMainWindow, getTodoWindow, setTodoWindow, createTodoOverlayWindow, isTodoDragging, } from './window-manager';
let mainWindow = null;
let isQuitting = false;
let focusDebounce = null;
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.setName('noRot');
function getArgValue(prefix) {
    const arg = process.argv.find((a) => a.startsWith(prefix));
    if (!arg)
        return undefined;
    return arg.slice(prefix.length) || undefined;
}
function resolveRendererUrl() {
    const envUrl = process.env.ELECTRON_RENDERER_URL;
    if (envUrl)
        return envUrl;
    const argUrl = getArgValue('--renderer-url=');
    if (argUrl)
        return argUrl;
    return undefined;
}
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#0a0a0f',
        icon: path.join(__dirname, '../../build/icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 12 } : undefined,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            backgroundThrottling: false,
            autoplayPolicy: 'no-user-gesture-required',
        },
    });
    // Load renderer
    const rendererUrl = resolveRendererUrl();
    const isDev = !!rendererUrl;
    if (isDev) {
        console.log('[main] Loading renderer URL:', rendererUrl);
    }
    if (rendererUrl) {
        mainWindow.loadURL(rendererUrl);
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        console.error('[main] did-fail-load', { errorCode, errorDescription, validatedURL });
    });
    if (isDev) {
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('[main] did-finish-load', {
                url: mainWindow?.webContents.getURL(),
                title: mainWindow?.getTitle(),
            });
        });
        mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
            const levelLabel = ['log', 'warn', 'error', 'debug'][(level - 1)] ?? `level:${level}`;
            console.log(`[renderer:${levelLabel}] ${message} (${sourceId}:${line})`);
        });
        mainWindow.webContents.on('render-process-gone', (_event, details) => {
            console.error('[main] render-process-gone', details);
        });
        // Surface preload failures (often look like a black screen).
        mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
            console.error('[main] preload-error', { preloadPath, error });
        });
    }
    // Close-to-tray: keep telemetry + voice running even when the window is closed.
    // Use the tray menu "Quit noRot" to fully exit.
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
    // Notify renderer whenever the window becomes visible again.
    // This is the only reliable signal in Electron (visibilitychange is dead
    // because backgroundThrottling is false).
    mainWindow.on('show', () => {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        console.log('[main] window show event — sending IPC + invalidate');
        mainWindow.webContents.invalidate();
        mainWindow.webContents.send(IPC_CHANNELS.ON_WINDOW_SHOWN);
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
        setMainWindow(null);
    });
    setMainWindow(mainWindow);
}
app.whenReady().then(() => {
    // Dev builds run inside Electron.app, so set the Dock icon explicitly.
    if (process.platform === 'darwin' && app.dock) {
        try {
            const iconPath = path.join(__dirname, '../../build/icon-macos.png');
            const icon = nativeImage.createFromPath(iconPath);
            if (!icon.isEmpty())
                app.dock.setIcon(icon);
        }
        catch {
            // ignore
        }
    }
    // Initialize database before anything else
    database.initDatabase();
    // Register all IPC handlers
    registerIpcHandlers();
    // Create the main window
    createWindow();
    // Create system tray icon
    if (mainWindow) {
        createTray(mainWindow);
    }
    // App-level focus tracking — debounced to avoid flicker during window switches
    let lastAnyFocused = null;
    const syncTodoOverlayVisibility = (anyFocused) => {
        const todoWin = getTodoWindow();
        if (!todoWin || todoWin.isDestroyed())
            return;
        // Overlay should be visible only when noRot is NOT focused.
        if (anyFocused) {
            if (todoWin.isVisible())
                todoWin.hide();
            return;
        }
        if (!todoWin.isVisible())
            todoWin.showInactive();
    };
    const checkFocus = () => {
        if (focusDebounce)
            clearTimeout(focusDebounce);
        focusDebounce = setTimeout(() => {
            const todoWin = getTodoWindow();
            const anyFocused = BrowserWindow.getAllWindows().some((w) => !w.isDestroyed() && w.isFocused() && w !== todoWin);
            // Sync overlay visibility (unless dragging). The overlay can be created while
            // focus state stays the same, and we still need to apply the correct visibility.
            if (!isTodoDragging()) {
                syncTodoOverlayVisibility(anyFocused);
            }
            // Tell the main window about focus state
            if (anyFocused !== lastAnyFocused) {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, { focused: anyFocused });
                }
            }
            lastAnyFocused = anyFocused;
        }, 150);
    };
    app.on('browser-window-focus', checkFocus);
    app.on('browser-window-blur', checkFocus);
    // Creating the overlay shouldn't require a focus change to sync visibility.
    app.on('browser-window-created', checkFocus);
    // Initialize focus state once on startup.
    checkFocus();
    // Only auto-start telemetry if user has completed onboarding AND already
    // did daily setup today AND monitoring is enabled. Otherwise the renderer
    // will start telemetry when the user finishes the daily setup flow.
    const settings = database.getSettings();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (shouldAutoStartTelemetry(settings, today)) {
        console.log('[main] Onboarding + daily setup complete — starting telemetry');
        startTelemetry();
    }
    else {
        console.log('[main] Telemetry will NOT auto-start — waiting for daily setup or monitoring paused');
    }
    // Auto-show todo overlay if user completed onboarding, did daily setup today,
    // and has autoShowTodoOverlay enabled.
    if (shouldAutoCreateTodoOverlay(settings, today)) {
        createTodoOverlayWindow();
        // The overlay window starts hidden (show: false). Let focus tracking decide
        // whether it should be shown right now.
        checkFocus();
    }
    // macOS: show existing window or re-create when dock icon is clicked
    app.on('activate', (_event, hasVisibleWindows) => {
        // If a window is already visible (e.g. the todo overlay), don't force-open
        // the main window. This prevents the main window from popping up when the
        // user clicks/drag-scrolls inside the overlay.
        if (hasVisibleWindows)
            return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.invalidate();
        }
        else if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('before-quit', () => {
    isQuitting = true;
    // Cancel any pending focus debounce to prevent IPC to destroyed windows
    if (focusDebounce) {
        clearTimeout(focusDebounce);
        focusDebounce = null;
    }
    // Close todo overlay window if open
    const todoWin = getTodoWindow();
    if (todoWin && !todoWin.isDestroyed()) {
        todoWin.destroy();
        setTodoWindow(null);
    }
    destroyTray();
    stopTelemetry();
    database.closeDatabase();
});
