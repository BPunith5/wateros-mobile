import React from 'react';
import {
  Pressable, Text, View, StyleSheet, ViewStyle, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '@/src/theme/tokens';

interface LiquidButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

export default function LiquidButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
  icon,
  loading = false,
}: LiquidButtonProps) {
  const isPrimary = variant === 'primary';

  const content = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textInverse : colors.cyan} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isPrimary ? colors.textInverse : colors.cyan}
              style={styles.icon}
            />
          )}
          <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  if (isPrimary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={['#0891B2', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles.ghost,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flex: 1,
    borderRadius: radius.pill,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontFamily: typography.fontFamily.headingMedium,
    fontSize: typography.size.base,
    letterSpacing: 0.3,
  },
  labelPrimary: {
    color: colors.textInverse,
  },
  labelGhost: {
    color: colors.cyan,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
