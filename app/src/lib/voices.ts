import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

export type Voice = Speech.Voice;

let cache: Promise<Voice[]> | null = null;
export function loadVoices(): Promise<Voice[]> {
  if (!cache) cache = Speech.getAvailableVoicesAsync().catch(() => [] as Voice[]);
  return cache;
}

// Novelty voices that ship with iOS/macOS and sound robotic or silly.
const NOVELTY =
  /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;

const norm = (lang: string) => lang.toLowerCase().replace('_', '-');

/** Higher = more natural. Enhanced/premium (iOS) and network/neural (Android) voices sound most human. */
function score(v: Voice): number {
  const name = `${v.name} ${v.identifier}`.toLowerCase();
  let s = 0;
  if (v.quality === Speech.VoiceQuality.Enhanced) s += 10;
  if (name.includes('premium')) s += 12;
  if (name.includes('enhanced')) s += 8;
  if (name.includes('network') || name.includes('neural')) s += 8;
  if (name.includes('local')) s += 2;
  if (norm(v.language).endsWith('-in')) s += 3;
  return s;
}

/** Voices for 'hi' or 'en', most natural first. English prefers Indian English. */
export function rankVoices(voices: Voice[], lang: 'hi' | 'en'): Voice[] {
  return voices
    .filter((v) => norm(v.language).startsWith(lang) && !NOVELTY.test(v.name))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/**
 * Fallback only: the phone voice used for anything the owner has not recorded yet.
 * Always the most natural installed voice — users don't choose voices; the app speaks in the owner's voice.
 */
export function useVoice(lang: 'hi' | 'en'): string | undefined {
  const [best, setBest] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    loadVoices().then((all) => {
      if (alive) setBest(rankVoices(all, lang)[0]?.identifier);
    });
    return () => {
      alive = false;
    };
  }, [lang]);
  return best;
}
