import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassSurface from '@/src/components/glass/GlassSurface';
import { colors, typography, spacing } from '@/src/theme/tokens';

interface MetricOrbProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color?: string;
  alert?: boolean;
  size?: number;
}

export default function MetricOrb({
  icon, value, label, color = colors.cyan, alert = false, size = 72,
}: MetricOrbProps) {
  return (
    <GlassSurface
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        alert && {
          borderColor: `${color}88`,
          borderWidth: 1.5,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 2,
  },
  value: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
