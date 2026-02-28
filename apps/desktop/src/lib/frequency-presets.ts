export type FrequencyLevel = 0 | 1 | 2 | 3 | 4;

export interface FrequencyPreset {
  id: FrequencyLevel;
  label: string;
  scoreThreshold: number;
  cooldownSeconds: number;
}

export const FREQUENCY_PRESETS: FrequencyPreset[] = [
  { id: 0, label: 'Rarely',       scoreThreshold: 70, cooldownSeconds: 600 },
  { id: 1, label: 'Occasionally', scoreThreshold: 50, cooldownSeconds: 360 },
  { id: 2, label: 'Balanced',     scoreThreshold: 35, cooldownSeconds: 180 },
  { id: 3, label: 'Frequently',   scoreThreshold: 20, cooldownSeconds: 90  },
  { id: 4, label: 'Often',        scoreThreshold: 10, cooldownSeconds: 45  },
];

export const DEFAULT_FREQUENCY: FrequencyLevel = 2;

/**
 * Given existing scoreThreshold + cooldownSeconds values, find the closest
 * preset. This lets us backwards-compatibly snap old user settings to a
 * discrete frequency level.
 */
export function frequencyFromSettings(
  scoreThreshold: number,
  cooldownSeconds: number,
): FrequencyLevel {
  let bestIndex = DEFAULT_FREQUENCY;
  let bestDistance = Infinity;

  for (const preset of FREQUENCY_PRESETS) {
    // Normalise both dimensions to 0-1 before computing distance so that
    // threshold (0-100) and cooldown (45-600) are weighted equally.
    const tDiff = (scoreThreshold - preset.scoreThreshold) / 100;
    const cDiff = (cooldownSeconds - preset.cooldownSeconds) / 600;
    const distance = tDiff * tDiff + cDiff * cDiff;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = preset.id;
    }
  }

  return bestIndex;
}
