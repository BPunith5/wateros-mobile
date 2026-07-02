import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MonitorIllustration,
  AnalyticsIllustration,
  AlertsIllustration,
} from '@/src/components/onboarding/OnboardingIllustration';
import PaginationDots from '@/src/components/glass/PaginationDots';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { colors, gradients, radius, typography } from '@/src/theme/tokens';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Monitor Every Drop',
    subtitle: 'Real-time water level tracking across all your tanks — always know exactly what you have.',
    Illustration: MonitorIllustration,
    accent: colors.cyan,
    gradient: gradients.ocean,
  },
  {
    title: 'Live Intelligence',
    subtitle: 'pH, temperature, dissolved oxygen, turbidity — multi-device insights in one beautiful view.',
    Illustration: AnalyticsIllustration,
    accent: colors.seafoam,
    gradient: ['#010B1E', '#032436', '#063D4A'] as const,
  },
  {
    title: 'Stay Ahead of Issues',
    subtitle: 'Smart alerts catch anomalies the moment they happen — before they become problems.',
    Illustration: AlertsIllustration,
    accent: colors.danger,
    gradient: ['#110008', '#2A0016', '#0A040F'] as const,
  },
] as const;

function SlidePage({
  slide,
  index,
  scrollX,
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  scrollX: SharedValue<number>;
}) {
  const containerStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
    const scale = interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, 30], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  const textStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const { Illustration } = slide;

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.illustrationWrap, containerStyle]}>
        <Illustration />
      </Animated.View>
      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={[styles.title, { color: slide.accent }]}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

async function markOnboardingDone() {
  await SecureStore.setItemAsync('onboarding_done', 'true');
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    scrollX.value = x;
    setActiveIndex(Math.round(x / W));
  }

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * W, animated: true });
    } else {
      finish();
    }
  }

  async function finish() {
    await markOnboardingDone();
    router.replace('/(auth)/login');
  }

  const isLast = activeIndex === SLIDES.length - 1;

  const bgStyle = useAnimatedStyle(() => {
    const inputRange = SLIDES.map((_, i) => i * W);
    const outputColors = SLIDES.map(s => s.gradient[1]);
    const color = interpolateColor(scrollX.value, inputRange, outputColors);
    return { backgroundColor: color };
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#01040F', '#03142E', '#0A3D62']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, styles.tint, bgStyle]} />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={{ width: W * SLIDES.length }}
      >
        {SLIDES.map((slide, i) => (
          <SlidePage key={i} slide={slide} index={i} scrollX={scrollX} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <PaginationDots count={SLIDES.length} activeIndex={activeIndex} />

        <View style={styles.buttonRow}>
          {!isLast && (
            <Pressable onPress={finish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
          <LiquidButton
            label={isLast ? 'Get Started' : 'Next'}
            icon={isLast ? 'checkmark' : 'arrow-forward'}
            onPress={goNext}
            style={styles.nextBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.abyss,
  },
  tint: {
    opacity: 0.35,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 180,
    gap: 40,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: 32,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 20,
    paddingTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'flex-end',
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  nextBtn: {
    flex: 1,
    maxWidth: 200,
  },
});
