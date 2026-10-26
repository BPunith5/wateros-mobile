import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import LiquidButton from '@/src/components/glass/LiquidButton';
import MenuRow from '@/src/components/glass/MenuRow';
import StatCard from '@/src/components/glass/StatCard';
import IconButton from '@/src/components/glass/IconButton';
import { useAuth } from '@/src/context/AuthContext';
import { devicesApi, tanksApi, alertsApi } from '@/src/lib/api';
import { colors, gradients, radius, spacing, typography } from '@/src/theme/tokens';

function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  return `Member since ${d.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [tankCount, setTankCount] = useState(0);
  const [fleetHealth, setFleetHealth] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = () => {
    Promise.all([tanksApi.list(), devicesApi.list(), alertsApi.list()])
      .then(([tanks, devices, alerts]) => {
        setTankCount(tanks.length);
        const healthScores = devices.filter(d => d.tankId).map(d => d.healthScore);
        setFleetHealth(
          healthScores.length > 0
            ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
            : 0,
        );
        setUnreadAlerts(alerts.filter(a => !a.read).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const memberSince = user?.createdAt ? formatMemberSince(user.createdAt) : '';
  const tabBarH = Platform.OS === 'ios' ? 100 : 80;

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
    <View style={s.root}>
      <OceanBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarH + spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Profile</Text>
            <IconButton icon="settings-outline" onPress={() => router.push('/settings' as any)} />
          </View>

          {/* Profile hero */}
          <GlassSurface style={[s.hero, { borderRadius: radius.xl }]}>
            <View style={s.avatar}>
              <LinearGradient
                colors={gradients.aquaGlow as [string, string, string]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.avatarGradient}
              >
                <Text style={s.avatarInitials}>{initials}</Text>
              </LinearGradient>
            </View>
            <Text style={s.name}>{user?.name ?? 'User'}</Text>
            <Text style={s.role}>{user?.email}</Text>
            <View style={s.facilityPill}>
              <Ionicons name="person-circle-outline" size={13} color={colors.textSecondary} />
              <Text style={s.facilityText}>
                {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'User'}
              </Text>
            </View>
            {memberSince ? <Text style={s.memberSince}>{memberSince}</Text> : null}
          </GlassSurface>

          {/* Stats */}
          <View style={s.statsRow}>
            <StatCard icon="water-outline" value={`${tankCount}`} label="Tanks Managed" color={colors.cyan} />
            <StatCard icon="pulse-outline" value={`${fleetHealth}%`} label="Fleet Health" color={colors.aqua} />
            <StatCard icon="notifications-outline" value={`${unreadAlerts}`} label="Alerts" color={colors.danger} />
          </View>

          {/* Account */}
          <Text style={s.sectionLabel}>Account</Text>
          <GlassSurface style={s.menuCard}>
            <MenuRow icon="person-outline" label="Edit Profile" onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in the next update.')} />
            <View style={s.divider} />
            <MenuRow icon="shield-checkmark-outline" label="Security & Privacy" onPress={() => Alert.alert('Coming Soon', 'Security settings will be available in the next update.')} />
            <View style={s.divider} />
            <MenuRow icon="settings-outline" label="App Settings" onPress={() => router.push('/settings' as any)} />
          </GlassSurface>

          {/* Support */}
          <Text style={s.sectionLabel}>Support</Text>
          <GlassSurface style={s.menuCard}>
            <MenuRow icon="help-circle-outline" label="Help Center" onPress={() => Alert.alert('Help', 'For support, contact us at support@aquanigha.com')} />
            <View style={s.divider} />
            <MenuRow icon="information-circle-outline" label="About Aqua Nigha" value="v1.0.0" onPress={() => {}} />
          </GlassSurface>

          {/* Log out */}
          <LiquidButton
            label="Sign Out"
            variant="ghost"
            icon="log-out-outline"
            onPress={handleLogout}
            fullWidth
            style={s.logoutButton}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.abyss },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  hero: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: 4,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: colors.cyan,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textInverse,
  },
  name: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  role: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  facilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  facilityText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  memberSince: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginLeft: 56,
  },
  logoutButton: {
    marginTop: spacing.xs,
  },
});
