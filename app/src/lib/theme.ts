import { useSettings } from './settings';

/**
 * "Krishna night": Shyam's dark-blue sky, peacock teal, pitambar gold and lotus pink.
 * One theme for everyone — high contrast (cream on deep blue) is also easiest for elderly eyes.
 */
export const colors = {
  night: '#060A22',
  shyam: '#101A52',
  peacockDeep: '#0A3D4A',
  surface: 'rgba(255,255,255,0.07)',
  surfaceStrong: 'rgba(255,255,255,0.12)',
  border: 'rgba(250,204,21,0.22)',
  text: '#FFF8E7',
  muted: '#B9C2EA',
  gold: '#FACC15',
  goldDeep: '#F59E0B',
  onGold: '#1A1203',
  peacock: '#2DD4BF',
  lotus: '#F472B6',
  krishnaBlue: '#6366F1',
  listen: '#93C5FD',
  yourTurn: '#86EFAC',
  star: '#FDE68A',
};
export type Colors = typeof colors;

/** Background gradient stops (top → bottom). */
export const SKY = [colors.night, colors.shyam, colors.peacockDeep] as const;
/** Gold gradient for primary buttons. */
export const GOLD = [colors.gold, colors.goldDeep] as const;

const SCALE = { normal: 1, large: 1.25, xlarge: 1.5 } as const;

export function useTheme() {
  const { textSize } = useSettings();
  const s = SCALE[textSize];
  return { c: colors, fs: (n: number) => Math.round(n * s), scale: s };
}
