import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityActionEvent, AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { BigButton } from '../../components/BigButton';
import { PetalShower, SoundWave } from '../../components/Motion';
import { useChanter } from '../../lib/chanter';
import { t } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { useProgress } from '../../lib/progress';
import { useSettings } from '../../lib/settings';
import { useTheme } from '../../lib/theme';
import { pick } from '../../lib/types';
import { Phase, useLesson } from '../../lib/useLesson';

/** The line card's glowing frame: breathes gold while chanting, green on "your turn". */
function GlowFrame({ phase, children }: { phase: Phase; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const glow = useSharedValue(0);
  const active = phase === 'listen' || phase === 'together' || phase === 'yourTurn';
  useEffect(() => {
    if (!active || reduce) {
      glow.value = withTiming(0, { duration: 300 });
      return;
    }
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [active, glow, reduce]);
  const color = phase === 'yourTurn' ? '#86EFAC' : '#FACC15';
  const style = useAnimatedStyle(() => ({ shadowOpacity: 0.25 + glow.value * 0.55, shadowRadius: 10 + glow.value * 18 }));
  return (
    <Animated.View style={[styles.glow, { shadowColor: color }, style]}>
      <LinearGradient
        colors={phase === 'yourTurn' ? ['#86EFAC', '#2DD4BF'] : ['#FACC15', '#2DD4BF', '#F472B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frame}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

export default function LearnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, fs } = useTheme();
  const { lang, speed, repeatCount, showTransliteration, update } = useSettings();
  const { items } = useLibrary();
  const chanter = useChanter();
  const s = t(lang);

  const item = items.find((i) => i.id === id);
  const lesson = useLesson(item, chanter);
  const { openItem } = useProgress();
  useEffect(() => {
    if (id) openItem(id);
  }, [id, openItem]);
  const { idx, phase, round, busy, lines } = lesson;
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (phase === 'yourTurn') AccessibilityInfo.announceForAccessibility(s.yourTurn);
    if (phase === 'done') AccessibilityInfo.announceForAccessibility(s.wellDone);
  }, [phase, s]);

  if (!item || !lines.length) {
    return <Text style={{ color: c.muted, padding: 24, fontSize: fs(17) }}>{s.empty}</Text>;
  }
  const line = lines[idx];
  const title = pick(item.title, lang);
  const speaking = phase === 'listen' || phase === 'together' || phase === 'meaning';

  // Screen-reader shortcuts on the line card: double-tap plays the line, two-finger
  // double-tap (iOS "magic tap") starts/stops Repeat after me, swipe up/down changes line.
  const onA11yAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') lesson.playLine();
    if (name === 'magicTap') {
      if (busy) lesson.stop();
      else lesson.repeatAfterMe();
    }
    if (name === 'increment') lesson.go(idx + 1);
    if (name === 'decrement') lesson.go(idx - 1);
    if (name === 'longpress') lesson.hearLineMeaning();
  };

  const status =
    phase === 'listen' ? { text: `👂 ${s.listen}`, color: c.listen }
    : phase === 'yourTurn' ? { text: s.yourTurn, color: c.yourTurn }
    : phase === 'together' ? { text: `🎶 ${s.allTogether}`, color: c.listen }
    : phase === 'meaning' ? { text: `💬 ${s.meaning}`, color: c.listen }
    : phase === 'done' ? { text: s.wellDone, color: c.star }
    : null;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.page}>
        {item.source ? (
          <Animated.Text entering={FadeIn} style={[styles.source, { color: c.peacock, borderColor: `${c.peacock}55`, fontSize: fs(14) }]}>
            🦚 {item.source}
          </Animated.Text>
        ) : null}

        {/* About / overall meaning */}
        <Animated.View entering={FadeInDown.springify()}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAbout }}
            onPress={() => setShowAbout((v) => !v)}
            style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Text style={{ color: c.star, fontWeight: '800', fontSize: fs(17) }}>
              {showAbout ? '▾' : '▸'} {s.about}
            </Text>
            {showAbout && (
              <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 8, marginTop: 8 }}>
                <Text style={{ color: c.text, fontSize: fs(17), lineHeight: fs(26) }}>{pick(item.summary, lang)}</Text>
                {pick(item.whenToChant, lang) ? (
                  <Text style={{ color: c.muted, fontSize: fs(15) }}>
                    🕰️ {s.whenToChant}: {pick(item.whenToChant, lang)}
                  </Text>
                ) : null}
                <BigButton icon="🔊" label={s.about} onPress={lesson.hearSummary} disabled={busy} />
              </Animated.View>
            )}
          </Pressable>
        </Animated.View>

        {/* Current line */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <GlowFrame phase={phase}>
            <View
              style={[styles.lineCard, { backgroundColor: '#0E1648' }]}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`${s.lineOf(idx + 1, lines.length)}. ${line.text}. ${s.meaning}: ${pick(line.meaning, lang)}`}
              accessibilityHint={`${s.playLine}. ${s.repeatAfterMe}: magic tap.`}
              accessibilityActions={[{ name: 'activate' }, { name: 'magicTap' }, { name: 'increment' }, { name: 'decrement' }, { name: 'longpress', label: s.meaningOfLine }]}
              onAccessibilityAction={onA11yAction}
            >
              <Text style={{ color: c.muted, fontSize: fs(15), fontWeight: '700' }}>
                {s.lineOf(idx + 1, lines.length)}
                {round > 0 ? `   ·   🔁 ${round} / ${repeatCount}` : ''}
              </Text>
              {/* Re-keyed per line so each new line fades in. */}
              <Animated.View key={idx} entering={FadeInDown.duration(350)} style={{ gap: 12 }}>
                <Text style={[styles.deva, { color: c.text, fontSize: fs(30), lineHeight: fs(48) }]}>{line.text}</Text>
                {showTransliteration && line.transliteration ? (
                  <Text style={{ color: c.star, fontSize: fs(18), fontStyle: 'italic', textAlign: 'center' }}>{line.transliteration}</Text>
                ) : null}
                {pick(line.meaning, lang) ? (
                  <View style={[styles.meaning, { backgroundColor: 'rgba(45,212,191,0.10)', borderColor: 'rgba(45,212,191,0.3)' }]}>
                    <Text style={{ color: c.peacock, fontSize: fs(13), fontWeight: '800' }}>{s.meaning.toUpperCase()}</Text>
                    <Text style={{ color: c.text, fontSize: fs(18), lineHeight: fs(27) }}>{pick(line.meaning, lang)}</Text>
                  </View>
                ) : null}
              </Animated.View>
            </View>
          </GlowFrame>
        </Animated.View>

        {/* Status — announced to screen readers */}
        <View accessibilityLiveRegion="polite" style={{ minHeight: fs(70), justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {status && (
            <Animated.Text
              key={phase}
              entering={phase === 'yourTurn' || phase === 'done' ? ZoomIn.springify().damping(9) : FadeIn}
              style={{ color: status.color, fontSize: fs(phase === 'yourTurn' ? 28 : 21), fontWeight: '900', textAlign: 'center' }}
            >
              {status.text}
            </Animated.Text>
          )}
          <SoundWave active={speaking} color={phase === 'meaning' ? c.peacock : c.gold} />
        </View>

        {/* Main controls */}
        {busy ? (
          <BigButton icon="⏹️" label={s.stop} variant="primary" onPress={lesson.stop} style={{ minHeight: 80 }} />
        ) : (
          <BigButton
            icon="🔁"
            label={s.repeatAfterMe}
            a11yHint={`${repeatCount} ${s.times}`}
            variant="primary"
            onPress={() => lesson.repeatAfterMe()}
            style={{ minHeight: 80 }}
          />
        )}

        <View style={styles.row}>
          <BigButton icon="⏮️" label="" a11yLabel={s.prev} onPress={() => lesson.go(idx - 1)} disabled={idx === 0} style={styles.navBtn} />
          <BigButton icon="▶️" label={s.playLine} onPress={() => lesson.playLine()} disabled={busy} style={{ flex: 1 }} />
          <BigButton icon="⏭️" label="" a11yLabel={s.next} onPress={() => lesson.go(idx + 1)} disabled={idx === lines.length - 1} style={styles.navBtn} />
        </View>
        <View style={styles.row}>
          <BigButton icon="🎧" label={s.playAll} onPress={lesson.playAll} disabled={busy} style={{ flex: 1 }} />
          <BigButton icon="💬" label={s.meaningOfLine} onPress={() => lesson.hearLineMeaning()} disabled={busy} style={{ flex: 1 }} />
        </View>

        {/* Speed */}
        <View style={[styles.speedRow, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="radiogroup" accessibilityLabel={s.speed}>
          <Text style={{ color: c.muted, fontSize: fs(15), fontWeight: '700', paddingHorizontal: 8 }}>🐢 {s.speed}</Text>
          {(['slow', 'normal'] as const).map((sp) => (
            <Pressable
              key={sp}
              accessibilityRole="radio"
              accessibilityState={{ checked: speed === sp }}
              onPress={() => update({ speed: sp })}
              style={[styles.chip, speed === sp && { backgroundColor: c.gold }]}
            >
              <Text style={{ fontSize: fs(16), fontWeight: '800', color: speed === sp ? c.onGold : c.text }}>{s[sp]}</Text>
            </Pressable>
          ))}
        </View>

        {/* Whole text — tap a line to jump to it */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, gap: 4 }]}>
          {lines.map((l, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${s.lineOf(i + 1, lines.length)}: ${l.text}`}
              onPress={() => lesson.go(i)}
              style={[styles.allLine, i === idx && { backgroundColor: 'rgba(99,102,241,0.28)' }]}
            >
              <Text style={{ color: i === idx ? c.star : c.text, fontSize: fs(19), lineHeight: fs(30) }}>{l.text}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {/* Flowers fall each time a shloka is completed (remounts when phase becomes 'done'). */}
      <PetalShower run={phase === 'done' ? 1 : 0} />
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 48, gap: 14 },
  source: { alignSelf: 'center', fontWeight: '800', borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4, overflow: 'hidden' },
  card: { borderRadius: 22, borderWidth: 1, padding: 16 },
  glow: { borderRadius: 26, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  frame: { borderRadius: 26, padding: 2 },
  lineCard: { borderRadius: 24, padding: 18, gap: 12 },
  deva: { fontWeight: '800', textAlign: 'center' },
  meaning: { borderRadius: 16, padding: 12, gap: 4, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 10 },
  navBtn: { width: 72 },
  speedRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 4, gap: 4, borderWidth: 1 },
  chip: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  allLine: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
});
