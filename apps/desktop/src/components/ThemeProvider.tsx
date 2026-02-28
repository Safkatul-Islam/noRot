import React, { useEffect, useMemo, useState } from 'react';
import { createContext, useContext } from 'react';
import { LiquidEther } from '@/components/effects/LiquidEther';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useScoreStore } from '@/stores/score-store';
import type { Severity } from '@norot/shared';

interface ThemeContextValue {
  theme: 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark' });

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Maps severity → fluid simulation params.
 * The ether becomes a persistent ambient indicator of focus state:
 *   Focused  → calm, slow, cool accent colors
 *   Crisis   → turbulent, fast, warm/red overlay
 */
const SEVERITY_FLUID_PARAMS: Record<Severity, {
  autoSpeed: number;
  autoIntensity: number;
  mouseForce: number;
  /** Blend factor: 0 = pure accent colors, 1 = pure severity colors */
  colorBlend: number;
  severityColors: [string, string, string];
}> = {
  0: { autoSpeed: 0.25, autoIntensity: 1.4, mouseForce: 12, colorBlend: 0, severityColors: ['#22c55e', '#34d399', '#6ee7b7'] },
  1: { autoSpeed: 0.35, autoIntensity: 1.8, mouseForce: 15, colorBlend: 0.15, severityColors: ['#eab308', '#facc15', '#fde68a'] },
  2: { autoSpeed: 0.50, autoIntensity: 2.4, mouseForce: 20, colorBlend: 0.30, severityColors: ['#f97316', '#fb923c', '#fdba74'] },
  3: { autoSpeed: 0.70, autoIntensity: 3.2, mouseForce: 28, colorBlend: 0.50, severityColors: ['#ef4444', '#f87171', '#fca5a5'] },
  4: { autoSpeed: 0.90, autoIntensity: 4.0, mouseForce: 35, colorBlend: 0.70, severityColors: ['#dc2626', '#a855f7', '#f87171'] },
};

/**
 * Blend two hex colors. t=0 returns a, t=1 returns b.
 */
function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const accent = useAccentColor();
  const severity = useScoreStore((s) => s.currentSeverity);

  // Nuclear fallback: remount LiquidEther if WebGL context is unrecoverable
  const [webglKey, setWebglKey] = useState(0);
  useEffect(() => {
    const handler = () => {
      console.warn('[ThemeProvider] Rebuilding LiquidEther after context loss');
      setWebglKey((k) => k + 1);
    };
    window.addEventListener('norot:webgl-dead', handler);
    return () => window.removeEventListener('norot:webgl-dead', handler);
  }, []);

  const fluidParams = useMemo(() => {
    const params = SEVERITY_FLUID_PARAMS[severity] ?? SEVERITY_FLUID_PARAMS[0];
    // Blend accent ether colors with severity colors
    const colors: [string, string, string] = [
      lerpColor(accent.etherColors[0], params.severityColors[0], params.colorBlend),
      lerpColor(accent.etherColors[1], params.severityColors[1], params.colorBlend),
      lerpColor(accent.etherColors[2], params.severityColors[2], params.colorBlend),
    ];
    return { ...params, colors };
  }, [severity, accent.etherColors]);

  return (
    <ThemeContext.Provider value={{ theme: 'dark' }}>
      <div className="dark min-h-screen bg-background text-text-primary">
        {/* Liquid Ether background — opacity raised from 0.40 to 0.50 */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-50">
          <LiquidEther
            key={webglKey}
            colors={fluidParams.colors}
            resolution={0.35}
            mouseForce={fluidParams.mouseForce}
            cursorSize={80}
            autoDemo={true}
            autoSpeed={fluidParams.autoSpeed}
            autoIntensity={fluidParams.autoIntensity}
            autoResumeDelay={500}
            autoRampDuration={0.8}
          />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
