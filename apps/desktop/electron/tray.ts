import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import type { Severity } from '@norot/shared';

// Color per severity state
const SEVERITY_COLORS: Record<Severity, string> = {
  0: '#22c55e', // Focused — green
  1: '#eab308', // Drifting — yellow
  2: '#f97316', // Distracted — orange
  3: '#ef4444', // Procrastinating — red
  4: '#a855f7', // Crisis — purple
};

const SEVERITY_LABELS: Record<Severity, string> = {
  0: 'Focused',
  1: 'Drifting',
  2: 'Distracted',
  3: 'Procrastinating',
  4: 'Crisis',
};

const INACTIVE_COLOR = '#6b7280';

export interface TrayState {
  score: number;
  severity: Severity;
  activeApp: string;
  activeCategory: string;
  activeDomain?: string;
  telemetryActive: boolean;
}

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let currentState: TrayState = {
  score: 0,
  severity: 0,
  activeApp: '',
  activeCategory: '',
  telemetryActive: false,
};

/**
 * Draw a 16x16 colored circle as a PNG buffer using raw RGBA pixel data.
 * No Canvas dependency — just math and a minimal PNG encoder.
 */
function createCircleIcon(hexColor: string): Electron.NativeImage {
  const size = 16;
  // @2x for Retina displays
  const scale = 2;
  const px = size * scale;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Create RGBA buffer
  const buf = Buffer.alloc(px * px * 4);
  const center = px / 2;
  const radius = center - 1;

  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = (y * px + x) * 4;

      if (dist <= radius) {
        // Anti-alias the edge
        const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255;
        buf[offset] = r;
        buf[offset + 1] = g;
        buf[offset + 2] = b;
        buf[offset + 3] = alpha;
      } else {
        // Transparent
        buf[offset + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buf, {
    width: px,
    height: px,
    scaleFactor: scale,
  });
}

function buildContextMenu(): Menu {
  const { score, severity, activeApp, activeCategory, telemetryActive } = currentState;
  const win = mainWindow;
  const isVisible = win && !win.isDestroyed() && win.isVisible();

  const statusLabel = telemetryActive
    ? `${SEVERITY_LABELS[severity]} — Focus: ${100 - score}`
    : 'Monitoring paused';

  const items: Electron.MenuItemConstructorOptions[] = [
    { label: statusLabel, enabled: false },
    { type: 'separator' },
  ];

  if (telemetryActive && activeApp) {
    const domainSuffix = currentState.activeDomain
      ? ` [${currentState.activeDomain}]`
      : '';
    items.push(
      { label: `${activeApp}${domainSuffix} (${activeCategory})`, enabled: false },
      { type: 'separator' },
    );
  }

  items.push(
    {
      label: isVisible ? 'Hide noRot' : 'Show noRot',
      click: () => {
        if (!win || win.isDestroyed()) return;
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
          win.webContents.invalidate();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit noRot',
      click: () => {
        app.quit();
      },
    },
  );

  return Menu.buildFromTemplate(items);
}

export function createTray(window: BrowserWindow): void {
  mainWindow = window;

  // Start with inactive (gray) icon
  const icon = createCircleIcon(INACTIVE_COLOR);
  // On macOS, setting the image as a "template" would make it monochrome.
  // We want actual colors, so we pass the image directly.
  tray = new Tray(icon);
  tray.setToolTip('noRot');
  tray.setContextMenu(buildContextMenu());
}

export function updateTrayState(data: TrayState): void {
  if (!tray) return;

  currentState = data;

  // Pick color based on telemetry status
  const color = data.telemetryActive
    ? SEVERITY_COLORS[data.severity]
    : INACTIVE_COLOR;

  tray.setImage(createCircleIcon(color));
  tray.setContextMenu(buildContextMenu());

  const tooltip = data.telemetryActive
    ? `noRot — ${SEVERITY_LABELS[data.severity]} (Focus: ${100 - data.score})`
    : 'noRot — Paused';
  tray.setToolTip(tooltip);
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
