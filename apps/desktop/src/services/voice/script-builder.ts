import type { ScoreResponse, Severity } from '@norot/shared';
import { AUDIO_TAGS, stripEmotionTags } from '@norot/shared';

function sanitizeToughLoveText(input: string): string {
  const raw = (input ?? '').toString();
  if (!raw) return '';

  const preserve = (matched: string, replacement: string): string => {
    if (matched.toUpperCase() === matched) return replacement.toUpperCase();
    const cap = matched[0] === matched[0]?.toUpperCase();
    return cap ? replacement[0]!.toUpperCase() + replacement.slice(1) : replacement;
  };

  let t = raw;
  // Phrase-level cleanups first
  t = t.replace(/\bno\s+fucking\s+excuses\b/gi, (m) => preserve(m, 'no excuses'));
  t = t.replace(/\bget\s+the\s+fuck\s+started\b/gi, (m) => preserve(m, 'get started'));
  t = t.replace(/\bwhat\s+the\s+fuck\b/gi, (m) => preserve(m, 'what the hell'));
  t = t.replace(/\blisten\s+the\s+fuck\s+up\b/gi, (m) => preserve(m, 'listen the hell up'));

  // Word-level replacements
  t = t.replace(/\bfucking\b/gi, (m) => preserve(m, 'seriously'));
  t = t.replace(/\bfuck\b/gi, (m) => preserve(m, 'hell'));
  t = t.replace(/\bshit\b/gi, (m) => preserve(m, 'mess'));
  t = t.replace(/\bbitch\b/gi, (m) => preserve(m, 'jerk'));
  t = t.replace(/\bdumbass\b/gi, (m) => preserve(m, 'dummy'));
  t = t.replace(/\basshole\b/gi, (m) => preserve(m, 'jerk'));
  t = t.replace(/\bbastard\b/gi, (m) => preserve(m, 'jerk'));
  t = t.replace(/\bstupid\s+ass\b/gi, (m) => preserve(m, 'dumb'));

  // Normalize whitespace
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * Returns the text for TTS.
 * The API may include leading direction tags (e.g., "[concerned] What's making it hard to start?"),
 * so we strip those before sending to the TTS provider.
 */
export function getScript(response: ScoreResponse): string {
  const base = stripEmotionTags(response.recommendation.text);
  return response.recommendation.persona === 'tough_love'
    ? sanitizeToughLoveText(base)
    : base;
}

/**
 * Returns the audio tag for a given severity level.
 * e.g., severity 3 -> "[concerned]"
 */
export function getAudioTag(severity: Severity): string {
  return AUDIO_TAGS[severity];
}
