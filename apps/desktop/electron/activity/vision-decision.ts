export type ActivityCategory = 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown';

export type ActivityKind =
  | 'unknown'
  | 'coding'
  | 'spreadsheets'
  | 'presentations'
  | 'writing'
  | 'docs'
  | 'email'
  | 'chat'
  | 'video'
  | 'social_feed'
  | 'shopping'
  | 'games'
  | 'settings'
  | 'file_manager';

export type VisionLabel = { label: string; kind: ActivityKind; category: ActivityCategory };
export type ZeroShotOutput = { label: string; score: number };

export const VISION_LABELS: VisionLabel[] = [
  { label: 'writing code in an IDE', kind: 'coding', category: 'productive' },
  { label: 'debugging code', kind: 'coding', category: 'productive' },
  { label: 'reading technical documentation', kind: 'docs', category: 'productive' },
  { label: 'reading a PDF or document', kind: 'docs', category: 'productive' },
  { label: 'writing a document', kind: 'writing', category: 'productive' },
  { label: 'working in a spreadsheet', kind: 'spreadsheets', category: 'productive' },
  { label: 'editing a presentation slide', kind: 'presentations', category: 'productive' },
  { label: 'checking work email', kind: 'email', category: 'productive' },
  { label: 'reading professional messages', kind: 'chat', category: 'productive' },
  { label: 'watching a tutorial video', kind: 'video', category: 'productive' },
  { label: 'watching an educational lecture with slides', kind: 'video', category: 'productive' },
  { label: 'watching a math lesson with equations', kind: 'video', category: 'productive' },
  { label: 'watching a programming tutorial', kind: 'video', category: 'productive' },

  { label: 'chatting casually in a messaging app', kind: 'chat', category: 'social' },
  { label: 'scrolling a social media feed', kind: 'social_feed', category: 'social' },

  { label: 'watching an online video for entertainment', kind: 'video', category: 'entertainment' },
  { label: 'watching cartoons or anime', kind: 'video', category: 'entertainment' },
  { label: 'watching an anime episode', kind: 'video', category: 'entertainment' },
  { label: 'watching a movie or TV show', kind: 'video', category: 'entertainment' },
  { label: 'looking at memes or funny content', kind: 'social_feed', category: 'entertainment' },
  { label: 'watching sports highlights', kind: 'video', category: 'entertainment' },
  { label: 'watching a music video', kind: 'video', category: 'entertainment' },
  { label: 'shopping online', kind: 'shopping', category: 'entertainment' },
  { label: 'playing a video game', kind: 'games', category: 'entertainment' },
];

const LABEL_META = new Map<string, VisionLabel>(VISION_LABELS.map((l) => [l.label, l]));

