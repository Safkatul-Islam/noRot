import { Severity, Persona, InterventionMode } from './types.js';

export interface SeverityBand {
  severity: Severity;
  label: string;
  scoreMin: number;
  scoreMax: number;
  color: string;
  mode: InterventionMode;
  audioTag: string;
}

export const SEVERITY_BANDS: SeverityBand[] = [
  { severity: 0, label: 'Locked In', scoreMin: 0, scoreMax: 15, color: '#22c55e', mode: 'none', audioTag: '' },
  { severity: 1, label: 'Focused', scoreMin: 16, scoreMax: 35, color: '#4ade80', mode: 'none', audioTag: '' },
  { severity: 2, label: 'Slightly Distracted', scoreMin: 36, scoreMax: 60, color: '#eab308', mode: 'nudge', audioTag: '[thoughtful]' },
  { severity: 3, label: 'Very Distracted', scoreMin: 61, scoreMax: 85, color: '#f97316', mode: 'remind', audioTag: '[concerned]' },
  { severity: 4, label: 'Cooked', scoreMin: 86, scoreMax: 100, color: '#ef4444', mode: 'interrupt', audioTag: '[thoughtful]' },
];

export const PERSONAS: Record<Persona, { label: string; description: string; voiceId: string }> = {
  calm_friend: { label: 'Calm Friend', description: 'Warm and supportive', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  coach: { label: 'Coach', description: 'Firm but encouraging', voiceId: 'onwK4e9ZLuTAKqWW03F9' },
  tough_love: { label: 'Tough Love', description: 'Aggressive and funny', voiceId: 'N2lVS1w4EtoT3dr4eOWO' },
};

export interface VoicePreset {
  id: string;
  label: string;
  voiceId: string;
  gender: 'M' | 'F';
  tone: string;
  previewText: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'sarah', label: 'Sarah', voiceId: 'EXAVITQu4vr4xnSDxMaL', gender: 'F', tone: 'Warm, conversational', previewText: 'Hey, let\'s get back on track. You\'ve got this.' },
  { id: 'daniel', label: 'Daniel', voiceId: 'onwK4e9ZLuTAKqWW03F9', gender: 'M', tone: 'Authoritative, calm', previewText: 'Time to refocus. What\'s the next step?' },
  { id: 'callum', label: 'Callum', voiceId: 'N2lVS1w4EtoT3dr4eOWO', gender: 'M', tone: 'Intense, direct', previewText: 'Stop scrolling. Get back to work. Now.' },
  { id: 'charlotte', label: 'Charlotte', voiceId: 'XB0fDUnXU5powFXDhCwa', gender: 'F', tone: 'Elegant, confident', previewText: 'You deserve to feel productive. Let\'s begin.' },
  { id: 'brian', label: 'Brian', voiceId: 'nPczCjzI2devNBz1zQrb', gender: 'M', tone: 'Energetic, friendly', previewText: 'Come on, let\'s crush it! What are we doing next?' },
  { id: 'lily', label: 'Lily', voiceId: 'pFZP5JQG7iQjIQuC4Bku', gender: 'F', tone: 'Soft, empathetic', previewText: 'It\'s okay to take a moment. Ready when you are.' },
];

/**
 * Returns the user's selected voice ID, or falls back to the persona's default voice.
 */
export function resolveVoiceId(selectedVoiceId: string, persona: Persona): string {
  if (selectedVoiceId) {
    const preset = VOICE_PRESETS.find((v) => v.id === selectedVoiceId || v.voiceId === selectedVoiceId);
    if (preset) return preset.voiceId;
  }
  return PERSONAS[persona].voiceId;
}

// Keep in sync with apps/api/app/constants.py.
export const SCORING_WEIGHTS = {
  distractRatio: 0.55,
  switchRate: 0.30,
  intentGap: 0.00,
  snoozePressure: 0.15,
};

export const LATE_NIGHT_MULTIPLIER = 1.25;
export const SNOOZE_PRESSURE_POINTS = 5;
export const SNOOZE_PRESSURE_DURATION_MIN = 10;
export const MAX_SNOOZE_PRESSURE = 3;

export const AUDIO_TAGS: Record<Severity, string> = {
  0: '',
  1: '',
  2: '[thoughtful]',
  3: '[concerned]',
  4: '[thoughtful]',
};

// --- Focus score helpers (inverted procrastination score) ---

export function toFocusScore(procrastinationScore: number): number {
  return 100 - procrastinationScore;
}

export interface FocusBand {
  label: string;
  scoreMin: number;
  scoreMax: number;
  color: string;
}

export const FOCUS_SEVERITY_BANDS: FocusBand[] = [
  { label: 'Locked In', scoreMin: 88, scoreMax: 100, color: '#22c55e' },
  { label: 'Focused', scoreMin: 63, scoreMax: 87, color: '#4ade80' },
  { label: 'Slightly Distracted', scoreMin: 38, scoreMax: 62, color: '#eab308' },
  { label: 'Very Distracted', scoreMin: 13, scoreMax: 37, color: '#f97316' },
  { label: 'Cooked', scoreMin: 0, scoreMax: 12, color: '#ef4444' },
];

export function getFocusBand(focusScore: number): FocusBand {
  return FOCUS_SEVERITY_BANDS.find(
    (band) => focusScore >= band.scoreMin && focusScore <= band.scoreMax
  ) ?? FOCUS_SEVERITY_BANDS[FOCUS_SEVERITY_BANDS.length - 1];
}

export function stripEmotionTags(text: string): string {
  return text.replace(/\[[\w]+\]\s*/g, '').trim();
}

// --- Health Impact Stats ---

export const HEALTH_IMPACT_STATS: string[] = [
  'Task-switching can cost up to 40% of productive time. — Rubinstein, Meyer & Evans, 2001',
  'Time perception impairment is a consistent feature of ADHD. — Ptacek et al., 2019',
  'Positive reinforcement can improve ADHD attention comparably to medication. — Fosco et al., 2015',
  'Adults with ADHD have significantly larger task-switching costs. — Tsal et al., 2018',
  'Procrastination is not laziness — it is an emotional regulation challenge. — Pychyl & Sirois, 2016',
  'Brief mindfulness exercises can reduce impulsive task-switching by up to 25%. — Smallwood & Schooler, 2015',
  'Working memory capacity predicts susceptibility to digital distraction. — Ophir, Nass & Wagner, 2009',
  'External structure (timers, lists) reduces cognitive load and supports focus. — Diamond, 2013',
  'Chronic procrastination affects roughly 20% of the adult population. — Steel, 2007',
  'Just 5 minutes of focused work can break the procrastination cycle. — Pychyl, 2013',
  'Self-compassion reduces procrastination more effectively than self-criticism. — Sirois, 2014',
  'Dopamine regulation differences in ADHD brains make starting tasks harder, not finishing them. — Volkow et al., 2011',
  'ADHD affects 3-7% of adults worldwide, many of whom are undiagnosed. — Fayyad et al., 2007',
];

export function getRandomHealthStat(): string {
  return HEALTH_IMPACT_STATS[Math.floor(Math.random() * HEALTH_IMPACT_STATS.length)];
}
