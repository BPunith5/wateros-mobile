import React from 'react';
import {
  View, Text, StyleSheet, Alert, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import LiquidButton from '@/src/components/glass/LiquidButton';
import MenuRow from '@/src/components/glass/MenuRow';
import StatusPill from '@/src/components/glass/StatusPill';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

const APP_VERSION = '1.0.0';

export default function ConsoleProfileScreen() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{user?.name ?? ''}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            <StatusPill label="SUPER ADMIN" color={colors.aqua} />
          </View>

          {/* Account Info */}
          <Text style={styles.sectionLabel}>Account</Text>
          <GlassSurface style={styles.card}>
            <MenuRow icon="person-outline" label="Name" value={user?.name ?? ''} />
            <View style={styles.divider} />
            <MenuRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
            <View style={styles.divider} />
            <MenuRow icon="shield-checkmark-outline" label="Role" value="SUPER ADMIN" />
          </GlassSurface>

          {/* App Info */}
          <Text style={styles.sectionLabel}>App Info</Text>
          <GlassSurface style={styles.card}>
            <MenuRow icon="information-circle-outline" label="Version" value={APP_VERSION} />
            <View style={styles.divider} />
            <MenuRow icon="server-outline" label="Backend" value="wateros-backend.vercel.app" />
          </GlassSurface>

          <LiquidButton
            label="Sign Out"
            onPress={handleLogout}
            variant="ghost"
            fullWidth
            icon="log-out-outline"
            style={styles.signOutBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(77,232,230,0.18)',
    borderWidth: 2,
    borderColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xxl,
    color: colors.aqua,
  },
  name: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  email: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: {
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginHorizontal: spacing.md,
  },
  signOutBtn: {
    marginTop: spacing.sm,
    borderColor: `${colors.danger}55`,
  },
});
