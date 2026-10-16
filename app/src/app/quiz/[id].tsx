import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { BigButton } from '../../components/BigButton';
import { PetalShower } from '../../components/Motion';
import { useChanter } from '../../lib/chanter';
import { t } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { useSettings } from '../../lib/settings';
import { GOLD, useTheme } from '../../lib/theme';
import { Item, pick } from '../../lib/types';
import { useLesson } from '../../lib/useLesson';

const ROUNDS = 10;
const words = (text: string) =>
  text
    .replace(/[।॥,.!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
/** Small seeded random generator (mulberry32), so a question is a pure function of its seed. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(a: T[], rand: () => number) =>
  a
    .map((v) => ({ v, k: rand() }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.v);

interface Question {
  item: Item;
  lineIndex: number;
  before: string;
  after: string;
  answer: string;
  options: string[];
}

/** Hide one meaningful word of a random line; offer it with two look-alike distractors. */
function makeQuestion(pool: Item[], everything: Item[], seed: number): Question | null {
  const rand = rng(seed);
  for (let tries = 0; tries < 30; tries++) {
    const item = pool[Math.floor(rand() * pool.length)];
    if (!item) return null;
    const lineIndex = Math.floor(rand() * item.lines.length);
    const w = words(item.lines[lineIndex].text);
    const candidates = w.map((word, i) => ({ word, i })).filter(({ word }) => word.length >= 3 && word !== 'ॐ');
    if (!candidates.length) continue;
    const { word: answer, i } = candidates[Math.floor(rand() * candidates.length)];
    const others = shuffle(
      [...new Set(everything.flatMap((it) => it.lines.flatMap((l) => words(l.text))))].filter((x) => x !== answer && x.length >= 3 && x !== 'ॐ'),
      rand,
    ).slice(0, 2);
    if (others.length < 2) continue;
    return { item, lineIndex, before: w.slice(0, i).join(' '), after: w.slice(i + 1).join(' '), answer, options: shuffle([answer, ...others], rand) };
  }
  return null;
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const { items } = useLibrary();
  const s = t(lang);
  const chanter = useChanter();

  // A specific shloka, or a mix of everything ("any").
  const pool = useMemo(() => (id && id !== 'any' ? items.filter((i) => i.id === id) : items), [id, items]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  // A fresh random start each game; each round's question is derived from it.
  const [gameSeed, setGameSeed] = useState(() => Date.now() % 1_000_000);
  const q = useMemo(() => makeQuestion(pool, items, gameSeed * 31 + round), [pool, items, gameSeed, round]);
  const [picked, setPicked] = useState<string | null>(null);
  const finished = round > ROUNDS;
  const lesson = useLesson(q?.item, chanter);

  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const choose = (option: string) => {
    if (!q || picked) return;
    setPicked(option);
    const right = option === q.answer;
    if (right) {
      setScore((n) => n + 1);
      chanter.cue('turn');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      shake.set(withSequence(withTiming(-12, { duration: 50 }), withTiming(12, { duration: 70 }), withTiming(-8, { duration: 60 }), withTiming(0, { duration: 50 })));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    AccessibilityInfo.announceForAccessibility(right ? s.quizRight : `${s.quizWrong} ${q.answer}`);
    setTimeout(
      () => {
        setPicked(null);
        setRound((r) => r + 1);
      },
      right ? 1200 : 2200,
    );
  };

  const restart = () => {
    setRound(1);
    setScore(0);
    setPicked(null);
    setGameSeed((n) => n + 7919);
  };

  return (
    <>
      <Stack.Screen options={{ title: `🎯 ${s.quizTitle}` }} />
      <ScrollView contentContainerStyle={styles.page}>
        {/* Progress dots */}
        <View style={styles.dots} accessible accessibilityLabel={`${Math.min(round, ROUNDS)} / ${ROUNDS}`}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < round - 1 ? c.gold : i === round - 1 ? c.peacock : 'rgba(255,255,255,0.15)' }]} />
          ))}
        </View>

        {finished ? (
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, alignItems: 'center', gap: 12 }]}>
            <Text style={{ fontSize: 64 }}>{score >= 8 ? '🏆' : score >= 5 ? '🌟' : '🌱'}</Text>
            <Text style={{ color: c.text, fontSize: fs(28), fontWeight: '900' }}>
              {score} / {ROUNDS}
            </Text>
            <Text style={{ color: c.muted, fontSize: fs(17), textAlign: 'center' }}>{score >= 8 ? s.quizGreat : score >= 5 ? s.quizGood : s.quizKeepGoing}</Text>
            <BigButton icon="🔁" label={s.playAgain} variant="primary" onPress={restart} style={{ alignSelf: 'stretch' }} />
            <BigButton icon="🏠" label={s.tabHome} onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
          </Animated.View>
        ) : q ? (
          <>
            <Animated.View key={`${round}`} entering={FadeInDown.springify().damping(14)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shakeStyle]}>
              <Text style={{ color: c.peacock, fontSize: fs(14), fontWeight: '800' }}>🦚 {pick(q.item.title, lang)}</Text>
              <Text style={{ color: c.muted, fontSize: fs(15), fontWeight: '700', marginTop: 4 }}>{s.quizPrompt}</Text>
              <Text style={{ color: c.text, fontSize: fs(26), lineHeight: fs(42), fontWeight: '800', textAlign: 'center', marginTop: 14 }}>
                {q.before}{' '}
                <Text style={{ color: picked ? (picked === q.answer ? c.yourTurn : '#FB7185') : c.gold }}>{picked ? q.answer : '______'}</Text> {q.after}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={s.quizHint}
                onPress={() => lesson.playLine(q.lineIndex)}
                style={[styles.hint, { borderColor: c.border }]}
              >
                <Text style={{ color: c.text, fontSize: fs(15), fontWeight: '800' }}>🔊 {s.quizHint}</Text>
              </Pressable>
            </Animated.View>

            <View style={{ gap: 12 }}>
              {q.options.map((o, i) => {
                const isAnswer = o === q.answer;
                const state = !picked ? 'idle' : isAnswer ? 'right' : o === picked ? 'wrong' : 'idle';
                return (
                  <Animated.View key={`${round}-${o}`} entering={FadeInDown.delay(100 + i * 80).springify().damping(14)}>
                    <Pressable accessibilityRole="button" accessibilityLabel={o} onPress={() => choose(o)} disabled={Boolean(picked)}>
                      <LinearGradient
                        colors={state === 'right' ? ['#15803D', '#22C55E'] : state === 'wrong' ? ['#9F1239', '#FB7185'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.05)']}
                        style={[styles.option, { borderColor: state === 'idle' ? c.border : 'transparent' }]}
                      >
                        <Text style={{ color: c.text, fontSize: fs(24), fontWeight: '900' }}>{o}</Text>
                        {state === 'right' ? <Text style={{ fontSize: 22 }}>✓</Text> : state === 'wrong' ? <Text style={{ fontSize: 22 }}>✗</Text> : null}
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            <LinearGradient colors={[...GOLD]} style={styles.score}>
              <Text style={{ color: c.onGold, fontSize: fs(16), fontWeight: '900' }}>
                ⭐ {score} · {s.round} {round} / {ROUNDS}
              </Text>
            </LinearGradient>
          </>
        ) : (
          <Text style={{ color: c.muted, fontSize: fs(17), textAlign: 'center', padding: 24 }}>{s.empty}</Text>
        )}
      </ScrollView>
      <PetalShower run={finished && score >= 5 ? 1 : 0} />
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 48, gap: 16 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 22, height: 6, borderRadius: 3 },
  card: { borderRadius: 26, borderWidth: 1, padding: 20 },
  hint: { alignSelf: 'center', marginTop: 16, borderWidth: 1, borderRadius: 99, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  option: { minHeight: 70, borderRadius: 22, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  score: { alignSelf: 'center', borderRadius: 99, paddingHorizontal: 18, paddingVertical: 8 },
});
