import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

interface GlassInputProps extends TextInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export default function GlassInput({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...rest
}: GlassInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color={colors.textTertiary} style={styles.leftIcon} />
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.cyan}
          {...rest}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightIconBtn}>
            <Ionicons name={rightIcon} size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    height: '100%',
  },
  rightIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
