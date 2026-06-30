import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';

// Deterministic pseudo-random from seed (no Math.random — stable across renders)
function seeded(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface BubbleFieldProps {
  count?: number;
  opacity?: number;
}

export default function BubbleField({ count = 12, opacity = 0.12 }: BubbleFieldProps) {
  const { width, height } = useWindowDimensions();
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    anims.forEach((anim, i) => {
      const dur = 6000 + Math.round(seeded(i * 7) * 6000);   // 6–12 s
      const delay = Math.round(seeded(i * 11) * 3000);         // 0–3 s stagger

      const t = setTimeout(() => {
        Animated.loop(
          Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true })
        ).start();
      }, delay);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      anims.forEach(a => a.stopAnimation());
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const size = 4 + Math.round(seeded(i) * 12);        // 4–16 px
        const xPos = seeded(i * 3) * (width - size);

        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [height + size, -(size * 2)],
        });
        const bubbleOpacity = anim.interpolate({
          inputRange: [0, 0.08, 0.85, 1],
          outputRange: [0, opacity, opacity, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: xPos,
              top: 0,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: 'white',
              opacity: bubbleOpacity,
              transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}
