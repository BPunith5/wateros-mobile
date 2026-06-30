import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  KeyboardAvoidingView, Platform, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import GlassInput from '@/src/components/glass/GlassInput';
import LiquidButton from '@/src/components/glass/LiquidButton';
import StatusPill from '@/src/components/glass/StatusPill';
import { consoleApi, AdminRecord } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

export default function CreateAdminScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ admin: AdminRecord; password: string } | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const admin = await consoleApi.createAdmin(name.trim(), email.trim(), password);
      setCreated({ admin, password });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create admin.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (value: string, label: string) => {
    Clipboard.setString(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  // ── Credentials summary screen ──────────────────────────────
  if (created) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.backBtn} />
              <Text style={styles.title}>Admin Created</Text>
              <View style={styles.backBtn} />
            </View>

            {/* Success badge */}
            <View style={styles.successBadge}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={28} color={colors.success} />
              </View>
              <Text style={styles.successName}>{created.admin.name}</Text>
              <StatusPill label="Administrator" color={colors.aqua} />
            </View>

            {/* Credentials card */}
            <GlassSurface style={styles.credCard}>
              <Text style={styles.credTitle}>Login Credentials</Text>
              <Text style={styles.credNote}>Save these before leaving — the password won't be shown again.</Text>

              <View style={styles.credRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textTertiary} />
                <View style={styles.credContent}>
                  <Text style={styles.credLabel}>Email</Text>
                  <Text style={styles.credValue}>{created.admin.email}</Text>
                </View>
                <Pressable onPress={() => copyToClipboard(created.admin.email, 'Email')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={16} color={colors.aqua} />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.credRow}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                <View style={styles.credContent}>
                  <Text style={styles.credLabel}>Password</Text>
                  <Text style={styles.credValue}>{created.password}</Text>
                </View>
                <Pressable onPress={() => copyToClipboard(created.password, 'Password')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={16} color={colors.aqua} />
                </Pressable>
              </View>
            </GlassSurface>

            <LiquidButton
              label="Done"
              onPress={() => router.back()}
              fullWidth
              icon="checkmark-circle-outline"
              style={styles.doneBtn}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Create form ──────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.title}>New Administrator</Text>
              <View style={styles.backBtn} />
            </View>

            <GlassSurface style={styles.card}>
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
                placeholder="admin@example.com"
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
            </GlassSurface>

            <LiquidButton
              label="Create Admin"
              onPress={handleCreate}
              loading={loading}
              fullWidth
              icon="person-add-outline"
              style={styles.createBtn}
            />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  createBtn: {},

  // Success state
  successBadge: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: `${colors.success}44`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  successName: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  credCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  credTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  credNote: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  credContent: { flex: 1 },
  credLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  credValue: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: spacing.xs,
  },
  doneBtn: {},
});
