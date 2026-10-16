import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, useTheme } from '../lib/theme';
import { Halo, Mandala, PeacockFeather } from './KrishnaBanner';
import { SoundWave } from './Motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A pressable that gently springs down when touched. */
export function Springy({ onPress, style, children, a11yLabel, a11yHint }: { onPress: () => void; style?: StyleProp<ViewStyle>; children: ReactNode; a11yLabel: string; a11yHint?: string }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
      onPressIn={() => scale.set(withSpring(0.96, { damping: 15, stiffness: 300 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 12 }))}
      onPress={onPress}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Circular progress that fills smoothly (gold → peacock). */
export function ProgressRing({ value, size = 64, stroke = 7, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [p, value]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.gold} />
            <Stop offset="1" stopColor={colors.peacock} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={props}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** A small frosted stat card for the dashboard strip. */
export function StatTile({ top, label, a11yLabel }: { top: ReactNode; label: string; a11yLabel: string }) {
  const { c, fs } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]} accessible accessibilityLabel={a11yLabel}>
      {top}
      <Text style={{ color: c.muted, fontSize: fs(13), fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  const { c, fs } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <LinearGradient colors={[colors.gold, colors.peacock]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sectionBar} />
        <Text accessibilityRole="header" style={{ color: c.text, fontSize: fs(20), fontWeight: '900' }}>
          {children}
        </Text>
      </View>
      {right}
    </View>
  );
}

/** "Shloka of the day" — the hero card. */
export function DailyCard({
  label,
  title,
  firstLine,
  meaning,
  source,
  playing,
  listenLabel,
  learnLabel,
  onListen,
  onLearn,
}: {
  label: string;
  title: string;
  firstLine: string;
  meaning: string;
  source?: string;
  playing: boolean;
  listenLabel: string;
  learnLabel: string;
  onListen: () => void;
  onLearn: () => void;
}) {
  const { c, fs } = useTheme();
  return (
    <LinearGradient colors={['rgba(250,204,21,0.6)', 'rgba(45,212,191,0.4)', 'rgba(244,114,182,0.5)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBorder}>
      <LinearGradient colors={['#1E2A78', '#16206A', '#0B4A57']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroMandala} pointerEvents="none">
          <Mandala size={260} opacity={0.32} />
        </View>
        <View style={styles.heroFeather} pointerEvents="none">
          <Halo size={130} active={playing} />
          <PeacockFeather size={110} />
        </View>
        <View style={[styles.chip, { backgroundColor: 'rgba(250,204,21,0.16)', borderColor: 'rgba(250,204,21,0.4)' }]}>
          <Text style={{ color: c.star, fontSize: fs(13), fontWeight: '800' }}>✨ {label}</Text>
        </View>
        <Text style={{ color: c.muted, fontSize: fs(15), fontWeight: '700', marginTop: 12, marginRight: 90 }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ color: c.text, fontSize: fs(25), lineHeight: fs(38), fontWeight: '900', marginTop: 4, marginRight: 70 }} numberOfLines={3}>
          {firstLine}
        </Text>
        {meaning ? (
          <Text style={{ color: c.muted, fontSize: fs(15), lineHeight: fs(22), marginTop: 8 }} numberOfLines={2}>
            {meaning}
          </Text>
        ) : null}
        {source ? <Text style={{ color: c.peacock, fontSize: fs(13), fontWeight: '700', marginTop: 6 }}>🦚 {source}</Text> : null}
        <View style={styles.heroActions}>
          <Springy onPress={onListen} a11yLabel={`${listenLabel}: ${title}`} style={[styles.heroBtn, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: c.border }]}>
            {playing ? <SoundWave active bars={5} /> : <Text style={{ fontSize: fs(20) }}>▶️</Text>}
            <Text style={{ color: c.text, fontSize: fs(16), fontWeight: '800' }}>{listenLabel}</Text>
          </Springy>
          <Springy onPress={onLearn} a11yLabel={`${learnLabel}: ${title}`} style={{ flex: 1.3 }}>
            <LinearGradient colors={[colors.gold, colors.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBtnGold}>
              <Text style={{ color: c.onGold, fontSize: fs(16), fontWeight: '900' }}>{learnLabel} →</Text>
            </LinearGradient>
          </Springy>
        </View>
      </LinearGradient>
    </LinearGradient>
  );
}

/** A colourful collection tile for the bento grid. `big` tiles span the full width. */
export function CollectionTile({
  icon,
  label,
  count,
  countLabel,
  learned,
  gradient,
  tint,
  big,
  onPress,
}: {
  icon: string;
  label: string;
  count: number;
  countLabel: string;
  learned: number;
  gradient: readonly [string, string];
  tint: string;
  big?: boolean;
  onPress: () => void;
}) {
  const { c, fs } = useTheme();
  return (
    <Springy onPress={onPress} a11yLabel={`${label}, ${count} ${countLabel}, ${learned} ⭐`} style={{ flex: 1 }}>
      <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, big && styles.tileBig, { borderColor: `${tint}66` }]}>
        {/* soft decorative circle */}
        <View style={[styles.tileOrb, { backgroundColor: tint }]} />
        <Text style={{ fontSize: big ? 46 : 30 }} importantForAccessibility="no">
          {icon}
        </Text>
        <View style={{ gap: 2 }}>
          <Text style={{ color: c.text, fontSize: fs(big ? 22 : 17), fontWeight: '900' }} numberOfLines={1}>
            {label}
          </Text>
          <Text style={{ color: 'rgba(255,248,231,0.8)', fontSize: fs(13), fontWeight: '700' }}>
            {count} {countLabel}
            {learned ? `  ·  ⭐ ${learned}` : ''}
          </Text>
        </View>
        {/* thin progress bar */}
        <View style={styles.tileTrack}>
          <View style={[styles.tileFill, { width: `${count ? (learned / count) * 100 : 0}%`, backgroundColor: c.gold }]} />
        </View>
      </LinearGradient>
    </Springy>
  );
}

