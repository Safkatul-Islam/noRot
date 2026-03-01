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
  { severity: 0, label: 'Focused', scoreMin: 0, scoreMax: 24, color: '#22c55e', mode: 'none', audioTag: '' },
  { severity: 1, label: 'Drifting', scoreMin: 25, scoreMax: 49, color: '#eab308', mode: 'nudge', audioTag: '[thoughtful]' },
  { severity: 2, label: 'Distracted', scoreMin: 50, scoreMax: 69, color: '#f97316', mode: 'remind', audioTag: '[thoughtful]' },
  { severity: 3, label: 'Procrastinating', scoreMin: 70, scoreMax: 89, color: '#ef4444', mode: 'interrupt', audioTag: '[concerned]' },
  { severity: 4, label: 'Crisis', scoreMin: 90, scoreMax: 100, color: '#a855f7', mode: 'crisis', audioTag: '[thoughtful]' },
];

export const PERSONAS: Record<Persona, { label: string; description: string; voiceId: string }> = {
  calm_friend: { label: 'Calm Friend', description: 'Warm and supportive', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  coach: { label: 'Coach', description: 'Firm but encouraging', voiceId: 'onwK4e9ZLuTAKqWW03F9' },
  tough_love: { label: 'Tough Love', description: 'Aggressive and funny', voiceId: 'N2lVS1w4EtoT3dr4eOWO' },
};

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
  1: '[thoughtful]',
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
  { label: 'Focused', scoreMin: 76, scoreMax: 100, color: '#22c55e' },
  { label: 'Drifting', scoreMin: 51, scoreMax: 75, color: '#eab308' },
  { label: 'Distracted', scoreMin: 31, scoreMax: 50, color: '#f97316' },
  { label: 'Procrastinating', scoreMin: 11, scoreMax: 30, color: '#ef4444' },
  { label: 'Crisis', scoreMin: 0, scoreMax: 10, color: '#a855f7' },
];

export function getFocusBand(focusScore: number): FocusBand {
  return FOCUS_SEVERITY_BANDS.find(
    (band) => focusScore >= band.scoreMin && focusScore <= band.scoreMax
  ) ?? FOCUS_SEVERITY_BANDS[FOCUS_SEVERITY_BANDS.length - 1];
}

export function stripEmotionTags(text: string): string {
  return text.replace(/\[[\w]+\]\s*/g, '').trim();
}

export const INTERVENTION_SCRIPTS: Record<Persona, Record<number, string>> = {
  calm_friend: {
    1: '[thoughtful] Hey, I noticed you\'ve been scrolling for a while. Maybe take a breath and refocus?',
    2: '[thoughtful] I notice you\'ve drifted a bit. What was the next small step on your task?',
    3: '[concerned] It looks like you\'ve been away from your work for a while. What\'s making it hard to start?',
    4: '[thoughtful] Hey... I know things feel heavy right now. It\'s okay to take a break. Want to talk about it?',
  },
  coach: {
    1: '[thoughtful] Quick check-in — are you working on what you planned? Let\'s stay on track.',
    2: '[thoughtful] You\'ve been switching a lot. What\'s the one thing you could do in the next five minutes?',
    3: '[concerned] I can see you\'re stuck. What\'s the smallest piece of your task you could tackle right now?',
    4: '[thoughtful] I see you\'re struggling. That\'s okay. Let\'s take this one step at a time.',
  },
  tough_love: {
    1: '[thoughtful] BRUH. You\'re drifting. WHAT THE FUCK were you actually about to work on, lol?',
    2: '[thoughtful] You\'re distracted. CLOSE IT and pick ONE 5-minute step. What is it, bitch?',
    3: '[concerned] You\'ve been procrastinating long enough. Start the task - ugly is fine. What\'s step one? GO.',
    4: '[thoughtful] Crisis mode. STOP. Breathe, stand up, drink water - then pick the smallest next move.',
  },
};

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
