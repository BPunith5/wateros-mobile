import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import GlassInput from '@/src/components/glass/GlassInput';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoSection}>
              <Text style={styles.logo}>Aqua Nigha</Text>
              <Text style={styles.subtitle}>Smart Water Monitoring</Text>
            </View>

            {/* Card */}
            <GlassSurface style={styles.card}>
              <Text style={styles.cardTitle}>Create Account</Text>

              <GlassInput
                label="Full Name"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder="Jane Doe"
              />

              <GlassInput
                label="Email Address"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />

              <GlassInput
                label="Password"
                icon="lock-closed-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword(v => !v)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="Min. 6 characters"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <LiquidButton
                label="Create Account"
                onPress={handleRegister}
                loading={loading}
                fullWidth
                style={styles.btn}
              />
            </GlassSurface>

            {/* Footer link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
                <Text style={styles.footerLink}>Sign In</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.display,
    color: colors.aqua,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textSecondary,
    marginTop: 6,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.danger,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.cyan,
  },
});
