import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import * as database from './database';
import { registerIpcHandlers } from './ipc-handlers';
import { startTelemetry, stopTelemetry } from './orchestrator';
import { createTray, destroyTray } from './tray';
import { IPC_CHANNELS } from './types';
import {
  setMainWindow,
  getTodoWindow,
  setTodoWindow,
  getVoiceOrbWindow,
  setVoiceOrbWindow,
  createTodoOverlayWindow,
  createVoiceOrbWindow,
} from './window-manager';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.setName('noRot');

function getArgValue(prefix: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return undefined;
  return arg.slice(prefix.length) || undefined;
}

function resolveRendererUrl(): string | undefined {
  const envUrl = process.env.ELECTRON_RENDERER_URL;
  if (envUrl) return envUrl;

  const argUrl = getArgValue('--renderer-url=');
  if (argUrl) return argUrl;

  return undefined;
}

function createWindow(): void {
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
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[main] did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  // macOS: hide window instead of closing so the app stays in the tray
  if (process.platform === 'darwin') {
    mainWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        mainWindow?.hide();
      }
    });
  }

  // Notify renderer whenever the window becomes visible again.
  // This is the only reliable signal in Electron (visibilitychange is dead
  // because backgroundThrottling is false).
  mainWindow.on('show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
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
      if (!icon.isEmpty()) app.dock.setIcon(icon);
    } catch {
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

  // Only start telemetry if user has completed onboarding
  const settings = database.getSettings();
  if (settings.hasCompletedOnboarding) {
    console.log('[main] Onboarding complete — starting telemetry');
    startTelemetry();
  } else {
    console.log('[main] Onboarding incomplete — telemetry will NOT start until onboarding is finished');
  }

  // Create voice orb overlay after main window loads
  mainWindow.webContents.on('did-finish-load', () => {
    createVoiceOrbWindow();
  });

  // Auto-show todo overlay if user had it open last session
  if (settings.autoShowTodoOverlay) {
    createTodoOverlayWindow();
  }

  // macOS: show existing window or re-create when dock icon is clicked
  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.invalidate();
    } else if (BrowserWindow.getAllWindows().length === 0) {
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

  // Close voice orb overlay window
  const voiceOrbWin = getVoiceOrbWindow();
  if (voiceOrbWin && !voiceOrbWin.isDestroyed()) {
    voiceOrbWin.destroy();
    setVoiceOrbWindow(null);
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
