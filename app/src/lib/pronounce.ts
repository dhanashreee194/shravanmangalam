// Prepares Sanskrit (Devanagari) text so a Hindi / Indian text-to-speech voice pronounces it
// the Sanskrit way, and chants it with natural breaths. Indian voices drop the visarga,
// swallow word-final anusvara, read "ॐ" oddly and run whole verse lines together in one
// breath; these rules fix the most audible problems. Keep in sync with cms/lib/pronounce.js.

// Visarga (ः) is spoken as "h" plus an echo of the vowel before it: रामः → रामह, हरिः → हरिहि.
const VISARGA_ECHO: Record<string, string> = {
  '': 'ह',
  'ा': 'हा',
  'ि': 'हि',
  'ी': 'हि',
  'ु': 'हु',
  'ू': 'हु',
  'ृ': 'हृ',
  'े': 'हे',
  'ै': 'हि',
  'ो': 'हो',
  'ौ': 'हु',
};

const VIRAMA = '्';
const isConsonant = (ch: string) => (ch >= 'क' && ch <= 'ह') || (ch >= 'क़' && ch <= 'य़');
const isIndependentVowel = (ch: string) => (ch >= 'ऄ' && ch <= 'औ') || ch === 'ॠ' || ch === 'ॡ';

/** Number of syllables (aksharas) in Devanagari text: a consonant not silenced by a virama, or a vowel letter. */
export function syllables(word: string): number {
  let n = 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (isIndependentVowel(ch) || (isConsonant(ch) && word[i + 1] !== VIRAMA)) n++;
  }
  return n;
}

/**
 * A verse line is usually two padas of 8 syllables. Add a short breath (comma) at the word
 * boundary nearest the middle, so the voice chants it in two calm halves instead of one rush.
 */
function addBreath(segment: string): string {
  const words = segment.trim().split(/\s+/);
  if (words.length < 2) return segment.trim();
  const counts = words.map(syllables);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total < 14) return segment.trim();
  let best = 0;
  let bestGap = Infinity;
  let cum = 0;
  for (let i = 0; i < words.length - 1; i++) {
    cum += counts[i];
    const gap = Math.abs(cum - total / 2);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  // Only breathe where it lands close to the middle (within 3 syllables).
  if (bestGap > 3) return segment.trim();
  return [...words.slice(0, best + 1), ','].join(' ').replace(' ,', ',') + ' ' + words.slice(best + 1).join(' ');
}

export function sanskritForTts(text: string): string {
  const prepared = text
    // Invisible joiners confuse some voices.
    .replace(/[​-‍﻿]/g, '')
    // ॐ is skipped or mispronounced by many voices; it is held, then a pause.
    .replace(/ॐ\s*(?=\S)/g, 'ओम्, ')
    .replace(/ॐ/g, 'ओम्')
    // Avagraha marks an elided "a"; it should not be read aloud.
    .replace(/ऽ/g, '')
    // Compound-word hyphens and Latin/Devanagari verse numbers.
    .replace(/[-–—]/g, '')
    .replace(/[0-9०-९]+/g, '')
    // Visarga with vowel echo.
    .replace(/([ािीुूृेैोौ]?)ः/g, (_, v: string) => v + VISARGA_ECHO[v])
    // Word-final anusvara is "m" in Sanskrit: मधुरं → मधुरम्.
    .replace(/ं(?=[\s,.।॥!?]|$)/g, 'म्');
  // Breathe in the middle of long pada lines, then turn dandas into pauses.
  return prepared
    .split(/([।॥,.!?])/)
    .map((part, i) => (i % 2 === 0 ? addBreath(part) : part))
    .join('')
    .replace(/॥/g, '.')
    .replace(/।/g, ',')
    .replace(/\s+([,.])/g, '$1')
    .replace(/([,.])(?=\S)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}
