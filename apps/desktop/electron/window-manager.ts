import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import type { InterventionEvent } from '@norot/shared';
import { IPC_CHANNELS } from './types';

let mainWindow: BrowserWindow | null = null;
let todoWindow: BrowserWindow | null = null;
let voiceOrbWindow: BrowserWindow | null = null;
let interventionWindow: BrowserWindow | null = null;
let todoDragging = false;
let todoDraggingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingInterventionForOverlay: InterventionEvent | null = null;

export function isTodoDragging(): boolean {
  return todoDragging;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

export function getTodoWindow(): BrowserWindow | null {
  return todoWindow;
}

export function setTodoWindow(win: BrowserWindow | null): void {
  todoWindow = win;
}

export function getVoiceOrbWindow(): BrowserWindow | null {
  return voiceOrbWindow;
}

export function setVoiceOrbWindow(win: BrowserWindow | null): void {
  voiceOrbWindow = win;
}

export function getInterventionWindow(): BrowserWindow | null {
  return interventionWindow;
}

export function isInterventionOverlayVisible(): boolean {
  return !!interventionWindow && !interventionWindow.isDestroyed() && interventionWindow.isVisible();
}

export function createVoiceOrbWindow(): void {
  if (voiceOrbWindow && !voiceOrbWindow.isDestroyed()) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 160;
  const winHeight = 160;
  const x = Math.round((width - winWidth) / 2);
  const y = height - winHeight - 20;

  voiceOrbWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    show: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    // Use explicit transparent RGBA to avoid hex alpha ambiguities.
    // Source: Context7 - /electron/electron docs - "win.setBackgroundColor()"
    backgroundColor: 'rgba(0, 0, 0, 0)',
    hasShadow: false,
    roundedCorners: false,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: false,
      backgroundThrottling: false,
    },
  });

  // macOS: reinforce transparent compositing (some builds ignore constructor backgroundColor).
  // Source: Context7 - /electron/electron docs - "win.setBackgroundColor()"
  voiceOrbWindow.setBackgroundColor('rgba(0, 0, 0, 0)');

  voiceOrbWindow.setAlwaysOnTop(true, 'floating');
  if (process.platform === 'darwin') {
    voiceOrbWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  voiceOrbWindow.setIgnoreMouseEvents(false);

  // Safety net: inject transparent CSS before page renders
  voiceOrbWindow.webContents.on('dom-ready', () => {
    voiceOrbWindow?.webContents.insertCSS(
      'html,body,#root,canvas{background:transparent!important}'
    );
  });

  // Show window only after content is fully loaded (prevents white flash)
  // and force macOS to recompute compositing for transparent content
  voiceOrbWindow.webContents.on('did-finish-load', () => {
    voiceOrbWindow?.invalidateShadow();
    voiceOrbWindow?.setBackgroundColor('rgba(0, 0, 0, 0)');
    voiceOrbWindow?.show();
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    voiceOrbWindow.loadURL(`${rendererUrl}/voice-orb.html`);
  } else {
    voiceOrbWindow.loadFile(path.join(__dirname, '../renderer/voice-orb.html'));
  }

  voiceOrbWindow.on('closed', () => {
    voiceOrbWindow = null;
  });
}

export function createTodoOverlayWindow(): void {
  if (todoWindow && !todoWindow.isDestroyed()) {
    return;
  }

  todoWindow = new BrowserWindow({
    width: 320,
    height: 480,
    minWidth: 280,
    minHeight: 400,
    show: false,
    alwaysOnTop: true,
    // Must be focusable so clicks/drag inside the overlay don't force-focus the main window.
    focusable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00ffffff',
    hasShadow: false,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  // Track manual dragging so focus sync logic doesn't hide mid-drag.
  todoWindow.on('will-move', () => {
    todoDragging = true;
    if (todoDraggingTimer) {
      clearTimeout(todoDraggingTimer);
      todoDraggingTimer = null;
    }
  });

  todoWindow.on('moved', () => {
    if (todoDraggingTimer) clearTimeout(todoDraggingTimer);
    todoDraggingTimer = setTimeout(() => {
      todoDragging = false;
      todoDraggingTimer = null;
    }, 300);
  });

  // Keep above other windows including fullscreen apps
  todoWindow.setAlwaysOnTop(true, 'floating');

  // Load the same renderer — the hash route determines which view to show
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    todoWindow.loadURL(`${rendererUrl}#/todo-overlay`);
  } else {
    todoWindow.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/todo-overlay' });
  }

  todoWindow.on('closed', () => {
    todoDragging = false;
    if (todoDraggingTimer) {
      clearTimeout(todoDraggingTimer);
      todoDraggingTimer = null;
    }
    todoWindow = null;
  });
}

function positionInterventionOverlayWindow(win: BrowserWindow): void {
  try {
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const [w, h] = win.getSize();
    const x = Math.round(display.workArea.x + (display.workArea.width - w) / 2);
    const y = Math.round(display.workArea.y + (display.workArea.height - h) / 3);
    win.setPosition(x, y, false);
  } catch {
    // ignore
  }
}

export function createInterventionOverlayWindow(): void {
  if (interventionWindow && !interventionWindow.isDestroyed()) {
    return;
  }

  const display = screen.getPrimaryDisplay();
  const width = 520;
  const height = 320;
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2);
  const y = Math.round(display.workArea.y + (display.workArea.height - height) / 3);

  interventionWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    alwaysOnTop: true,
    focusable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    // On macOS, `skipTaskbar: true` can make the whole app feel like it "disappeared"
    // if the main window is hidden; keep it visible in Cmd-Tab/Dock while the popup is open.
    skipTaskbar: false,
    resizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  // Keep above other windows including fullscreen apps
  interventionWindow.setAlwaysOnTop(true, 'screen-saver');

  if (process.platform === 'darwin') {
    interventionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Load the same renderer — the hash route determines which view to show
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    interventionWindow.loadURL(`${rendererUrl}#/intervention-overlay`);
  } else {
    interventionWindow.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/intervention-overlay' });
  }

  interventionWindow.webContents.on('did-finish-load', () => {
    if (!interventionWindow || interventionWindow.isDestroyed()) return;
    if (pendingInterventionForOverlay) {
      interventionWindow.webContents.send(IPC_CHANNELS.ON_INTERVENTION, pendingInterventionForOverlay);
      pendingInterventionForOverlay = null;
    }
  });

  interventionWindow.on('closed', () => {
    pendingInterventionForOverlay = null;
    interventionWindow = null;
  });
}

export function showInterventionOverlayWindow(intervention: InterventionEvent): void {
  if (process.platform === 'darwin') {
    // Defensive: keep the app visible in the Dock/Cmd-Tab even if the main window is hidden.
    try { app.dock?.show(); } catch { /* ignore */ }
    try { (app as any).setActivationPolicy?.('regular'); } catch { /* ignore */ }
  }
  createInterventionOverlayWindow();
  if (!interventionWindow || interventionWindow.isDestroyed()) return;

  positionInterventionOverlayWindow(interventionWindow);
  pendingInterventionForOverlay = intervention;

  if (interventionWindow.webContents.isLoadingMainFrame()) {
    interventionWindow.once('ready-to-show', () => {
      if (!interventionWindow || interventionWindow.isDestroyed()) return;
      positionInterventionOverlayWindow(interventionWindow);
      if (pendingInterventionForOverlay) {
        interventionWindow.webContents.send(IPC_CHANNELS.ON_INTERVENTION, pendingInterventionForOverlay);
        pendingInterventionForOverlay = null;
      }
      if (!interventionWindow.isVisible()) interventionWindow.show();
      interventionWindow.focus();
    });
    return;
  }

  interventionWindow.webContents.send(IPC_CHANNELS.ON_INTERVENTION, intervention);
  pendingInterventionForOverlay = null;
  if (!interventionWindow.isVisible()) interventionWindow.show();
  interventionWindow.focus();
}

export function closeInterventionOverlayWindow(): void {
  pendingInterventionForOverlay = null;
  if (interventionWindow && !interventionWindow.isDestroyed()) {
    interventionWindow.destroy();
  }
  interventionWindow = null;
}
