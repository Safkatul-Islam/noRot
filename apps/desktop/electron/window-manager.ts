import { BrowserWindow, screen } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let todoWindow: BrowserWindow | null = null;
let voiceOrbWindow: BrowserWindow | null = null;

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
    todoWindow.focus();
    return;
  }

  todoWindow = new BrowserWindow({
    width: 320,
    height: 480,
    minWidth: 280,
    minHeight: 320,
    alwaysOnTop: true,
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
    },
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
    todoWindow = null;
  });
}
