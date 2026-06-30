import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import WaterVessel from '@/src/components/water/WaterVessel';
import FloatingCapsule from '@/src/components/metrics/FloatingCapsule';
import { TankRecord, TelemetryRecord, DeviceRecord } from '@/src/lib/api';
import { colors, spacing, typography, radius, tankTypeMeta } from '@/src/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  tank: TankRecord | null;
  telemetry: TelemetryRecord | null;
  device: DeviceRecord | null;
  onClose: () => void;
}

export default function TankDetailOverlay({ visible, tank, telemetry, device, onClose }: Props) {
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const translateY = useSharedValue(sh);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 280 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 180, mass: 0.9 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 220 });
      translateY.value = withTiming(sh, { duration: 320, easing: Easing.bezier(0.4, 0, 1, 1) });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  if (!tank) return null;

  const meta = tankTypeMeta[tank.tankType] ?? tankTypeMeta.drinking;
  const level = telemetry?.waterLevel ?? 0;
  const volume = Math.round(level * tank.capacity);
  const VESSEL_W = sw - spacing.lg * 4;
  const VESSEL_H = Math.round(VESSEL_W * 0.68);

  const metrics = [
    { icon: 'thermometer-outline' as const, value: telemetry ? telemetry.temperature.toFixed(1) : '--', unit: '°C', label: 'Temperature', color: colors.warning },
    { icon: 'flask-outline' as const, value: telemetry ? telemetry.ph.toFixed(1) : '--', unit: '', label: 'pH Level', color: colors.teal },
    { icon: 'water-outline' as const, value: telemetry ? (telemetry.dissolvedOxygen * 100).toFixed(0) : '--', unit: '%', label: 'Dissolved O₂', color: colors.cyan },
    { icon: 'eye-outline' as const, value: telemetry ? telemetry.turbidity.toFixed(1) : '--', unit: 'NTU', label: 'Turbidity', color: colors.seafoam },
    { icon: 'stats-chart-outline' as const, value: telemetry ? telemetry.tds.toFixed(0) : '--', unit: 'ppm', label: 'TDS', color: colors.info },
    { icon: 'radio-outline' as const, value: device ? `${device.signal}` : '--', unit: '%', label: 'Signal', color: colors.electricBlue },
  ];

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }, sheetStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.typeIcon, { backgroundColor: `${meta.accent}22` }]}>
              <Ionicons name={meta.icon as any} size={16} color={meta.accent} />
            </View>
            <View>
              <Text style={styles.tankName}>{tank.tankName}</Text>
              <Text style={styles.tankType}>{meta.label}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Vessel hero */}
          <View style={styles.vesselWrap}>
            <WaterVessel
              percentage={level}
              color={meta.accent}
              width={VESSEL_W}
              height={VESSEL_H}
              showBubbles
            />
            {/* Level overlay */}
            <View style={styles.levelOverlay} pointerEvents="none">
              <Text style={[styles.levelPct, { color: meta.accent }]}>
                {Math.round(level * 100)}%
              </Text>
              <Text style={styles.levelVol}>
                {volume.toLocaleString()} / {tank.capacity.toLocaleString()} L
              </Text>
            </View>
          </View>

          {/* Metrics grid */}
          <View style={styles.metricsGrid}>
            {metrics.map((m, i) => (
              <FloatingCapsule
                key={i}
                icon={m.icon}
                value={m.value}
                unit={m.unit}
                label={m.label}
                color={m.color}
              />
            ))}
          </View>

          {/* Device status */}
          {device && (
            <View style={styles.deviceRow}>
              <Ionicons name="hardware-chip-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.deviceText}>
                {device.deviceName} · Battery {device.battery}% · {device.status}
              </Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            onPress={() => { onClose(); setTimeout(() => router.push(`/tank/${tank._id}` as any), 320); }}
            style={styles.ctaBtn}
          >
            <LinearGradient
              colors={meta.gradient as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Full Details</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textPrimary} />
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(1,4,15,0.72)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#050f20',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,211,238,0.2)',
    zIndex: 11,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tankName: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  tankType: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  vesselWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  levelOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.lg,
  },
  levelPct: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.size.xxl * 1.1,
  },
  levelVol: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  deviceText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  ctaBtn: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  ctaText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
});
