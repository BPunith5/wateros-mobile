import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassSurface from '@/src/components/glass/GlassSurface';
import { colors, spacing, typography } from '@/src/theme/tokens';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function StatCard({ icon, value, label, color = colors.cyan, style }: StatCardProps) {
  return (
    <GlassSurface style={[styles.card, style]}>
      <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    lineHeight: typography.size.xxl * 1.2,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
