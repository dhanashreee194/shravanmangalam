import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'progress.v1';

interface Stored {
  /** The shloka opened most recently — for "Continue learning". */
  lastItemId?: string;
  /** Days (YYYY-MM-DD, local time) on which a lesson was completed. */
  days: string[];
}

interface Ctx {
  lastItemId?: string;
  /** Consecutive days of practice, ending today (or yesterday, if today isn't done yet). */
  streak: number;
  practicedToday: boolean;
  openItem: (id: string) => void;
  practiced: () => void;
}

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function streakOf(days: Set<string>): number {
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet: count up to yesterday
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const ProgressContext = createContext<Ctx>({ streak: 0, practicedToday: false, openItem: () => {}, practiced: () => {} });

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>({ days: [] });

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setData({ days: [], ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const days = new Set(data.days);
    const save = (next: Stored) => {
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    };
    return {
      lastItemId: data.lastItemId,
      streak: streakOf(days),
      practicedToday: days.has(dayKey()),
      openItem: (id) => setData((prev) => (prev.lastItemId === id ? prev : save({ ...prev, lastItemId: id }))),
      practiced: () =>
        setData((prev) => (prev.days.includes(dayKey()) ? prev : save({ ...prev, days: [...prev.days.slice(-400), dayKey()] }))),
    };
  }, [data]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export const useProgress = () => useContext(ProgressContext);
