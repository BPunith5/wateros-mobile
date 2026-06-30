import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassSurface from '@/src/components/glass/GlassSurface';
import LiquidGauge from './LiquidGauge';
import { colors, radius, typography } from '@/src/theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  percentage: number;
  color: string;
  style?: StyleProp<ViewStyle>;
};

export default function MetricOrbCard({ icon, label, value, unit, percentage, color, style }: Props) {
  return (
    <GlassSurface style={[styles.card, style]}>
      <LiquidGauge
        size={68}
        percentage={percentage}
        color={color}
        icon={<Ionicons name={icon} size={16} color={colors.textPrimary} style={{ marginBottom: 2 }} />}
      />
      <View style={styles.info}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
          {unit ? <Text style={styles.unit}> {unit}</Text> : null}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderRadius: radius.lg,
    width: '100%',
  },
  info: {
    flex: 1,
  },
  value: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  unit: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
