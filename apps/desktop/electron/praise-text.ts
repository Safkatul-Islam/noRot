import type { Persona } from '@norot/shared';

const variants: Record<Persona, string[]> = {
  calm_friend: [
    'Hey — you’re back above 90. That’s you taking control. Keep going.',
    'Nice. Focus is up again. Keep it gentle and keep it moving.',
    'You’re doing really well right now. Stay with it.',
    'That recovery was solid. Keep building that momentum.',
  ],
  coach: [
    'Good. Focus is back above 90. Keep the streak alive.',
    'That’s the standard. Stay locked in.',
    'Excellent recovery. Keep executing.',
    'This is what disciplined focus looks like. Keep going.',
  ],
  tough_love: [
    'There we go. Back above 90. Don’t you dare drift now.',
    'Good. You remembered who’s in charge. Keep it up.',
    'Nice recovery. Now keep working — no victory laps.',
    'Finally. Focus is high again. Stay on the task.',
  ],
};

const lastIdx = new Map<string, number>();

function pick(key: string, list: string[]): string {
  if (list.length === 1) return list[0];
  const prev = lastIdx.get(key);
  let idx = Math.floor(Math.random() * list.length);
  if (prev != null && idx === prev) idx = (idx + 1) % list.length;
  lastIdx.set(key, idx);
  return list[idx];
}

export function buildPraiseText(persona: Persona): string {
  const list = variants[persona] ?? variants.calm_friend;
  return pick(`praise:${persona}`, list);
}

