import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useChanter } from '../lib/chanter';
import { useLibrary } from '../lib/library';
import { useSettings } from '../lib/settings';
import { colors, useTheme } from '../lib/theme';
import { Halo, Mandala, PeacockFeather } from './KrishnaBanner';
import { NightSky } from './NightSky';

const LINES = {
  hi: { jai: 'जय गौर', main: 'श्री राधारमणो विजयते', app: 'श्रवणमङ्गलम्', name: 'राधेश्याम 🙏' },
  en: { jai: 'Jai Gaur', main: 'Shri Radharamano Vijayate', app: 'Shravan Mangalam', name: 'Radheshyam 🙏' },
};

/**
 * The greeting every time the app opens: "जय गौर · श्री राधारमणो विजयते · राधेश्याम".
 * Plays the owner's recorded opening greeting if there is one. Tap to skip.
 */
export function OpeningBlessing() {
  const { c, fs } = useTheme();
  const { lang, ready } = useSettings();
  const { promptUrl, status } = useLibrary();
  const chanter = useChanter();
  const [visible, setVisible] = useState(true);
  const l = LINES[lang];

  // Speak the greeting in the owner's voice once the library (and its recordings) is known.
  useEffect(() => {
    if (!ready || status === 'loading') return;
    const url = promptUrl('opening', lang);
    AccessibilityInfo.announceForAccessibility(`${l.jai}. ${l.main}. ${l.name}`);
    if (url) chanter.playUrl(url, 1, chanter.begin()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, status]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <Animated.View exiting={FadeOut.duration(600)} style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${l.jai}. ${l.main}. ${l.name}`} onPress={() => setVisible(false)} style={styles.fill}>
        <NightSky />
        <View style={styles.center}>
          <View style={styles.art}>
            <Animated.View entering={ZoomIn.duration(900)} style={StyleSheet.absoluteFill}>
              <View style={styles.mandala}>
                <Mandala size={300} opacity={0.5} />
              </View>
            </Animated.View>
            <Halo size={170} active color={colors.gold} />
            <Animated.View entering={FadeIn.delay(200).duration(700)}>
              <PeacockFeather size={130} />
            </Animated.View>
          </View>
          <Animated.Text entering={FadeInDown.delay(500).springify().damping(14)} style={[styles.jai, { color: c.star, fontSize: fs(22) }]}>
            ॥ {l.jai} ॥
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(900).springify().damping(14)} style={[styles.main, { color: c.text, fontSize: fs(30) }]}>
            {l.main}
          </Animated.Text>
          {/* App name: "auspicious to hear" — Shrimad Bhagavatam 10.31.9 (Gopi Geet) */}
          <Animated.Text entering={FadeInDown.delay(1150).springify().damping(14)} style={[styles.name, { color: c.gold, fontSize: fs(26) }]}>
            {l.app}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(1400).springify().damping(14)} style={[styles.name, { color: c.peacock, fontSize: fs(24) }]}>
            {l.name}
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  art: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  mandala: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  jai: { fontWeight: '900', letterSpacing: 1 },
  main: { fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(250,204,21,0.55)', textShadowRadius: 16 },
  name: { fontWeight: '900' },
});
