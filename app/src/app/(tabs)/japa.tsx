import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Halo } from '../../components/KrishnaBanner';
import { Cancelled, useChanter } from '../../lib/chanter';
import { t } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { sanskritForTts } from '../../lib/pronounce';
import { useSettings } from '../../lib/settings';
import { GOLD, useTheme } from '../../lib/theme';
import { useVoice } from '../../lib/voices';

const BEADS = 108;
const KEY = 'japa.v1';

interface Mantra {
  key: string;
  name: { hi: string; en: string };
  text: string;
  /** The owner's recordings of the mantra, line by line (if recorded in the Voice Studio). */
  audio: string[];
}

/** Mantras for japa: from the library when present (so they play in the owner's voice), plus simple naam-japa. */
function useMantras(): Mantra[] {
  const { items } = useLibrary();
  return useMemo(() => {
    const fromLibrary = (en: string, key: string): Mantra | null => {
      const it = items.find((i) => i.title.en === en);
      if (!it) return null;
      return {
        key,
        name: { hi: it.title.hi || en, en },
        text: it.lines.map((l) => l.text).join(' '),
        audio: it.lines.map((l) => l.audioUrl).filter((u): u is string => Boolean(u)),
      };
    };
    return [
      fromLibrary('Hare Krishna Mahamantra', 'mahamantra'),
      fromLibrary('Om Namo Bhagavate Vasudevaya', 'vasudeva'),
      fromLibrary('Shri Krishna Govinda Hare Murare', 'govinda'),
      { key: 'radharaman', name: { hi: 'राधारमण', en: 'Radharaman' }, text: 'राधारमण', audio: [] },
      { key: 'radheshyam', name: { hi: 'राधेश्याम', en: 'Radheshyam' }, text: 'राधेश्याम', audio: [] },
      { key: 'sharanam', name: { hi: 'श्री कृष्णः शरणं मम', en: 'Shri Krishnah Sharanam Mama' }, text: 'श्री कृष्णः शरणं मम', audio: [] },
    ].filter((m): m is Mantra => Boolean(m));
  }, [items]);
}

const today = () => new Date().toDateString();

/** The mala: 108 beads in a circle, with a larger guru (sumeru) bead at the top. */
function MalaRing({ size, count }: { size: number; count: number }) {
  const r = size / 2 - 14;
  const beads = useMemo(
    () =>
      Array.from({ length: BEADS }, (_, i) => {
        const a = (i / BEADS) * Math.PI * 2 - Math.PI / 2 + (Math.PI * 2) / BEADS / 2;
        return { x: size / 2 + r * Math.cos(a), y: size / 2 + r * Math.sin(a) };
      }),
    [size, r],
  );
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="done" cx="0.35" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFF3B0" />
          <Stop offset="0.6" stopColor="#FACC15" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
        <RadialGradient id="todo" cx="0.35" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#A78B6D" />
          <Stop offset="1" stopColor="#5B3A22" />
        </RadialGradient>
        <RadialGradient id="guru" cx="0.35" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#99F6E4" />
          <Stop offset="1" stopColor="#0F766E" />
        </RadialGradient>
      </Defs>
      {/* the thread */}
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(250,204,21,0.25)" strokeWidth={1.5} fill="none" />
      {beads.map((b, i) => {
        const current = i === count - 1;
        return <Circle key={i} cx={b.x} cy={b.y} r={current ? 7.5 : 5} fill={i < count ? 'url(#done)' : 'url(#todo)'} />;
      })}
      {/* sumeru / guru bead */}
      <Circle cx={size / 2} cy={size / 2 - r} r={10} fill="url(#guru)" stroke="#FACC15" strokeWidth={1.5} />
    </Svg>
  );
}

