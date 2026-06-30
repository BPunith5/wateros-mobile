import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/src/theme/tokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  unit?: string;
  color?: string;
  alert?: boolean;
  size?: 'sm' | 'md';
}

export default function FloatingCapsule({
  icon, value, label, unit, color = colors.cyan, alert = false, size = 'md',
}: Props) {
  const isSmall = size === 'sm';
  return (
    <View style={[styles.capsule, alert && { borderColor: `${colors.danger}55` }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={isSmall ? 13 : 15} color={color} />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color }, isSmall && styles.valueSmall]}>
            {value}
          </Text>
          {unit ? (
            <Text style={[styles.unit, isSmall && styles.unitSmall]}>{unit}</Text>
          ) : null}
        </View>
        <Text style={[styles.label, isSmall && styles.labelSmall]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs + 2,
    minWidth: 88,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  value: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.base,
    lineHeight: typography.size.base * 1.2,
  },
  valueSmall: {
    fontSize: typography.size.sm,
  },
  unit: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginBottom: 1,
  },
  unitSmall: {
    fontSize: 10,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  labelSmall: {
    fontSize: 10,
  },
});
