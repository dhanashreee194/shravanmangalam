import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SKY } from '../lib/theme';

// Deterministic "random" so the sky looks the same on every render.
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 34 }, (_, i) => ({
  left: `${rand(i + 1) * 100}%` as const,
  top: `${rand(i + 101) * 70}%` as const,
  size: 1.5 + rand(i + 201) * 2.5,
  delay: rand(i + 301) * 3000,
  gold: rand(i + 401) > 0.82,
}));

function Star({ left, top, size, delay, gold }: (typeof STARS)[number]) {
  const reduce = useReducedMotion();
  const o = useSharedValue(0.35);
  useEffect(() => {
    if (reduce) return;
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0.25, { duration: 1600 })), -1, true));
  }, [o, delay, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        styles.star,
        { left, top, width: size, height: size, borderRadius: size, backgroundColor: gold ? '#FDE68A' : '#FFFFFF' },
        gold && { shadowColor: '#FDE68A', shadowOpacity: 0.9, shadowRadius: 4 },
        style,
      ]}
    />
  );
}

/** A soft coloured glow that drifts slowly — moonlight over Vrindavan. */
function Glow({ color, size, x, y, drift }: { color: string; size: number; x: number; y: number; drift: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduce]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * drift }, { translateY: t.value * drift * 0.6 }, { scale: 1 + t.value * 0.08 }],
  }));
  // Concentric faint circles fake a soft blur (brighter centre, feathered edge).
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {[1, 0.8, 0.6, 0.4].map((k) => (
        <View key={k} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: (size * k) / 2, backgroundColor: color, opacity: 0.05 }} />
      ))}
    </Animated.View>
  );
}

/** Full-screen animated background used behind every screen. */
export const NightSky = memo(function NightSky() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[...SKY]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Glow color="#6366F1" size={320} x={-120} y={-80} drift={40} />
      <Glow color="#2DD4BF" size={280} x={180} y={420} drift={-36} />
      <Glow color="#F472B6" size={200} x={220} y={60} drift={24} />
      {STARS.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  star: { position: 'absolute' },
});
