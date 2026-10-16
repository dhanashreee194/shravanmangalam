import { TYPE_INFO } from './i18n';
import type { PromptKey } from './prompts';
import type { Item, ItemType, Lang } from './types';

export interface Collection {
  key: string;
  icon: string;
  label: Record<Lang, string>;
  /** Accent colour for this collection's tile. */
  tint: string;
  /** Background gradient for the collection's dashboard tile. */
  gradient: readonly [string, string];
  /** Key of the owner's recording of this collection's name (Voice Studio). */
  prompt: PromptKey;
  match: (i: Item) => boolean;
}

const KRISHNA = /krishna|कृष्ण|govind|gopal|vasudev|vishnu|narayan|madhav|mukund|radha/i;
export const isKrishna = (i: Item) => i.tags.includes('krishna') || KRISHNA.test(i.deity) || KRISHNA.test(i.title.en ?? '');
const isGita = (i: Item) => i.type === 'gita' || i.tags.includes('gita');

const TYPE_TINT: Record<ItemType, string> = {
  shloka: '#93C5FD',
  mantra: '#C084FC',
  stotra: '#FB923C',
  gita: '#FACC15',
  bhajan: '#34D399',
  aarti: '#FCA5A5',
};

const TYPE_GRADIENT: Record<ItemType, readonly [string, string]> = {
  shloka: ['#1D4ED8', '#1E1B4B'],
  mantra: ['#7E22CE', '#312E81'],
  stotra: ['#C2410C', '#7F1D1D'],
  gita: ['#B45309', '#7C2D12'],
  bhajan: ['#047857', '#134E4A'],
  aarti: ['#BE123C', '#7C2D12'],
};

const SPECIAL: Collection[] = [
  { key: 'krishna', icon: '🦚', label: { en: 'Shri Radharaman', hi: 'श्री राधारमण' }, tint: '#2DD4BF', gradient: ['#0F766E', '#1E3A8A'], prompt: 'col_krishna', match: isKrishna },
  { key: 'gita', icon: '📖', label: { en: 'Bhagavad Gita', hi: 'भगवद्गीता' }, tint: '#FACC15', gradient: ['#B45309', '#7C2D12'], prompt: 'col_gita', match: isGita },
  { key: 'kids', icon: '🧒', label: { en: 'For kids', hi: 'बच्चों के लिए' }, tint: '#F472B6', gradient: ['#BE185D', '#6D28D9'], prompt: 'col_kids', match: (i) => i.level === 'kids' },
];
const TYPES: Collection[] = (Object.keys(TYPE_INFO) as ItemType[])
  .filter((ty) => ty !== 'gita')
  .map((ty) => ({
    key: ty,
    icon: TYPE_INFO[ty].icon,
    label: { en: TYPE_INFO[ty].en, hi: TYPE_INFO[ty].hi },
    tint: TYPE_TINT[ty],
    gradient: TYPE_GRADIENT[ty],
    prompt: `col_${ty}` as PromptKey,
    match: (i: Item) => i.type === ty,
  }));
const ALL: Collection = { key: 'all', icon: '📿', label: { en: 'Everything', hi: 'सभी' }, tint: '#A5B4FC', gradient: ['#4338CA', '#1E1B4B'], prompt: 'col_all', match: () => true };

/** Collections shown on the home screen (and in Listen mode), skipping empty ones. */
export function collectionsFor(items: Item[]): { collection: Collection; items: Item[] }[] {
  return [...SPECIAL, ...TYPES, ALL]
    .map((collection) => ({ collection, items: items.filter(collection.match) }))
    .filter((c) => c.items.length > 0);
}

export function findCollection(key: string): Collection {
  return [...SPECIAL, ...TYPES, ALL].find((c) => c.key === key) ?? ALL;
}
