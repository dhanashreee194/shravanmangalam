// Prepares Sanskrit (Devanagari) text so a Hindi text-to-speech voice pronounces it the
// Sanskrit way. Hindi voices drop the visarga, swallow word-final anusvara and read "ॐ"
// oddly; these rules fix the most audible problems. Keep in sync with app/src/lib/pronounce.ts.

// Visarga (ः) is spoken as "h" plus an echo of the vowel before it: रामः → रामह, हरिः → हरिहि.
const VISARGA_ECHO = {
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

export function sanskritForTts(text) {
  return (
    text
      // ॐ is skipped or mispronounced by many voices.
      .replace(/ॐ/g, 'ओम्')
      // Avagraha marks an elided "a"; it should not be read aloud.
      .replace(/ऽ/g, '')
      // Compound-word hyphens and Latin/Devanagari verse numbers.
      .replace(/[-–—]/g, '')
      .replace(/[0-9०-९]+/g, '')
      // Visarga with vowel echo.
      .replace(/([ािीुूृेैोौ]?)ः/g, (_, v) => v + VISARGA_ECHO[v])
      // Word-final anusvara is "m" in Sanskrit: मधुरं → मधुरम्.
      .replace(/ं(?=[\s,.।॥!?]|$)/g, 'म्')
      // Dandas become pauses.
      .replace(/॥/g, '.')
      .replace(/।/g, ',')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
