import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert,
  useWindowDimensions, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatCard from '@/src/components/glass/StatCard';
import StatusPill from '@/src/components/glass/StatusPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import LiquidButton from '@/src/components/glass/LiquidButton';
import WaterVessel from '@/src/components/water/WaterVessel';
import MetricOrb from '@/src/components/water/MetricOrb';
import {
  tanksApi, devicesApi, telemetryApi, alertsApi, complaintsApi,
  TankRecord, DeviceRecord, TelemetryRecord, AlertRecord,
  alertTankId,
} from '@/src/lib/api';
import { tankTypeMeta } from '@/src/theme/tokens';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function deviceStatusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function severityColor(s: string): string {
  switch (s) {
    case 'critical': return colors.danger;
    case 'warning': return colors.warning;
    case 'info': return colors.info;
    default: return colors.textTertiary;
  }
}

function severityIcon(s: string): keyof typeof Ionicons.glyphMap {
  switch (s) {
    case 'critical': return 'alert-circle';
    case 'warning': return 'warning';
    default: return 'information-circle';
  }
}

function healthColor(score: number): string {
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.danger;
}

function MiniBarChart({
  data, color, yMin = 0, yMax = 100, formatY,
}: { data: number[]; color: string; yMin?: number; yMax?: number; formatY?: (v: number) => string }) {
  if (!data.length) return null;
  const range = yMax - yMin || 1;
  const latest = data[data.length - 1];
  return (
    <View style={chartStyles.root}>
      <View style={chartStyles.bars}>
        {data.map((v, i) => {
          const h = Math.max(4, ((v - yMin) / range) * 100);
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={chartStyles.barWrap}>
              <View
                style={[
                  chartStyles.bar,
                  { height: `${h}%` as any, backgroundColor: isLast ? color : `${color}55`, borderRadius: 3 },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Text style={[chartStyles.latestLabel, { color }]}>
        {formatY ? formatY(latest) : latest.toFixed(1)}
      </Text>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  root: { height: 60 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barWrap: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  latestLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 10, marginTop: 3, textAlign: 'right' },
});

export default function TankDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: sw } = useWindowDimensions();
  const VESSEL_W = sw - spacing.lg * 2 - 32;
  const VESSEL_H = Math.round(VESSEL_W * 0.72);

  const [tank, setTank] = useState<TankRecord | null>(null);
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRecord[]>([]);
  const [tankAlerts, setTankAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueSubject, setIssueSubject] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const t = await tanksApi.get(id);
      setTank(t);

      const allDevices = await devicesApi.list();
      const linked = allDevices.find(d => d.tankId === id) ?? null;
      setDevice(linked);

      if (linked) {
        const logs = await telemetryApi.logs(linked.deviceId, 20);
        setTelemetry(logs[0] ?? null);
        setTelemetryHistory(logs);
      }

      try {
        const allAlerts = await alertsApi.list();
        const filtered = allAlerts.filter(a => alertTankId(a) === id).slice(0, 5);
        setTankAlerts(filtered);
      } catch {
        // silent
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleMenuPress = () => {
    Alert.alert(
      'Tank Options',
      undefined,
      [
        {
          text: 'Edit',
          onPress: () => router.push(`/tank/edit/${id}` as any),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Tank',
              'Are you sure you want to delete this tank? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await tanksApi.delete(id!);
                      router.replace('/(tabs)/tanks' as any);
                    } catch {
                      Alert.alert('Error', 'Failed to delete tank');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmitIssue = async () => {
    if (!issueSubject.trim() || !issueDesc.trim()) {
      Alert.alert('Missing Info', 'Please fill in both subject and description.');
      return;
    }
    setIssueSubmitting(true);
    try {
      await complaintsApi.submit(
        issueSubject.trim(),
        issueDesc.trim(),
        tank?._id,
        device?._id,
      );
      setShowIssueModal(false);
      setIssueSubject('');
      setIssueDesc('');
      Alert.alert('Issue Raised', 'Your issue has been submitted. The assigned admin will be notified.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit issue');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const meta = tank ? (tankTypeMeta[tank.tankType] ?? tankTypeMeta.drinking) : tankTypeMeta.drinking;
  // waterLevel from backend is 0-1, not 0-100
  const fillPct = telemetry ? telemetry.waterLevel : 0;
  const currentVolume = tank ? Math.round(fillPct * tank.capacity) : 0;

  const tankHealthScore = telemetry
    ? Math.round((telemetry.waterLevel * 0.4 + telemetry.ph / 14 * 0.6) * 100)
    : null;
  const waterQualityScore = telemetry
    ? Math.round((
        telemetry.dissolvedOxygen * 0.4 +
        (1 - Math.min(telemetry.turbidity / 10, 1)) * 0.3 +
        (1 - Math.abs(telemetry.ph - 7.0) / 3.5) * 0.3
      ) * 100)
    : null;
  const sensorHealthScore = device ? device.healthScore : null;

  const historyReversed = [...telemetryHistory].reverse();
  const histLevelData = historyReversed.map(t => t.waterLevel * 100);
  const histTempData = historyReversed.map(t => t.temperature);
  const histPhData = historyReversed.map(t => t.ph);
  const histDoData = historyReversed.map(t => t.dissolvedOxygen * 100);
  const showHistoricalCharts = telemetryHistory.length >= 3;

  if (loading) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading tank...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!tank) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Tank not found.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{tank.tankName}</Text>
          <Pressable onPress={handleMenuPress} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        >
          {/* Hero: Full-Width Animated Vessel */}
          <View style={styles.heroWrap}>
            <WaterVessel
              percentage={fillPct}
              color={meta.accent}
              width={VESSEL_W}
              height={VESSEL_H}
              showBubbles
            />
            {/* Overlay: fill % + volume */}
            <View style={styles.heroOverlay}>
              <Text style={[styles.heroPct, { color: meta.accent }]}>
                {Math.round(fillPct * 100)}%
              </Text>
              <Text style={styles.heroVol}>
                {currentVolume.toLocaleString()} / {tank.capacity.toLocaleString()} L
              </Text>
            </View>
          </View>

          {/* Metric Orbs Row */}
          {telemetry && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orbsRow}
            >
              <MetricOrb icon="thermometer-outline" value={`${telemetry.temperature.toFixed(1)}°`} label="Temp °C" color={colors.warning} />
              <MetricOrb icon="flask-outline" value={telemetry.ph.toFixed(1)} label="pH" color={colors.teal} />
              <MetricOrb icon="water-outline" value={`${telemetry.dissolvedOxygen.toFixed(1)}`} label="DO mg/L" color={colors.electricBlue} />
              <MetricOrb icon="eye-outline" value={`${telemetry.turbidity.toFixed(0)}`} label="Turbidity" color={colors.seafoam} />
              <MetricOrb icon="beaker-outline" value={`${Math.round(telemetry.tds)}`} label="TDS ppm" color={colors.cyan} />
              <MetricOrb icon="cube-outline" value={`${telemetry.waterQuantity.toFixed(0)}`} label="Volume L" color={colors.aqua} />
            </ScrollView>
          )}

          {/* Health Scores Row */}
          {telemetry && (
            <GlassSurface style={styles.healthRow}>
              {([
                { label: 'Tank Health', score: tankHealthScore },
                { label: 'Water Quality', score: waterQualityScore },
                { label: 'Device Health', score: sensorHealthScore },
              ] as { label: string; score: number | null }[]).map((item, idx) => (
                <View key={item.label} style={[styles.healthCol, idx > 0 && styles.healthColBorder]}>
                  <Text style={[
                    styles.healthValue,
                    { color: item.score !== null ? healthColor(item.score) : colors.textTertiary },
                  ]}>
                    {item.score !== null ? `${item.score}%` : '—'}
                  </Text>
                  <Text style={styles.healthLabel}>{item.label}</Text>
                </View>
              ))}
            </GlassSurface>
          )}

          {/* Telemetry stats */}
          {telemetry && (
            <>
              <SectionHeader title="Device Readings" style={styles.sectionHeader} />
              <View style={styles.statsGrid}>
                <StatCard icon="thermometer-outline" value={`${telemetry.temperature.toFixed(1)}°`} label="Temperature °C" color={colors.warning} style={styles.statCard} />
                <StatCard icon="flask-outline" value={telemetry.ph.toFixed(1)} label="pH Level" color={colors.teal} style={styles.statCard} />
                <StatCard icon="water-outline" value={`${telemetry.dissolvedOxygen.toFixed(1)}`} label="Dissolved O₂ mg/L" color={colors.electricBlue} style={styles.statCard} />
                <StatCard icon="eye-outline" value={`${telemetry.turbidity.toFixed(0)}`} label="Turbidity NTU" color={colors.seafoam} style={styles.statCard} />
                <StatCard icon="beaker-outline" value={`${Math.round(telemetry.tds)} ppm`} label="TDS" color={colors.cyan} style={styles.statCard} />
                <StatCard icon="cube-outline" value={`${telemetry.waterQuantity.toFixed(0)} L`} label="Water Quantity" color={colors.teal} style={styles.statCard} />
              </View>
            </>
          )}

          {/* Device Card */}
          <SectionHeader title="Device" style={styles.sectionHeader} />
          {device ? (
            <GlassSurface style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View>
                  <Text style={styles.deviceName}>{device.deviceName}</Text>
                  <Text style={styles.deviceId}>{device.deviceId}</Text>
                </View>
                <StatusPill label={device.status} color={deviceStatusColor(device.status)} />
              </View>
              <View style={styles.deviceStats}>
                <View style={styles.statChip}>
                  <Ionicons name="battery-half-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.statChipText}>{device.battery}% battery</Text>
                </View>
                <View style={styles.statChip}>
                  <Ionicons name="wifi-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.statChipText}>{device.signal}% signal</Text>
                </View>
                <View style={styles.statChip}>
                  <Ionicons name="pulse-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.statChipText}>{device.healthLevel}</Text>
                </View>
              </View>
            </GlassSurface>
          ) : (
            <GlassSurface style={styles.noDeviceCard}>
              <Ionicons name="hardware-chip-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.noDeviceText}>No device connected</Text>
              <Text style={styles.noDeviceSub}>Connect a device from the Devices tab</Text>
            </GlassSurface>
          )}

          {/* Action Buttons */}
          <View style={styles.actionBtns}>
            {!device && (
              <LiquidButton
                label="Connect a Device"
                onPress={() => router.push('/(tabs)/devices?addSensor=1' as any)}
                icon="hardware-chip-outline"
                style={styles.actionBtn}
              />
            )}
            {device && (
              <LiquidButton
                label="Raise an Issue"
                onPress={() => setShowIssueModal(true)}
                icon="flag-outline"
                style={styles.actionBtn}
              />
            )}
            <LiquidButton
              label="View Analytics"
              variant="ghost"
              icon="bar-chart-outline"
              onPress={() => router.push('/(tabs)/analytics' as any)}
              style={styles.actionBtn}
            />
          </View>

          {/* Tank Info */}
          <SectionHeader title="Tank Info" style={styles.sectionHeader} />
          <GlassSurface style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{meta.label}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Capacity</Text>
              <Text style={styles.infoValue}>{tank.capacity.toLocaleString()} L</Text>
            </View>
            {tank.location && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{tank.location}</Text>
                </View>
              </>
            )}
            {tank.description && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Notes</Text>
                  <Text style={[styles.infoValue, styles.notesValue]}>{tank.description}</Text>
                </View>
              </>
            )}
          </GlassSurface>

          {/* Historical Trends */}
          {showHistoricalCharts && (
            <>
              <SectionHeader title="Historical Trends" style={styles.sectionHeader} />
              <View style={styles.chartGrid}>
                <GlassSurface style={styles.chartCard}>
                  <Text style={styles.chartLabel}>Water Level</Text>
                  <MiniBarChart data={histLevelData} color={meta.accent} yMin={0} yMax={100} formatY={v => `${Math.round(v)}%`} />
                </GlassSurface>
                <GlassSurface style={styles.chartCard}>
                  <Text style={styles.chartLabel}>Temperature</Text>
                  <MiniBarChart data={histTempData} color={colors.warning} formatY={v => `${v.toFixed(1)}°`} />
                </GlassSurface>
                <GlassSurface style={styles.chartCard}>
                  <Text style={styles.chartLabel}>pH</Text>
                  <MiniBarChart data={histPhData} color={colors.teal} yMin={4} yMax={10} formatY={v => v.toFixed(1)} />
                </GlassSurface>
                <GlassSurface style={styles.chartCard}>
                  <Text style={styles.chartLabel}>Dissolved O₂</Text>
                  <MiniBarChart data={histDoData} color={colors.success} yMin={0} yMax={100} formatY={v => `${Math.round(v)}%`} />
                </GlassSurface>
              </View>
            </>
          )}

          {/* Tank-specific Alerts */}
          {tankAlerts.length > 0 && (
            <>
              <SectionHeader
                title={`Tank Alerts · ${tankAlerts.length}`}
                action="All →"
                onAction={() => router.push('/(tabs)/alerts' as any)}
                style={styles.sectionHeader}
              />
              <View style={styles.alertsList}>
                {tankAlerts.map(alert => {
                  const color = severityColor(alert.severity);
                  return (
                    <GlassSurface
                      key={alert._id}
                      style={[styles.alertRow, { borderLeftColor: color, borderLeftWidth: 3 }]}
                    >
                      <Ionicons name={severityIcon(alert.severity)} size={16} color={color} />
                      <Text style={styles.alertTitle} numberOfLines={1}>{alert.title}</Text>
                      <Text style={styles.alertTime}>{timeAgo(alert.createdAt)}</Text>
                    </GlassSurface>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Raise Issue Modal */}
        <Modal visible={showIssueModal} transparent animationType="slide" onRequestClose={() => setShowIssueModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={issueStyles.overlay}>
            <Pressable style={issueStyles.backdrop} onPress={() => setShowIssueModal(false)} />
            <View style={issueStyles.sheet}>
              <View style={issueStyles.handle} />
              <Text style={issueStyles.title}>Raise an Issue</Text>
              {device && (
                <View style={issueStyles.deviceBadge}>
                  <Ionicons name="hardware-chip-outline" size={13} color={colors.textTertiary} />
                  <Text style={issueStyles.deviceBadgeText}>{device.deviceName} · {device.deviceId}</Text>
                </View>
              )}
              <TextInput
                style={issueStyles.input}
                placeholder="Subject"
                placeholderTextColor={colors.textTertiary}
                value={issueSubject}
                onChangeText={setIssueSubject}
                maxLength={100}
              />
              <TextInput
                style={[issueStyles.input, issueStyles.inputMulti]}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.textTertiary}
                value={issueDesc}
                onChangeText={setIssueDesc}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Pressable
                style={[issueStyles.submitBtn, issueSubmitting && issueStyles.submitBtnDisabled]}
                onPress={handleSubmitIssue}
                disabled={issueSubmitting}
              >
                {issueSubmitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={issueStyles.submitText}>Submit Issue</Text>
                }
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const issueStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#0a1628',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: 'center', marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  deviceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  deviceBadgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  inputMulti: { height: 100, paddingTop: spacing.sm },
  submitBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.base,
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.base, color: colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  heroWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
  },
  heroPct: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.display,
    lineHeight: typography.size.display * 1.1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroVol: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  orbsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  healthRow: { flexDirection: 'row', padding: spacing.md, marginBottom: spacing.sm },
  healthCol: { flex: 1, alignItems: 'center', gap: 4 },
  healthColBorder: { borderLeftWidth: 1, borderLeftColor: colors.glassBorder },
  healthValue: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.xl },
  healthLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, textAlign: 'center' },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { minWidth: '46%', flex: 1 },
  deviceCard: { padding: spacing.md, gap: spacing.sm },
  deviceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  deviceName: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.textPrimary },
  deviceId: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 2 },
  deviceStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statChipText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary },
  noDeviceCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  noDeviceText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.textSecondary },
  noDeviceSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textTertiary, textAlign: 'center' },
  actionBtns: { gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {},
  infoCard: { overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md, gap: spacing.md },
  infoLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textTertiary },
  infoValue: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.textPrimary, textAlign: 'right', flex: 1 },
  notesValue: { textAlign: 'right', lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.glassBorder, marginHorizontal: spacing.md },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chartCard: { minWidth: '46%', flex: 1, padding: spacing.md, gap: 4 },
  chartLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  alertsList: { gap: spacing.sm },
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg },
  alertTitle: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.textPrimary, flex: 1 },
  alertTime: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, flexShrink: 0 },
});
