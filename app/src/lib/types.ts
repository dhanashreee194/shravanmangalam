export type Lang = 'en' | 'hi';
export type LangMap = Partial<Record<string, string>>;

export type ItemType = 'shloka' | 'mantra' | 'stotra' | 'gita' | 'bhajan' | 'aarti';
export type Level = 'kids' | 'easy' | 'medium' | 'advanced';

export interface Line {
  text: string;
  transliteration: string;
  meaning: LangMap;
  /** Respelling used only by the voice, to fix pronunciation. */
  say?: string;
  audioUrl?: string;
  /** The recording was made by the owner's voice clone rather than recorded live. */
  audioAi?: boolean;
  /** The meaning of this line in the owner's voice, per language. */
  meaningAudio?: LangMap;
}

export interface Item {
  id: string;
  /** Stable name of starter content, e.g. "narayan-kavach". */
  slug?: string;
  type: ItemType;
  title: LangMap;
  /** The title spoken in the owner's voice, per language. */
  titleAudio?: LangMap;
  deity: string;
  /** e.g. "Bhagavad Gita 4.7" */
  source?: string;
  level: Level;
  tags: string[];
  summary: LangMap;
  whenToChant: LangMap;
  lines: Line[];
  fullAudioUrl?: string;
  meaningAudio: LangMap;
  imageUrl?: string;
  order: number;
  published: boolean;
  updatedAt: string;
}

/** Pick the requested language, falling back to the other one. */
export function pick(map: LangMap | undefined, lang: Lang): string {
  if (!map) return '';
  return map[lang] || map.en || map.hi || '';
}
