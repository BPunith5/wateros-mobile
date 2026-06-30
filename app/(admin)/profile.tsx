import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Platform, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import LiquidButton from '@/src/components/glass/LiquidButton';
import MenuRow from '@/src/components/glass/MenuRow';
import StatusPill from '@/src/components/glass/StatusPill';
import StatCard from '@/src/components/glass/StatCard';
import { useAuth } from '@/src/context/AuthContext';
import { devicesApi, tanksApi, alertsApi } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function roleColor(role: string): string {
  switch (role) {
    case 'superadmin': return colors.aqua;
    case 'admin': return colors.teal;
    default: return colors.cyan;
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'superadmin': return 'SUPER ADMIN';
    case 'admin': return 'ADMIN';
    default: return 'USER';
  }
}

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [tankCount, setTankCount] = useState(0);
  const [fleetHealth, setFleetHealth] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    Promise.all([tanksApi.list(), devicesApi.list(), alertsApi.list()])
      .then(([tanks, devices, alerts]) => {
        setTankCount(tanks.length);
        const healthScores = devices.filter(d => d.tankId).map(d => d.healthScore);
        setFleetHealth(healthScores.length > 0
          ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
          : 0);
        setUnreadAlerts(alerts.filter(a => !a.read).length);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

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
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push('/settings' as any)}
            style={styles.settingsBtn}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { borderColor: roleColor(user?.role ?? 'user'), backgroundColor: `${roleColor(user?.role ?? 'user')}22` }]}>
              <Text style={[styles.avatarText, { color: roleColor(user?.role ?? 'user') }]}>{initials}</Text>
            </View>
            <Text style={styles.name}>{user?.name ?? ''}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            {(user as any)?.createdAt && (
              <Text style={styles.memberSince}>
                Member since {new Date((user as any).createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
            )}
            {user?.role && (
              <StatusPill label={roleLabel(user.role)} color={roleColor(user.role)} />
            )}
          </View>

          {!statsLoading && (
            <View style={styles.statsRow}>
              <StatCard icon="layers-outline" value={tankCount} label="Tanks Managed" color={colors.cyan} style={styles.statCard} />
              <StatCard icon="pulse-outline" value={`${fleetHealth}%`} label="Fleet Health" color={colors.aqua} style={styles.statCard} />
              <StatCard icon="notifications-outline" value={unreadAlerts} label="Alerts" color={colors.danger} style={styles.statCard} />
            </View>
          )}

          <Text style={styles.sectionLabel}>Account</Text>
          <GlassSurface style={styles.card}>
            <MenuRow icon="person-outline" label="Name" value={user?.name ?? ''} />
            <View style={styles.divider} />
            <MenuRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
            <View style={styles.divider} />
            <MenuRow icon="shield-outline" label="Role" value={roleLabel(user?.role ?? 'admin')} />
          </GlassSurface>

          <Text style={styles.sectionLabel}>Settings</Text>
          <GlassSurface style={styles.card}>
            <MenuRow
              icon="settings-outline"
              label="App Settings"
              showChevron
              onPress={() => router.push('/settings' as any)}
            />
          </GlassSurface>

          <Text style={styles.sectionLabel}>Support</Text>
          <GlassSurface style={styles.card}>
            <MenuRow icon="help-circle-outline" label="Help Center" showChevron onPress={() => {}} />
            <View style={styles.divider} />
            <MenuRow icon="information-circle-outline" label="About WaterOS" value="v1.0.0" />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xxl,
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
  memberSince: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: { flex: 1 },
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
