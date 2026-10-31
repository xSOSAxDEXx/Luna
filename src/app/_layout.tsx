import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { registerServiceWorker } from '@/pwa/registerServiceWorker';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 600, fade: true });

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.moon,
    background: colors.sky,
    card: colors.skyDeep,
    text: colors.text,
    border: colors.border,
    notification: colors.lavender,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.sky },
          animation: 'fade',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        <Stack.Screen name="create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
