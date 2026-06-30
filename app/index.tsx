import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import OceanBackground from '@/src/components/water/OceanBackground';
import BubbleField from '@/src/components/water/BubbleField';
import PulseRing from '@/src/components/water/PulseRing';
import { colors, typography } from '@/src/theme/tokens';

const { width: W, height: H } = Dimensions.get('window');
const IMPACT_Y = H * 0.46;
const AQUA_GLOW: [string, string, string] = ['#4DE8E6', '#22D3EE', '#3B82F6'];

export default function SplashScreen() {
  const router = useRouter();

  // droplet
  const dropletY = useSharedValue(-H * 0.5);
  const dropletOpacity = useSharedValue(1);
  const dropletScaleX = useSharedValue(0.85);
  const dropletScaleY = useSharedValue(1.35);

  // ripples
  const ring1 = useSharedValue(0.1);
  const ring1Opacity = useSharedValue(0);
  const ring2 = useSharedValue(0.1);
  const ring2Opacity = useSharedValue(0);
  const ring3 = useSharedValue(0.1);
  const ring3Opacity = useSharedValue(0);

  // ocean rise
  const oceanY = useSharedValue(H);

  // logo + tagline
  const logoOpacity = useSharedValue(0);
  const logoTranslate = useSharedValue(28);
  const taglineOpacity = useSharedValue(0);

  // overall fade out
  const splashOpacity = useSharedValue(1);

  // breathing pulse on the badge once settled
  const breath = useSharedValue(1);

  useEffect(() => {
    // 1. droplet falls
    dropletY.value = withDelay(
      350,
      withTiming(0, { duration: 650, easing: Easing.in(Easing.cubic) }),
    );

    // 2. impact — droplet squashes & fades
    dropletScaleX.value = withDelay(1000, withTiming(1.8, { duration: 180, easing: Easing.out(Easing.ease) }));
    dropletScaleY.value = withDelay(1000, withTiming(0.2, { duration: 180, easing: Easing.out(Easing.ease) }));
    dropletOpacity.value = withDelay(1000, withTiming(0, { duration: 200 }));

    // 3. ripple rings expand outward
    ring1Opacity.value = withDelay(1000, withTiming(0.7, { duration: 50 }));
    ring1.value = withDelay(1000, withTiming(7, { duration: 1300, easing: Easing.out(Easing.cubic) }));
    ring1Opacity.value = withDelay(1050, withTiming(0, { duration: 1250 }));

    ring2Opacity.value = withDelay(1100, withTiming(0.55, { duration: 50 }));
    ring2.value = withDelay(1100, withTiming(8.5, { duration: 1400, easing: Easing.out(Easing.cubic) }));
    ring2Opacity.value = withDelay(1150, withTiming(0, { duration: 1350 }));

    ring3Opacity.value = withDelay(1200, withTiming(0.4, { duration: 50 }));
    ring3.value = withDelay(1200, withTiming(10, { duration: 1500, easing: Easing.out(Easing.cubic) }));
    ring3Opacity.value = withDelay(1250, withTiming(0, { duration: 1450 }));

    // 4. ocean rises to mid-screen
    oceanY.value = withDelay(950, withTiming(H * 0.4, { duration: 1150, easing: Easing.out(Easing.cubic) }));

    // 5. logo emerges from beneath the water
    logoOpacity.value = withDelay(1550, withTiming(1, { duration: 700 }));
    logoTranslate.value = withDelay(1550, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    taglineOpacity.value = withDelay(1850, withTiming(1, { duration: 600 }));

    // 5b. badge breathes gently once settled
    breath.value = withDelay(
      2300,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    // 6. water rises to fully cover the screen
    oceanY.value = withDelay(2750, withTiming(-H * 0.45, { duration: 900, easing: Easing.in(Easing.cubic) }));

    // 7. fade splash overlay & navigate
    splashOpacity.value = withDelay(3050, withTiming(0, { duration: 450 }));

    const timer = setTimeout(async () => {
      if (__DEV__) await SecureStore.deleteItemAsync('onboarding_done').catch(() => null);
      const done = await SecureStore.getItemAsync('onboarding_done').catch(() => null);
      router.replace(done === 'true' ? '/(auth)/login' : '/onboarding');
    }, 3550);

    return () => clearTimeout(timer);
  }, []);

  const dropletStyle = useAnimatedStyle(() => ({
    opacity: dropletOpacity.value,
    transform: [
      { translateY: dropletY.value },
      { scaleX: dropletScaleX.value },
      { scaleY: dropletScaleY.value },
    ],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2.value }],
  }));
  const ring3Style = useAnimatedStyle(() => ({
    opacity: ring3Opacity.value,
    transform: [{ scale: ring3.value }],
  }));

  const oceanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: oceanY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslate.value }],
  }));

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Visible gradient base — so the user sees something from frame 1 */}
      <LinearGradient
        colors={['#01040F', '#03142E', '#061A3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BubbleField count={14} opacity={0.22} />

      {/* Rising ocean */}
      <Animated.View style={[styles.oceanPanel, oceanStyle]}>
        <OceanBackground />
      </Animated.View>

      {/* Ripple rings */}
      <Animated.View pointerEvents="none" style={[styles.ring, ring3Style]} />
      <Animated.View pointerEvents="none" style={[styles.ring, ring2Style]} />
      <Animated.View pointerEvents="none" style={[styles.ring, ring1Style]} />

      {/* Falling droplet */}
      <Animated.View pointerEvents="none" style={[styles.droplet, dropletStyle]}>
        <LinearGradient
          colors={AQUA_GLOW}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.dropletGradient}
        />
      </Animated.View>

      {/* Logo emerging from the water */}
      <View pointerEvents="none" style={styles.logoWrap}>
        <Animated.View style={[styles.logoGlowWrap, logoStyle]}>
          <PulseRing size={150} color={colors.cyan} delay={1900} duration={2600} />
          <PulseRing size={150} color={colors.aqua} delay={2900} duration={2600} />
          <Animated.View style={[styles.logoBadge, breathStyle]}>
            <LinearGradient
              colors={AQUA_GLOW}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadgeGradient}
            >
              <Ionicons name="water" size={42} color={colors.textInverse} />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.logoText, logoStyle]}>WaterOS</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Smart Water Intelligence
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const RING_SIZE = 60;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.abyss,
    overflow: 'hidden',
  },
  dark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.abyss,
  },
  oceanPanel: {
    position: 'absolute',
    left: 0,
    width: W,
    height: H * 1.4,
  },
  droplet: {
    position: 'absolute',
    top: IMPACT_Y - 9,
    left: W / 2 - 9,
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  dropletGradient: { flex: 1 },
  ring: {
    position: 'absolute',
    top: IMPACT_Y - RING_SIZE / 2,
    left: W / 2 - RING_SIZE / 2,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.aqua,
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlowWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    shadowColor: colors.cyan,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logoBadgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: 42,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
