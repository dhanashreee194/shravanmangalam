import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useSettings } from './settings';
import type { PromptKey } from './prompts';
import type { Item, Lang } from './types';

const CACHE_KEY = 'library.cache.v2';
// Copy of the library bundled into the app at build time, so it works on first launch even offline.
const SNAPSHOT = require('../../assets/library-snapshot.json') as { items: Item[]; prompts: PromptAudio };
const LEARNED_KEY = 'learned.v1';

/** Where the CMS lives. In development we reuse the Expo dev-server host, so real phones work too. */
export function resolveServer(override: string): string {
  if (override.trim()) return override.trim().replace(/\/+$/, '');
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `http://${window.location.hostname}:4000`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:4000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

/** Fetch the whole library; when offline, fall back to the last saved copy so learning keeps working. */
/** The owner's recordings of app messages: { welcome: { hi: '/uploads/…', en: … }, … } */
type PromptAudio = Partial<Record<string, Partial<Record<Lang, string>>>>;
type Library = { items: Item[]; prompts: PromptAudio };

async function fetchLibrary(server: string): Promise<Library & { status: 'ready' | 'offline' | 'error' }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${server}/api/library`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Library;
    const lib = { items: data.items, prompts: data.prompts ?? {} };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ server, ...lib })).catch(() => {});
    return { ...lib, status: 'ready' };
  } catch {
    const raw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
    const cached = raw ? (JSON.parse(raw) as Library) : null;
    const lib = cached?.items?.length ? cached : SNAPSHOT;
    return { items: lib.items ?? [], prompts: lib.prompts ?? {}, status: lib.items?.length ? 'offline' : 'error' };
  }
}

type Status = 'loading' | 'ready' | 'offline' | 'error';
interface Ctx {
  items: Item[];
  status: Status;
  server: string;
  refresh: () => Promise<void>;
  mediaUrl: (path?: string) => string | undefined;
  /** Full URL of the owner's recording of an app message, if it has been recorded. */
  promptUrl: (key: PromptKey, lang: Lang) => string | undefined;
  learned: Set<string>;
  markLearned: (id: string) => void;
}
const LibraryContext = createContext<Ctx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { serverUrl, ready } = useSettings();
  const server = resolveServer(serverUrl);
  const [items, setItems] = useState<Item[]>([]);
  const [prompts, setPrompts] = useState<PromptAudio>({});
  const [status, setStatus] = useState<Status>('loading');
  const [learned, setLearned] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setStatus((st) => (st === 'ready' ? st : 'loading'));
    const r = await fetchLibrary(server);
    setItems(r.items);
    setPrompts(r.prompts);
    setStatus(r.status);
  }, [server]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    fetchLibrary(server).then((r) => {
      if (!alive) return;
      setItems(r.items);
      setPrompts(r.prompts);
      setStatus(r.status);
    });
    return () => {
      alive = false;
    };
  }, [ready, server]);

  useEffect(() => {
    AsyncStorage.getItem(LEARNED_KEY)
      .then((raw) => raw && setLearned(new Set(JSON.parse(raw))))
      .catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const mediaUrl = (p?: string) => (!p ? undefined : /^https?:/.test(p) ? p : `${server}${p}`);
    return {
      items,
      status,
      server,
      refresh,
      mediaUrl,
      promptUrl: (key, lang) => mediaUrl(prompts[key]?.[lang]),
      learned,
      markLearned: (id) =>
        setLearned((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev).add(id);
          AsyncStorage.setItem(LEARNED_KEY, JSON.stringify([...next])).catch(() => {});
          return next;
        }),
    };
  }, [items, prompts, status, server, refresh, learned]);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
