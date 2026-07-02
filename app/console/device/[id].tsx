import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, Pressable,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatusPill from '@/src/components/glass/StatusPill';
import { consoleApi, DeviceDetailRecord, TelemetryRecord, AssignedAdmin } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function statusColor(s: string) {
  if (s === 'active') return colors.success;
  if (s === 'offline') return colors.danger;
  if (s === 'pending') return colors.warning;
  return colors.textTertiary;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function ConsoleDeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [device, setDevice] = useState<DeviceDetailRecord | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretRevealed, setSecretRevealed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [dev, logs] = await Promise.all([
        consoleApi.deviceDetail(id),
        consoleApi.deviceTelemetry(id, 1),
      ]);
      setDevice(dev);
      setTelemetry(logs[0] ?? null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to load device');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copySecret = async () => {
    if (!device?.secretKey) return;
    await Clipboard.setStringAsync(device.secretKey);
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };

  const pb = Platform.OS === 'ios' ? 120 : 100;

  if (loading) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <View style={styles.center}>
          <ActivityIndicator color={colors.aqua} size="large" />
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.center}>
            <Text style={styles.errorText}>Device not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const tank = typeof device.tankId === 'object' ? device.tankId : null;
  const owner = typeof device.userId === 'object' ? device.userId : null;
  const admins: AssignedAdmin[] = device.assignedAdminIds ?? [];

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Device Detail</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: pb + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <GlassSurface style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroName}>{device.deviceName}</Text>
                <Text style={styles.heroId}>{device.deviceId}</Text>
              </View>
              <StatusPill label={device.status} color={statusColor(device.status)} />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="battery-half-outline" size={15} color={colors.aqua} />
                <Text style={styles.statVal}>{device.battery}%</Text>
                <Text style={styles.statLbl}>Battery</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="wifi-outline" size={15} color={colors.aqua} />
                <Text style={styles.statVal}>{device.signal}%</Text>
                <Text style={styles.statLbl}>Signal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="pulse-outline" size={15} color={colors.aqua} />
                <Text style={styles.statVal}>{device.healthScore}</Text>
                <Text style={styles.statLbl}>Health</Text>
              </View>
            </View>

            <View style={styles.lastSeenRow}>
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.lastSeenText}>Last seen: {timeAgo(device.lastSeen)}</Text>
            </View>
          </GlassSurface>

          {/* Tank */}
          {tank && (
            <>
              <SectionLabel label="Connected Tank" />
              <GlassSurface style={styles.infoCard}>
                <InfoRow label="Tank Name" value={tank.tankName} accent={colors.teal} />
                {tank.location && (
                  <>
                    <Divider />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <View style={styles.locationVal}>
                        <Ionicons name="location-outline" size={13} color={colors.cyan} />
                        <Text style={[styles.infoValue, { color: colors.cyan }]}>{tank.location}</Text>
                      </View>
                    </View>
                  </>
                )}
              </GlassSurface>
            </>
          )}

          {/* Owner */}
          {owner && (
            <>
              <SectionLabel label="Device Owner" />
              <GlassSurface style={styles.infoCard}>
                <View style={styles.userRow}>
                  <View style={[styles.avatar, { backgroundColor: `${colors.aqua}18`, borderColor: `${colors.aqua}40` }]}>
                    <Text style={[styles.avatarText, { color: colors.aqua }]}>
                      {owner.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{owner.name}</Text>
                    <Text style={styles.userEmail}>{owner.email}</Text>
                  </View>
                </View>
              </GlassSurface>
            </>
          )}

          {/* Assigned Admins */}
          {admins.length > 0 && (
            <>
              <SectionLabel label={`Assigned Admins (${admins.length})`} />
              <GlassSurface style={styles.infoCard}>
                {admins.map((admin, i) => (
                  <React.Fragment key={admin._id}>
                    {i > 0 && <Divider />}
                    <View style={styles.userRow}>
                      <View style={[styles.avatar, styles.avatarSmall, { backgroundColor: `${colors.electricBlue}18`, borderColor: `${colors.electricBlue}40` }]}>
                        <Text style={[styles.avatarText, { color: colors.electricBlue, fontSize: 11 }]}>
                          {admin.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{admin.name}</Text>
                        <Text style={styles.userEmail}>{admin.email}</Text>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </GlassSurface>
            </>
          )}

          {/* Latest telemetry */}
          {telemetry ? (
            <>
              <SectionLabel label="Latest Readings" />
              <GlassSurface style={styles.infoCard}>
                <View style={styles.telemetryGrid}>
                  {[
                    { label: 'Water Level', value: `${(telemetry.waterLevel * 100).toFixed(1)}%`, icon: 'water-outline' },
                    { label: 'Temperature', value: `${telemetry.temperature.toFixed(1)}°C`, icon: 'thermometer-outline' },
                    { label: 'pH', value: telemetry.ph.toFixed(2), icon: 'flask-outline' },
                    { label: 'Dissolved O₂', value: `${(telemetry.dissolvedOxygen * 100).toFixed(0)}%`, icon: 'leaf-outline' },
                    { label: 'Turbidity', value: `${telemetry.turbidity.toFixed(0)} NTU`, icon: 'eye-outline' },
                    { label: 'TDS', value: `${telemetry.tds ?? 0} ppm`, icon: 'analytics-outline' },
                  ].map((m, i) => (
                    <View key={i} style={styles.metricCell}>
                      <Ionicons name={m.icon as any} size={14} color={colors.aqua} />
                      <Text style={styles.metricVal}>{m.value}</Text>
                      <Text style={styles.metricLbl}>{m.label}</Text>
                    </View>
                  ))}
                </View>
                <Divider />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Recorded at</Text>
                  <Text style={styles.infoValue}>
                    {new Date(telemetry.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </GlassSurface>
            </>
          ) : (
            <>
              <SectionLabel label="Latest Readings" />
              <GlassSurface style={[styles.infoCard, styles.emptyTelemetry]}>
                <Ionicons name="pulse-outline" size={28} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No telemetry data yet</Text>
              </GlassSurface>
            </>
          )}

          {/* Device info */}
          <SectionLabel label="Device Info" />
          <GlassSurface style={styles.infoCard}>
            <InfoRow label="Device ID" value={device.deviceId} />
            <Divider />
            <InfoRow label="Status" value={device.status} />
            <Divider />
            <InfoRow label="Health Level" value={device.healthLevel} />
            <Divider />
            <InfoRow label="Activation PIN" value={device.activationPin ?? '—'} />
            <Divider />
            <InfoRow label="Registered" value={formatDate(device.createdAt)} />
          </GlassSurface>

          {/* Secret key */}
          <SectionLabel label="Security" />
          <GlassSurface style={styles.infoCard}>
            {secretRevealed && device.secretKey && (
              <Pressable style={styles.secretBox} onPress={copySecret}>
                <Ionicons name="lock-open-outline" size={13} color={colors.aqua} />
                <Text style={styles.secretLabel}>Secret Key</Text>
                <Text style={styles.secretValue} numberOfLines={1}>{device.secretKey}</Text>
                <Ionicons name="copy-outline" size={13} color={colors.aqua} />
              </Pressable>
            )}
            <Pressable
              style={styles.revealRow}
              onPress={() => setSecretRevealed(v => !v)}
            >
              <Ionicons
                name={secretRevealed ? 'eye-off-outline' : 'eye-outline'}
                size={14}
                color={colors.aqua}
              />
              <Text style={styles.revealText}>
                {secretRevealed ? 'Hide Secret Key' : 'Reveal Secret Key'}
              </Text>
            </Pressable>
          </GlassSurface>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.base, color: colors.textSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },

  scroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.sm },

  sectionLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: 2,
    paddingHorizontal: 2,
  },

  heroCard: { padding: spacing.md, gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLeft: { flex: 1, marginRight: spacing.sm },
  heroName: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  heroId: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: colors.glassBorder },
  statVal: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  statLbl: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  lastSeenRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lastSeenText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },

  infoCard: { overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
  },
  infoValue: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: spacing.sm,
  },
  locationVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, backgroundColor: colors.glassBorder },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  avatarText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.sm,
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  userEmail: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },

  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  metricCell: {
    width: '30%',
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.sm,
  },
  metricVal: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  metricLbl: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  emptyTelemetry: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
  },

  secretBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: `${colors.aqua}44`,
    borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 8,
  },
  secretLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 10, color: colors.aqua,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  secretValue: {
    flex: 1,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.xs, color: colors.textSecondary, letterSpacing: 0.4,
  },
  revealRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  revealText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm, color: colors.aqua,
  },
});
