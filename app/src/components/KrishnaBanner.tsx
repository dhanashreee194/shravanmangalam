import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, useTheme } from '../lib/theme';

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** Mor-pankh (peacock feather) — Shri Krishna's crown ornament. Sways gently like in a breeze. */
export function PeacockFeather({ size = 72, still = false }: { size?: number; still?: boolean }) {
  const reduce = useReducedMotion();
  const sway = useSharedValue(0);
  useEffect(() => {
    if (reduce || still) return;
    sway.value = withRepeat(withSequence(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.sin) })), -1, true);
  }, [sway, reduce, still]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: size * 0.5 }, { rotate: `${sway.value * 7}deg` }, { translateY: -size * 0.5 }],
  }));
  const barbs = Array.from({ length: 18 }, (_, i) => 50 + i * 3.6);
  return (
    <Animated.View style={style} {...hidden}>
      <Svg width={size * 0.62} height={size} viewBox="0 0 60 100">
        <Defs>
          <SvgGradient id="eye" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22D3EE" />
            <Stop offset="1" stopColor="#0EA5E9" />
          </SvgGradient>
        </Defs>
        <G transform="rotate(-16 30 50)">
          {barbs.map((y, i) => (
            <G key={i}>
              <Line x1={30} y1={y} x2={30 - (15 - i * 0.6)} y2={y - 11} stroke={i % 2 ? '#34D399' : '#10B981'} strokeWidth={1.3} strokeLinecap="round" opacity={0.9} />
              <Line x1={30} y1={y} x2={30 + (15 - i * 0.6)} y2={y - 11} stroke={i % 2 ? '#34D399' : '#10B981'} strokeWidth={1.3} strokeLinecap="round" opacity={0.9} />
            </G>
          ))}
          <Path d="M30 99 C 29 76, 31 56, 30 34" stroke="#FACC15" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Ellipse cx={30} cy={27} rx={21} ry={26} fill="#047857" />
          <Ellipse cx={30} cy={28} rx={16.5} ry={20.5} fill="#F59E0B" />
          <Ellipse cx={30} cy={29.5} rx={12} ry={15} fill="url(#eye)" />
          <Path d="M30 20 C 22 20, 21 31, 30 40 C 39 31, 38 20, 30 20 Z" fill="#1E3A8A" />
          <Ellipse cx={27} cy={25} rx={2.2} ry={3} fill="#FFFFFF" opacity={0.55} />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Bansuri — Krishna's flute. */
export function Flute({ width = 160 }: { width?: number }) {
  const h = width * 0.12;
  return (
    <View {...hidden}>
      <Svg width={width} height={h * 2.2} viewBox="0 0 200 44">
        <Defs>
          <SvgGradient id="bamboo" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FCD34D" />
            <Stop offset="0.55" stopColor="#D97706" />
            <Stop offset="1" stopColor="#92400E" />
          </SvgGradient>
        </Defs>
        <Rect x={6} y={14} width={188} height={14} rx={7} fill="url(#bamboo)" />
        {[30, 150, 178].map((x) => (
          <Rect key={x} x={x} y={13} width={5} height={16} rx={2} fill="#FACC15" stroke="#92400E" strokeWidth={0.6} />
        ))}
        {[62, 78, 94, 110, 126, 142].map((x) => (
          <Circle key={x} cx={x} cy={21} r={2.6} fill="#3B1D06" />
        ))}
        <Circle cx={44} cy={21} r={3} fill="#3B1D06" />
        {/* tassel */}
        <Path d="M186 28 C 188 36, 184 40, 188 44" stroke="#F472B6" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M190 28 C 192 35, 189 39, 193 43" stroke="#F472B6" strokeWidth={2} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** A soft golden halo that breathes behind an icon. Faster and brighter while `active`. */
export function Halo({ size, active = false, color = colors.gold }: { size: number; active?: boolean; color?: string }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: active ? 1100 : 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p, active, reduce]);
  const style = useAnimatedStyle(() => ({
    opacity: (active ? 0.7 : 0.45) + p.value * 0.3,
    transform: [{ scale: 0.9 + p.value * (active ? 0.25 : 0.1) }],
  }));
  // Rings fading outward give a soft glow rather than a flat disc.
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {[1, 0.78, 0.56, 0.36].map((k) => (
        <View key={k} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: (size * k) / 2, backgroundColor: color, opacity: active ? 0.12 : 0.07 }} />
      ))}
    </Animated.View>
  );
}

export function KrishnaBanner({ title, subtitle, blessing }: { title: string; subtitle: string; blessing: string }) {
  const { c, fs } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(600)}>
      <LinearGradient colors={['rgba(250,204,21,0.55)', 'rgba(45,212,191,0.35)', 'rgba(244,114,182,0.45)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.border}>
        <LinearGradient colors={['#1E2A78', '#13205E', '#0B4A57']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: c.star, fontSize: fs(14), fontWeight: '700', letterSpacing: 0.3 }}>{blessing}</Text>
            <Text
              accessibilityRole="header"
              style={{ color: c.text, fontSize: fs(32), fontWeight: '900', textShadowColor: 'rgba(250,204,21,0.55)', textShadowRadius: 14 }}
            >
              {title}
            </Text>
            <Text style={{ color: c.muted, fontSize: fs(15) }}>{subtitle}</Text>
            <View style={{ marginTop: 6 }}>
              <Flute width={150} />
            </View>
          </View>
          <View style={styles.featherWrap}>
            <Halo size={96} />
            <PeacockFeather size={100} />
          </View>
        </LinearGradient>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  border: { borderRadius: 28, padding: 1.5 },
  banner: { borderRadius: 27, padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  featherWrap: { width: 104, height: 120, alignItems: 'center', justifyContent: 'center' },
});

/** A lotus mandala that turns very slowly — the app's signature motif behind the hero. */
export function Mandala({ size = 220, opacity = 0.35 }: { size?: number; opacity?: number }) {
  const reduce = useReducedMotion();
  const spin = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    spin.value = withRepeat(withTiming(360, { duration: 90000, easing: Easing.linear }), -1, false);
  }, [spin, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const petals = (n: number, rx: number, ry: number, cy: number, color: string, w: number) =>
    Array.from({ length: n }, (_, i) => (
      <Ellipse key={`${n}-${i}`} cx={50} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={w} transform={`rotate(${(360 / n) * i} 50 50)`} />
    ));
  return (
    <Animated.View style={[{ width: size, height: size, opacity }, style]} pointerEvents="none" {...hidden}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={48} fill="none" stroke="#FACC15" strokeWidth={0.6} strokeDasharray="1.5 2.5" />
        {petals(24, 4, 12, 16, '#FACC15', 0.5)}
        {petals(16, 6, 13, 26, '#2DD4BF', 0.6)}
        {petals(8, 8, 14, 34, '#F472B6', 0.7)}
        <Circle cx={50} cy={50} r={10} fill="none" stroke="#FACC15" strokeWidth={0.8} />
        <Circle cx={50} cy={50} r={4} fill="#FACC15" opacity={0.6} />
      </Svg>
    </Animated.View>
  );
}
