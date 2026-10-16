import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from './types';

export interface Settings {
  lang: Lang;
  textSize: 'normal' | 'large' | 'xlarge';
  /** How many times each line is repeated in "Repeat after me". */
  repeatCount: number;
  /** 'slow' plays chanting at 0.75x — easier to follow. */
  speed: 'slow' | 'normal';
  showTransliteration: boolean;
  /** Override for the CMS address; empty = automatic. */
  serverUrl: string;
  /** Soft temple-bell sound when it is the learner's turn. */
  chime: boolean;
  /** Open straight into Listen mode (for blind or low-vision users). */
  listenOnStart: boolean;
}

const DEFAULTS: Settings = {
  lang: 'hi',
  textSize: 'large',
  repeatCount: 3,
  speed: 'slow',
  showTransliteration: true,
  serverUrl: '',
  chime: true,
  listenOnStart: false,
};
const KEY = 'settings.v1';

type Ctx = Settings & { update: (patch: Partial<Settings>) => void; ready: boolean };
const SettingsContext = createContext<Ctx>({ ...DEFAULTS, update: () => {}, ready: false });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSettings({ ...DEFAULTS, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      ready,
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [settings, ready],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
