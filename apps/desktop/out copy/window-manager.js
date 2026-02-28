import { BrowserWindow } from 'electron';
import path from 'path';
let mainWindow = null;
let todoWindow = null;
let todoDragging = false;
let todoDraggingTimer = null;
export function isTodoDragging() {
    return todoDragging;
}
export function getMainWindow() {
    return mainWindow;
}
export function setMainWindow(win) {
    mainWindow = win;
}
export function getTodoWindow() {
    return todoWindow;
}
export function setTodoWindow(win) {
    todoWindow = win;
}
export function createTodoOverlayWindow() {
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
        if (todoDraggingTimer)
            clearTimeout(todoDraggingTimer);
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
    }
    else {
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
