// Per-weight imports so only the 4 weights in use are bundled.
import { Montserrat_400Regular } from "@expo-google-fonts/montserrat/400Regular";
import { Montserrat_500Medium } from "@expo-google-fonts/montserrat/500Medium";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppStateFocus } from "@/hooks/useAppStateFocus";
import "@/hooks/useNetworkStatus";
import { AnimatedSplash } from "@/features/auth/components/AnimatedSplash";
import { NavigationTheme } from "@/navigation/NavigationTheme";
import { useStackScreenOptions } from "@/navigation/screen-options";
import { queryClient } from "@/services/query-client";
import { useAuthStore } from "@/stores/auth.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { ThemeProvider } from "@/theme";
import { ConfigErrorScreen } from "@/components/states/ConfigErrorScreen";
import { configResult } from "@/config/env";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold });
  const preferencesReady = usePreferencesStore((state) => state.hydrated);
  const authStatus = useAuthStore((state) => state.status);
  useAppStateFocus();
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    void usePreferencesStore.getState().hydrate();
    // Invalid configuration fails closed: no session restore, no API calls.
    if (configResult.ok) void useAuthStore.getState().restore();
  }, []);

  // Font failure falls back to system fonts rather than blocking the app.
  const ready = (fontsLoaded || fontError !== null) && preferencesReady && (authStatus !== "restoring" || !configResult.ok);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {configResult.ok ? (
              <NavigationTheme>
                <RootNavigator />
                {splashDone ? null : <AnimatedSplash onFinish={finishSplash} />}
              </NavigationTheme>
            ) : (
              <ConfigErrorScreen issues={configResult.issues} />
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const signedIn = useAuthStore((state) => state.status === "signedIn");
  const hasSeenIntro = usePreferencesStore((state) => state.hasSeenIntro);
  const screenOptions = useStackScreenOptions();

  // Cached data belongs to the previous user — drop it on sign-out.
  useEffect(() => {
    if (!signedIn) queryClient.clear();
  }, [signedIn]);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Protected guard={!signedIn && !hasSeenIntro}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="invoice" options={{ headerShown: false }} />
        <Stack.Screen name="residence" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: "Notificações" }} />
      </Stack.Protected>
    </Stack>
  );
}
