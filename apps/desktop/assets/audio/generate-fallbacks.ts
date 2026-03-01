/**
 * Standalone script to pre-generate fallback MP3 files for all persona/severity combos.
 *
 * Run with:
 *   ELEVENLABS_API_KEY=your_key npx tsx assets/audio/generate-fallbacks.ts
 *
 * Generates 12 files total (3 personas x 4 severity levels 1-4):
 *   assets/audio/calm_friend/severity-1.mp3
 *   assets/audio/calm_friend/severity-2.mp3
 *   ...
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY environment variable is required.');
  process.exit(1);
}

const PERSONAS: Record<string, string> = {
  calm_friend: 'EXAVITQu4vr4xnSDxMaL',
  coach: 'onwK4e9ZLuTAKqWW03F9',
  tough_love: 'N2lVS1w4EtoT3dr4eOWO',
};

const SCRIPTS: Record<string, Record<number, string>> = {
  calm_friend: {
    1: '[thoughtful] Hey, I noticed you drifted a little. Want to get back on track?',
    2: '[thoughtful] I notice you have been off task for a while. What was the next small step you were planning?',
    3: '[concerned] It looks like you have been away from your work for a bit. What is making it hard to start?',
    4: '[thoughtful] I know things feel overwhelming right now. Let us take a breath and start small.',
  },
  coach: {
    1: '[thoughtful] Quick check in. You are drifting a bit. Bring it back.',
    2: '[thoughtful] You have been switching a lot. What is the one thing you could do in the next five minutes?',
    3: '[concerned] I can see you are stuck. What is the smallest piece you could tackle right now?',
    4: '[thoughtful] I see you are struggling. Let us break this down into one small step.',
  },
  tough_love: {
    1: '[thoughtful] Noticed you drifting. Be honest with yourself. What were you about to work on?',
    2: '[thoughtful] Real talk. What is pulling you away from your work right now?',
    3: '[concerned] You have been off track a while. What would it take to get just one thing done right now?',
    4: '[thoughtful] Look, I know it is hard. But be gentle with yourself. What do you actually need right now?',
  },
};

async function synthesize(text: string, voiceId: string): Promise<ArrayBuffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.75,
        speed: 1.08,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  return response.arrayBuffer();
}

async function main() {
  for (const [persona, voiceId] of Object.entries(PERSONAS)) {
    const dir = join(__dirname, persona);
    mkdirSync(dir, { recursive: true });

    for (const [sevStr, text] of Object.entries(SCRIPTS[persona])) {
      const severity = Number(sevStr);
      const filePath = join(dir, `severity-${severity}.mp3`);

      console.log(`Generating: ${persona}/severity-${severity}.mp3 ...`);
      try {
        const data = await synthesize(text, voiceId);
        writeFileSync(filePath, Buffer.from(data));
        console.log(`  Saved: ${filePath}`);
      } catch (err) {
        console.error(`  FAILED: ${err}`);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  console.log('Done!');
}

main();
