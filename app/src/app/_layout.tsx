import { setAudioModeAsync } from 'expo-audio';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { NightSky } from '../components/NightSky';
import { OpeningBlessing } from '../components/OpeningBlessing';
import { LibraryProvider } from '../lib/library';
import { ProgressProvider } from '../lib/progress';
import { SettingsProvider } from '../lib/settings';
import { colors, useTheme } from '../lib/theme';

// Dark navigation theme with a transparent background, so the night sky shows through every screen.
const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: colors.night, primary: colors.gold, text: colors.text, border: 'transparent' },
};

function AppStack() {
  const { c, fs } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      {/* One night sky behind every screen, so the stars keep twinkling between screens. */}
      <NightSky />
      <StatusBar style="light" />
      <ThemeProvider value={NAV_THEME}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.night },
            headerTintColor: c.gold,
            headerTitleStyle: { color: c.text, fontSize: fs(18), fontWeight: '800' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: 'transparent' },
            headerBackButtonDisplayMode: 'minimal',
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/[id]" options={{ title: '' }} />
          <Stack.Screen name="listen" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        </Stack>
      </ThemeProvider>
      {/* जय गौर · श्री राधारमणो विजयते — shown each time the app opens */}
      <OpeningBlessing />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Play even when the iPhone's silent switch is on — elderly users often leave it on by accident.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }, []);
  return (
    <SettingsProvider>
      <LibraryProvider>
        <ProgressProvider>
          <AppStack />
        </ProgressProvider>
      </LibraryProvider>
    </SettingsProvider>
  );
}
