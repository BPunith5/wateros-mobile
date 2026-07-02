import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView,
  Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import GlassInput from '@/src/components/glass/GlassInput';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { useAuth } from '@/src/context/AuthContext';
import { authApi } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function LoginScreen() {
  const { loginWithToken } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.login(email.trim(), password);
      setStep('otp');
      setCountdown(RESEND_COOLDOWN);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) verifyOtp(next.join(''));
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authApi.verifyOtp(email.trim(), code);
      await loginWithToken(token, user);
    } catch (e: any) {
      setError(e.message ?? 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setError('');
    setLoading(true);
    try {
      await authApi.login(email.trim(), password);
      setCountdown(RESEND_COOLDOWN);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e: any) {
      setError(e.message ?? 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoSection}>
              <Text style={styles.logo}>Aqua Nigha</Text>
              <Text style={styles.subtitle}>Smart Water Monitoring</Text>
            </View>

            <GlassSurface style={styles.card}>
              {step === 'credentials' ? (
                <>
                  <Text style={styles.cardTitle}>Sign In</Text>

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
                    autoComplete="password"
                    textContentType="password"
                    placeholder="••••••••"
                  />

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <LiquidButton
                    label="Send OTP"
                    onPress={handleSendOtp}
                    loading={loading}
                    fullWidth
                    style={styles.btn}
                    icon="mail-outline"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Enter OTP</Text>
                  <Text style={styles.otpHint}>
                    A 6-digit code was sent to{'\n'}
                    <Text style={styles.otpEmail}>{email}</Text>
                  </Text>

                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={r => { inputRefs.current[i] = r; }}
                        style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                        value={digit}
                        onChangeText={val => handleOtpChange(val, i)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        caretHidden
                      />
                    ))}
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  {loading && (
                    <Text style={styles.verifyingText}>Verifying...</Text>
                  )}

                  <View style={styles.resendRow}>
                    <Text style={styles.resendLabel}>Didn't receive it? </Text>
                    <Pressable onPress={handleResend} disabled={countdown > 0} hitSlop={8}>
                      <Text style={[styles.resendLink, countdown > 0 && styles.resendDisabled]}>
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable onPress={() => { setStep('credentials'); setError(''); setOtp(['','','','','','']); }} hitSlop={8}>
                    <Text style={styles.backLink}>← Change email / password</Text>
                  </Pressable>
                </>
              )}
            </GlassSurface>

            {step === 'credentials' && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable onPress={() => router.replace('/(auth)/register')} hitSlop={8}>
                  <Text style={styles.footerLink}>Create Account</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxl },
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
  card: { padding: spacing.lg, borderRadius: radius.lg },
  cardTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  otpHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  otpEmail: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.aqua,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    textAlign: 'center',
    fontSize: 22,
    fontFamily: typography.fontFamily.headingBold,
    color: colors.textPrimary,
  },
  otpBoxFilled: {
    borderColor: colors.aqua,
    backgroundColor: 'rgba(77,232,230,0.08)',
  },
  verifyingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.aqua,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.danger,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  btn: { marginTop: spacing.sm },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resendLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  resendLink: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.cyan,
  },
  resendDisabled: { color: colors.textTertiary },
  backLink: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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
