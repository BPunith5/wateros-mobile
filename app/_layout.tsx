import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts as useOutfit, Outfit_300Light, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { useFonts as useManrope, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { colors } from '@/src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// True for the entire JS runtime session — resets to false only on a full reload.
// Ensures the splash always plays once per app launch, even if Expo Go restores
// a previous navigation state that bypasses the root index route.
let splashShown = false;

function NavigationGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Force splash BEFORE waiting for auth — prevents flash of restored nav state.
    if (!splashShown) {
      splashShown = true;
      router.replace('/');
      return;
    }

    if (loading) return;

    // While the splash is on screen, do nothing.
    if ((segments as string[]).length === 0) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    SecureStore.getItemAsync('onboarding_done').then(v => {
      const onboardingDone = v === 'true';

      if (!onboardingDone && !inOnboarding) {
        router.replace('/onboarding');
        return;
      }

      if (!user && !inAuth && !inOnboarding) {
        router.replace('/(auth)/login');
      } else if (user && inAuth) {
        if (user.role === 'superadmin') router.replace('/(console)/admins');
        else if (user.role === 'admin') router.replace('/(admin)/devices');
        else router.replace('/(tabs)/dashboard');
      }
    });
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const [outfitLoaded] = useOutfit({ Outfit_300Light, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  const [manropeLoaded] = useManrope({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  const fontsLoaded = outfitLoaded && manropeLoaded;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.abyss }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <NavigationGuard />
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.abyss } }}>
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(console)" />
              <Stack.Screen name="tank/[id]" />
              <Stack.Screen name="tank/add" />
              <Stack.Screen name="admin/device/[id]" />
              <Stack.Screen name="console/device/[id]" />
              <Stack.Screen name="console/create-admin" />
              <Stack.Screen name="console/sensor-assign/[id]" />
            </Stack>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
