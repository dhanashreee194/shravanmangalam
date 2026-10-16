import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ProgressRing } from '../../components/Dashboard';
import { t } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { useSettings } from '../../lib/settings';
import { useTheme } from '../../lib/theme';
import { Item, pick } from '../../lib/types';

const FLOWERS = ['🪷', '🌸', '🌺', '🌼', '🌻', '🌷', '💮', '🌳', '🌿', '🏵️'];
/** Each shloka always grows the same flower. */
const flowerFor = (id: string) => FLOWERS[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % FLOWERS.length];

const MILESTONES = [
  { at: 1, icon: '🌱', hi: 'पहला अंकुर', en: 'First sprout' },
  { at: 5, icon: '🌷', hi: 'छोटी बगिया', en: 'Little garden' },
  { at: 11, icon: '🪷', hi: 'कमल सरोवर', en: 'Lotus pond' },
  { at: 21, icon: '🌳', hi: 'कदम्ब कुंज', en: 'Kadamba grove' },
  { at: 34, icon: '🦚', hi: 'पूरा वृन्दावन', en: 'All of Vrindavan' },
];

/** A plant that sways gently in the breeze once it has bloomed. */
function Plant({ item, learned, index }: { item: Item; learned: boolean; index: number }) {
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const reduce = useReducedMotion();
  const sway = useSharedValue(0);
  useEffect(() => {
    if (!learned || reduce) return;
    sway.value = withDelay(
      (index % 7) * 220,
      withRepeat(withSequence(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 1800, easing: Easing.inOut(Easing.sin) })), -1, true),
    );
  }, [learned, reduce, index, sway]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value * 6}deg` }] }));
  const title = pick(item.title, lang);
  return (
    <Animated.View entering={ZoomIn.delay(Math.min(index, 20) * 40).springify().damping(11)} style={styles.plotWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${learned ? '⭐' : ''}`}
        onPress={() => router.push({ pathname: '/learn/[id]', params: { id: item.id } })}
        style={[styles.plot, learned ? styles.plotBloom : { opacity: 0.75 }]}
      >
        <Animated.Text style={[{ fontSize: learned ? 34 : 22 }, style]}>{learned ? flowerFor(item.id) : '🌱'}</Animated.Text>
        <View style={[styles.soil, { backgroundColor: learned ? 'rgba(120,53,15,0.85)' : 'rgba(120,53,15,0.55)' }]} />
      </Pressable>
      <Text style={{ color: learned ? c.text : c.muted, fontSize: fs(11), fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
        {title}
      </Text>
    </Animated.View>
  );
}

export default function GardenScreen() {
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const { items, learned } = useLibrary();
  const s = t(lang);
  const bloomed = items.filter((i) => learned.has(i.id)).length;
  // Bloomed plants first, so the garden fills up from the front.
  const plots = [...items].sort((a, b) => Number(learned.has(b.id)) - Number(learned.has(a.id)));
  const next = MILESTONES.find((m) => m.at > bloomed);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ color: c.text, fontSize: fs(28), fontWeight: '900' }}>
              🌳 {s.gardenTitle}
            </Text>
            <Text style={{ color: c.muted, fontSize: fs(14), fontWeight: '700' }}>{s.gardenSub}</Text>
          </View>
          <ProgressRing value={items.length ? bloomed / items.length : 0} size={70}>
            <Text style={{ color: c.text, fontSize: fs(15), fontWeight: '900' }}>{bloomed}</Text>
          </ProgressRing>
        </Animated.View>

        {next && (
          <Animated.View entering={FadeInDown.delay(80)} style={[styles.next, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: fs(15), fontWeight: '800' }}>
              {next.icon} {s.nextMilestone}: <Text style={{ color: c.star }}>{next[lang]}</Text> · {next.at - bloomed} {s.moreToGo}
            </Text>
          </Animated.View>
        )}

        {/* The garden itself */}
        <Animated.View entering={FadeInDown.delay(140).springify().damping(15)}>
          <LinearGradient colors={['#064E3B', '#065F46', '#0B4A57']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.garden}>
            <Text style={styles.moon} importantForAccessibility="no">
              🌕
            </Text>
            <View style={styles.grid}>
              {plots.map((item, i) => (
                <Plant key={item.id} item={item} learned={learned.has(item.id)} index={i} />
              ))}
            </View>
            {/* Yamuna river along the bottom */}
            <Svg width="100%" height={46} viewBox="0 0 400 46" preserveAspectRatio="none" style={{ marginTop: 10 }}>
              <Path d="M0 20 C 60 5, 110 35, 170 20 S 290 5, 340 20 S 400 30, 400 20 L400 46 L0 46 Z" fill="#1D4ED8" opacity={0.75} />
              <Path d="M0 28 C 70 16, 120 40, 190 28 S 300 16, 350 28 S 400 34, 400 30 L400 46 L0 46 Z" fill="#38BDF8" opacity={0.45} />
            </Svg>
            <Text style={{ color: '#BFDBFE', fontSize: fs(12), fontWeight: '700', textAlign: 'center', marginTop: -26 }}>~ यमुना ~</Text>
          </LinearGradient>
        </Animated.View>

        {/* Milestones */}
        <Text style={{ color: c.text, fontSize: fs(19), fontWeight: '900', marginTop: 4 }}>🏆 {s.milestones}</Text>
        <View style={styles.badges}>
          {MILESTONES.map((m, i) => {
            const got = bloomed >= m.at;
            return (
              <Animated.View
                key={m.at}
                entering={FadeInDown.delay(200 + i * 60)}
                style={[styles.badge, { backgroundColor: got ? 'rgba(250,204,21,0.14)' : c.surface, borderColor: got ? c.gold : c.border }]}
                accessible
                accessibilityLabel={`${m[lang]}: ${m.at}. ${got ? '✓' : ''}`}
              >
                <Text style={{ fontSize: 30, opacity: got ? 1 : 0.35 }}>{got ? m.icon : '🔒'}</Text>
                <Text style={{ color: got ? c.star : c.muted, fontSize: fs(12), fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
                  {m[lang]}
                </Text>
                <Text style={{ color: c.muted, fontSize: fs(11), fontWeight: '700' }}>{m.at}</Text>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 140, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  next: { borderRadius: 16, borderWidth: 1, padding: 12 },
  garden: { borderRadius: 28, paddingTop: 18, paddingHorizontal: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
  moon: { position: 'absolute', right: 14, top: 8, fontSize: 26, opacity: 0.85 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 10 },
  plotWrap: { width: '25%', alignItems: 'center', gap: 4, paddingHorizontal: 3 },
  plot: { width: 62, height: 62, alignItems: 'center', justifyContent: 'flex-end' },
  plotBloom: { shadowColor: '#FDE68A', shadowOpacity: 0.5, shadowRadius: 10 },
  soil: { width: 46, height: 10, borderRadius: 23, marginTop: -4 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexBasis: '18%', flexGrow: 1, minWidth: 64, borderRadius: 18, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
});