/** Compact card for the "Quick to learn" carousel. */
export function QuickCard({ icon, title, line, lines, done, tint, onPress }: { icon: string; title: string; line: string; lines: string; done: boolean; tint: string; onPress: () => void }) {
  const { c, fs } = useTheme();
  return (
    <Springy onPress={onPress} a11yLabel={`${title}. ${lines}${done ? '. ⭐' : ''}`} style={[styles.quick, { backgroundColor: c.surface, borderColor: `${tint}55` }]}>
      <View style={[styles.quickIcon, { backgroundColor: `${tint}22` }]}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <Text style={{ color: c.text, fontSize: fs(16), fontWeight: '900' }} numberOfLines={2}>
        {title}
      </Text>
      <Text style={{ color: c.muted, fontSize: fs(13), lineHeight: fs(19) }} numberOfLines={2}>
        {line}
      </Text>
      <Text style={{ color: done ? c.star : c.peacock, fontSize: fs(12), fontWeight: '800', marginTop: 'auto' }}>{done ? '⭐' : lines}</Text>
    </Springy>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, borderRadius: 20, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8, minHeight: 120, justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sectionBar: { width: 5, height: 22, borderRadius: 3 },
  heroBorder: { borderRadius: 30, padding: 1.5 },
  hero: { borderRadius: 29, padding: 20, overflow: 'hidden' },
  heroMandala: { position: 'absolute', right: -70, top: -60 },
  heroFeather: { position: 'absolute', right: -8, top: -6, width: 130, height: 150, alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroBtn: { flex: 1, minHeight: 56, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnGold: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#FACC15', shadowOpacity: 0.45, shadowRadius: 14, elevation: 6 },
  tile: { borderRadius: 24, padding: 16, paddingBottom: 20, minHeight: 124, justifyContent: 'space-between', borderWidth: 1, overflow: 'hidden', gap: 8 },
  tileBig: { minHeight: 116, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 16 },
  tileOrb: { position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: 55, opacity: 0.18 },
  tileTrack: { position: 'absolute', left: 16, right: 16, bottom: 10, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  tileFill: { height: 4, borderRadius: 2 },
  quick: { width: 168, height: 200, borderRadius: 22, borderWidth: 1, padding: 14, gap: 6 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