export type VisionAttemptDecision = {
  decidedCategory: 'productive' | 'social' | 'entertainment' | null;
  decidedKind: ActivityKind;
  confidence: number; // 0-1
  productiveScore: number;
  unproductiveScore: number;
  socialScore: number;
  entertainmentScore: number;
  topLabel?: string;
  topScore?: number;
  secondLabel?: string;
  secondScore?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function analyzeVisionOutputs(outputs: ZeroShotOutput[]): VisionAttemptDecision {
  let productiveScore = 0;
  let socialScore = 0;
  let entertainmentScore = 0;

  let topAllLabel: string | undefined;
  let topAllScore: number | undefined;
  let secondAllLabel: string | undefined;
  let secondAllScore: number | undefined;

  let topProductiveLabel: string | undefined;
  let topProductiveScore: number | undefined;
  let topSocialLabel: string | undefined;
  let topSocialScore: number | undefined;
  let topEntertainmentLabel: string | undefined;
  let topEntertainmentScore: number | undefined;

  for (const o of outputs) {
    if (!o || typeof o.label !== 'string' || typeof o.score !== 'number') continue;
    if (!Number.isFinite(o.score) || o.score <= 0) continue;
    const meta = LABEL_META.get(o.label);
    if (!meta) continue;

    if (meta.category === 'productive') productiveScore += o.score;
    else if (meta.category === 'social') socialScore += o.score;
    else if (meta.category === 'entertainment') entertainmentScore += o.score;

    if (topAllScore == null || o.score > topAllScore) {
      secondAllScore = topAllScore;
      secondAllLabel = topAllLabel;
      topAllScore = o.score;
      topAllLabel = o.label;
    } else if (secondAllScore == null || o.score > secondAllScore) {
      secondAllScore = o.score;
      secondAllLabel = o.label;
    }

    if (meta.category === 'productive') {
      if (topProductiveScore == null || o.score > topProductiveScore) {
        topProductiveScore = o.score;
        topProductiveLabel = o.label;
      }
    } else if (meta.category === 'social') {
      if (topSocialScore == null || o.score > topSocialScore) {
        topSocialScore = o.score;
        topSocialLabel = o.label;
      }
    } else if (meta.category === 'entertainment') {
      if (topEntertainmentScore == null || o.score > topEntertainmentScore) {
        topEntertainmentScore = o.score;
        topEntertainmentLabel = o.label;
      }
    }
  }

  const unproductiveScore = socialScore + entertainmentScore;
  const total = productiveScore + unproductiveScore;
  const diff = productiveScore - unproductiveScore;
  const margin = total > 0 ? Math.abs(diff) / total : 0;
  const confidence = clamp(margin, 0, 1);

  // If we got no usable scores at all, remain undecided.
  if (total <= 0) {
    return {
      decidedCategory: null,
      decidedKind: 'unknown',
      confidence: 0,
      productiveScore: 0,
      unproductiveScore: 0,
      socialScore: 0,
      entertainmentScore: 0,
    };
  }

  // Always produce a decision to avoid "infinite scanning" with no outcome.
  // If it's close to a tie, default to productive (per user preference).
  const nearTie = margin < 0.06;
  if (diff >= 0 || nearTie) {
    const label = topProductiveLabel ?? topAllLabel;
    const kind = label ? (LABEL_META.get(label)?.kind ?? 'unknown') : 'unknown';
    const score =
      label && label === topProductiveLabel ? topProductiveScore : topAllScore;
    return {
      decidedCategory: 'productive',
      decidedKind: kind,
      confidence,
      productiveScore,
      unproductiveScore,
      socialScore,
      entertainmentScore,
      ...(label ? { topLabel: label } : {}),
      ...(score != null ? { topScore: score } : {}),
      ...(secondAllLabel ? { secondLabel: secondAllLabel } : {}),
      ...(secondAllScore != null ? { secondScore: secondAllScore } : {}),
    };
  }

  const decidedCategory: 'social' | 'entertainment' =
    socialScore >= entertainmentScore ? 'social' : 'entertainment';
  const label = decidedCategory === 'social' ? topSocialLabel : topEntertainmentLabel;
  const kind = label ? (LABEL_META.get(label)?.kind ?? 'unknown') : 'unknown';
  const score = decidedCategory === 'social' ? topSocialScore : topEntertainmentScore;

  return {
    decidedCategory,
    decidedKind: kind,
    confidence,
    productiveScore,
    unproductiveScore,
    socialScore,
    entertainmentScore,
    ...(label ? { topLabel: label } : {}),
    ...(score != null ? { topScore: score } : {}),
    ...(secondAllLabel ? { secondLabel: secondAllLabel } : {}),
    ...(secondAllScore != null ? { secondScore: secondAllScore } : {}),
  };
}

export function voteVisionDecisions(attempts: VisionAttemptDecision[]): VisionAttemptDecision {
  const decided = attempts.filter((a) => a.decidedCategory !== null);
  if (decided.length === 0) {
    // Return the "most confident" uncertain attempt for debug numbers.
    return attempts.slice().sort((a, b) => b.confidence - a.confidence)[0] ?? {
      decidedCategory: null,
      decidedKind: 'unknown',
      confidence: 0,
      productiveScore: 0,
      unproductiveScore: 0,
      socialScore: 0,
      entertainmentScore: 0,
    };
  }

  const counts = new Map<string, number>();
  const confSum = new Map<string, number>();
  for (const a of decided) {
    const key = a.decidedCategory!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    confSum.set(key, (confSum.get(key) ?? 0) + a.confidence);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) return countDiff;
    return (confSum.get(b[0]) ?? 0) - (confSum.get(a[0]) ?? 0);
  });

  const winner = sorted[0]?.[0] as VisionAttemptDecision['decidedCategory'] | undefined;
  if (!winner) return decided[0]!;

  const winnerAttempts = decided.filter((a) => a.decidedCategory === winner);
  // Return the most confident attempt among the winning category.
  return winnerAttempts.sort((a, b) => b.confidence - a.confidence)[0]!;
}
