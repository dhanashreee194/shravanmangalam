import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '../../components/BigButton';
import { t } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { Settings, useSettings } from '../../lib/settings';
import { useTheme } from '../../lib/theme';

function Choice<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
  index,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  index: number;
}) {
  const { c, fs } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(15)} style={{ gap: 8 }}>
      <Text style={{ color: c.text, fontSize: fs(17), fontWeight: '800' }}>{label}</Text>
      <View style={[styles.seg, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(o.value)}
              style={[styles.segBtn, active && { backgroundColor: c.gold }]}
            >
              <Text style={{ fontSize: fs(16), fontWeight: '800', color: active ? c.onGold : c.text, textAlign: 'center' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { c, fs } = useTheme();
  const settings = useSettings();
  const { server, refresh } = useLibrary();
  const s = t(settings.lang);
  const [url, setUrl] = useState(settings.serverUrl);
  const set = (patch: Partial<Settings>) => settings.update(patch);
  const onOff = [
    { value: true, label: s.on },
    { value: false, label: s.off },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: fs(28), fontWeight: '900' }}>⚙️ {s.settings}</Text>
      <Choice index={0} label={s.language} value={settings.lang} onChange={(lang) => set({ lang })}
        options={[{ value: 'hi', label: 'हिंदी' }, { value: 'en', label: 'English' }]} />
      <Choice index={1} label={s.textSize} value={settings.textSize} onChange={(textSize) => set({ textSize })}
        options={[{ value: 'normal', label: s.sizeNormal }, { value: 'large', label: s.sizeLarge }, { value: 'xlarge', label: s.sizeXL }]} />
      <Choice index={2} label={s.speed} value={settings.speed} onChange={(speed) => set({ speed })}
        options={[{ value: 'slow', label: `🐢 ${s.slow}` }, { value: 'normal', label: s.normal }]} />
      <Choice index={3} label={`${s.repeatTimes} (${s.times})`} value={settings.repeatCount} onChange={(repeatCount) => set({ repeatCount })}
        options={[1, 2, 3, 5].map((n) => ({ value: n, label: String(n) }))} />
      <Choice index={4} label={s.showRoman} value={settings.showTransliteration} onChange={(showTransliteration) => set({ showTransliteration })} options={onOff} />
      <Choice index={5} label={`🔔 ${s.chime}`} value={settings.chime} onChange={(chime) => set({ chime })} options={onOff} />
      <Choice index={6} label={`👂 ${s.listenOnStart}`} value={settings.listenOnStart} onChange={(listenOnStart) => set({ listenOnStart })} options={onOff} />

      <Animated.View entering={FadeInDown.delay(7 * 60)} style={{ gap: 8 }}>
        <Text style={{ color: c.text, fontSize: fs(17), fontWeight: '800' }}>{s.server}</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder={server}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel={s.server}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, fontSize: fs(16) }]}
        />
        <Text style={{ color: c.muted, fontSize: fs(13) }}>{s.serverHint}</Text>
        <BigButton
          label={s.save}
          onPress={() => {
            set({ serverUrl: url.trim() });
            setTimeout(refresh, 0);
          }}
        />
      </Animated.View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 22, paddingBottom: 140 },
  seg: { flexDirection: 'row', borderRadius: 18, padding: 4, gap: 4, borderWidth: 1 },
  segBtn: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  input: { borderWidth: 1, borderRadius: 16, padding: 14 },
});