export default function JapaScreen() {
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const { audio } = useLibrary();
  const s = t(lang);
  const mantras = useMantras();
  const chanter = useChanter();
  const hiVoice = useVoice('hi');
  const { width } = useWindowDimensions();
  const ringSize = Math.min(width - 48, 340);

  const [mantraKey, setMantraKey] = useState('mahamantra');
  const { promptUrl } = useLibrary();
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState({ day: today(), malas: 0, beads: 0, lifetime: 0 });
  const [auto, setAuto] = useState(false);
  const countRef = useRef(0);
  const mantra = mantras.find((m) => m.key === mantraKey) ?? mantras[0];

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setStats(saved.day === today() ? saved : { ...saved, day: today(), malas: 0, beads: 0 });
      })
      .catch(() => {});
  }, []);

  /** Count one bead. Light tap each bead; strong buzz + bell when a mala (108) completes. */
  const countBead = () => {
    const next = countRef.current + 1;
    const malaDone = next >= BEADS;
    countRef.current = malaDone ? 0 : next;
    setCount(countRef.current);
    pulse.value = withSequence(withTiming(1.08, { duration: 90 }), withSpring(1, { damping: 8 }));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(malaDone ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (malaDone) {
      // "राधारमण लाल की जय!" in the owner's voice if recorded, otherwise the bell.
      const jai = promptUrl('malaDone', lang);
      if (jai && !auto) chanter.playUrl(jai, 1, chanter.begin()).catch(() => {});
      else chanter.cue('done');
    }
    if (next % 27 === 0 || malaDone) AccessibilityInfo.announceForAccessibility(malaDone ? s.malaComplete : `${next}`);
    setStats((prev) => {
      const fresh = prev.day === today() ? prev : { ...prev, day: today(), malas: 0, beads: 0 };
      const updated = { ...fresh, beads: fresh.beads + 1, malas: fresh.malas + (malaDone ? 1 : 0), lifetime: fresh.lifetime + (malaDone ? 1 : 0) };
      AsyncStorage.setItem(KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    return malaDone;
  };

  /** "Chant with me": the owner's voice chants the mantra, and each recitation moves one bead. */
  useEffect(() => {
    if (!auto || !mantra) return;
    const token = chanter.begin();
    (async () => {
      try {
        for (;;) {
          let played = false;
          for (const u of mantra.audio) {
            const url = audio(u);
            if (!url) continue;
            try {
              await chanter.playUrl(url, 1, token);
              played = true;
            } catch (e) {
              if (e instanceof Cancelled) throw e;
            }
          }
          if (!played) await chanter.speak(sanskritForTts(mantra.text), { language: 'hi-IN', voice: hiVoice, rate: 0.6, pitch: 0.95 }, token);
          const malaDone = countBead();
          await chanter.wait(malaDone ? 2.5 : 0.35, token);
          if (malaDone) break;
        }
      } catch {}
      setAuto(false);
    })();
    return () => chanter.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, mantraKey]);

  const reset = () => {
    setAuto(false);
    countRef.current = 0;
    setCount(0);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ color: c.text, fontSize: fs(28), fontWeight: '900' }}>
              📿 {s.japaTitle}
            </Text>
            <Text style={{ color: c.muted, fontSize: fs(14), fontWeight: '700' }}>{s.japaSub}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.surface, borderColor: c.border }]} accessible accessibilityLabel={`${s.today}: ${stats.malas} ${s.malas}`}>
            <Text style={{ color: c.star, fontSize: fs(22), fontWeight: '900' }}>{stats.malas}</Text>
            <Text style={{ color: c.muted, fontSize: fs(11), fontWeight: '800' }}>{s.malasToday}</Text>
          </View>
        </Animated.View>

        {/* Mantra chooser */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
          {mantras.map((m) => {
            const active = m.key === mantra?.key;
            return (
              <Pressable
                key={m.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  setAuto(false);
                  setMantraKey(m.key);
                }}
                style={[styles.chip, { borderColor: active ? c.gold : c.border, backgroundColor: active ? 'rgba(250,204,21,0.16)' : c.surface }]}
              >
                <Text style={{ color: active ? c.star : c.text, fontSize: fs(15), fontWeight: '800' }}>{m.name[lang]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* The mala — tap anywhere on it to count */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${s.bead} ${count} / ${BEADS}. ${mantra?.name[lang] ?? ''}`}
          accessibilityHint={s.japaHint}
          onPress={() => {
            if (!auto) countBead();
          }}
          style={styles.ringWrap}
        >
          <Animated.View style={[{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }, pulseStyle]}>
            <Halo size={ringSize * 0.62} active={auto} />
            <View style={StyleSheet.absoluteFill}>
              <MalaRing size={ringSize} count={count} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Animated.Text key={count} entering={ZoomIn.duration(160)} style={{ color: c.text, fontSize: fs(64), fontWeight: '900', lineHeight: fs(72) }}>
                {count}
              </Animated.Text>
              <Text style={{ color: c.muted, fontSize: fs(15), fontWeight: '800' }}>/ {BEADS}</Text>
              <Text style={{ color: c.star, fontSize: fs(15), fontWeight: '800', marginTop: 6, textAlign: 'center', maxWidth: ringSize * 0.55 }} numberOfLines={2}>
                {mantra?.text}
              </Text>
            </View>
          </Animated.View>
          <Text style={{ color: c.muted, fontSize: fs(14), fontWeight: '700', marginTop: 8 }}>👆 {s.japaHint}</Text>
        </Pressable>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={auto ? s.stop : s.chantWithMe}
            onPress={() => setAuto((a) => !a)}
            style={{ flex: 1 }}
          >
            <LinearGradient colors={auto ? ['#BE123C', '#FB7185'] : [...GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mainBtn}>
              <Text style={{ fontSize: 22 }}>{auto ? '⏹️' : '🔊'}</Text>
              <Text style={{ color: auto ? '#fff' : c.onGold, fontSize: fs(17), fontWeight: '900' }}>{auto ? s.stop : s.chantWithMe}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={s.reset} onPress={reset} style={[styles.resetBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 22 }}>↺</Text>
          </Pressable>
        </View>

        <View style={[styles.statsRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontSize: fs(15), fontWeight: '800' }}>
            🪷 {s.today}: {stats.beads} {s.beads}
          </Text>
          <Text style={{ color: c.star, fontSize: fs(15), fontWeight: '800' }}>
            ✨ {s.lifetime}: {stats.lifetime} {s.malas}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 140, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  chip: { borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  ringWrap: { alignItems: 'center', paddingVertical: 4 },
  controls: { flexDirection: 'row', gap: 10 },
  mainBtn: { minHeight: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resetBtn: { width: 64, minHeight: 64, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
