import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getCached, setCached } from '@/src/lib/cache';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import SectionHeader from '@/src/components/glass/SectionHeader';
import IconButton from '@/src/components/glass/IconButton';
import Reveal from '@/src/components/glass/Reveal';
import WaterVessel from '@/src/components/water/WaterVessel';
import MetricOrbCard from '@/src/components/water/MetricOrbCard';
import TankPreviewCard from '@/src/components/water/TankPreviewCard';
import AlertCard from '@/src/components/alerts/AlertCard';
import { useAuth } from '@/src/context/AuthContext';
import {
  tanksApi, alertsApi, devicesApi, telemetryApi,
  TankRecord, AlertRecord, DeviceRecord, TelemetryRecord,
} from '@/src/lib/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { useMqttTelemetry } from '@/src/hooks/useMqttTelemetry';

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

function avg(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((s, v) => s + v, 0) / vals.length;
}

interface TankData {
  tank: TankRecord;
  telemetry: TelemetryRecord | null;
  device: DeviceRecord | null;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [tankData, setTankData] = useState<TankData[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const cached = getCached<TankData[]>('dashboard');
    if (cached) { setTankData(cached); setLoading(false); }

    try {
      const [tanks, alts, devs] = await Promise.all([
        tanksApi.list(),
        alertsApi.list(),
        devicesApi.list(),
      ]);
      setAlerts(alts);
      setDevices(devs);

      const combined: TankData[] = await Promise.all(
        tanks.map(async (tank) => {
          const device = devs.find(d => d.tankId === tank._id && d.status === 'active') ?? null;
          let telemetry: TelemetryRecord | null = null;
          if (device) {
            try {
              const logs = await telemetryApi.logs(device.deviceId, 1);
              telemetry = logs[0] ?? null;
            } catch { /* silent */ }
          }
          return { tank, telemetry, device };
        })
      );
      setCached('dashboard', combined);
      setTankData(combined);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── MQTT live telemetry ──
  const deviceIds = devices.map(d => d.deviceId);
  const { telemetry: mqttTelemetry, connected: mqttConnected } = useMqttTelemetry(deviceIds);

  const mqttPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!mqttConnected) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(mqttPulse, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(mqttPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => mqttPulse.stopAnimation();
  }, [mqttConnected]);

  useEffect(() => {
    if (!Object.keys(mqttTelemetry).length) return;
    setTankData(prev => prev.map(td => {
      if (!td.device) return td;
      const live = mqttTelemetry[td.device.deviceId];
      if (!live) return td;
      return {
        ...td,
        telemetry: {
          ...(td.telemetry ?? {} as any),
          waterLevel: live.waterLevel ?? td.telemetry?.waterLevel ?? 0,
          ph: live.ph ?? td.telemetry?.ph ?? 0,
          temperature: live.temperature ?? td.telemetry?.temperature ?? 0,
          battery: live.battery ?? td.telemetry?.battery ?? 0,
          signal: live.signal ?? td.telemetry?.signal ?? 0,
          dissolvedOxygen: td.telemetry?.dissolvedOxygen ?? 0,
          turbidity: td.telemetry?.turbidity ?? 0,
          timestamp: live.ts.toISOString(),
        },
      };
    }));
  }, [mqttTelemetry]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const unreadAlerts = alerts.filter(a => !a.read);
  const activeDevices = devices.filter(d => d.status === 'active');

  const telemetryList = tankData.map(d => d.telemetry).filter(Boolean) as TelemetryRecord[];
  const avgLevel = avg(telemetryList.map(t => t.waterLevel));
  const avgDO = avg(telemetryList.map(t => t.dissolvedOxygen));
  const avgPh = avg(telemetryList.map(t => t.ph));
  const avgTemp = avg(telemetryList.map(t => t.temperature));
  const avgTurbidity = avg(telemetryList.map(t => t.turbidity));
  const avgHealth = avg(activeDevices.map(d => d.healthScore / 100));

  const tabBarH = Platform.OS === 'ios' ? 100 : 80;

  return (
    <View style={s.root}>
      <OceanBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarH + spacing.lg }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
        >
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>{getGreeting()}</Text>
              <Text style={s.userName}>{firstName} 👋</Text>
            </View>
            <View style={s.headerActions}>
              {/* MQTT live badge */}
              <View style={[s.mqttBadge, mqttConnected && s.mqttBadgeLive]}>
                <Animated.View style={[s.mqttDot, mqttConnected && s.mqttDotLive, { transform: [{ scale: mqttConnected ? mqttPulse : 1 }] }]} />
                <Text style={[s.mqttText, mqttConnected && s.mqttTextLive]}>
                  {mqttConnected ? 'LIVE' : 'MQTT'}
                </Text>
              </View>
              <IconButton
                icon="notifications-outline"
                badge={unreadAlerts.length}
                onPress={() => router.push('/(tabs)/alerts' as any)}
              />
              <IconButton icon="person" onPress={() => router.push('/(tabs)/profile' as any)} />
            </View>
          </View>

          {/* Hero overview */}
          <Reveal index={0}>
            <GlassSurface style={s.hero}>
              <WaterVessel
                width={88}
                height={172}
                percentage={avgLevel}
                color={colors.cyan}
                showBubbles={activeDevices.length > 0}
              />
              <View style={s.heroInfo}>
                <Text style={s.heroLabel}>Fleet Overview</Text>
                <Text style={s.heroValue}>{Math.round(avgLevel * 100)}%</Text>
                <Text style={s.heroSub}>average water level</Text>

                <View style={s.heroStatsRow}>
                  <View style={s.heroStat}>
                    <Text style={s.heroStatValue}>{activeDevices.length}/{tankData.length}</Text>
                    <Text style={s.heroStatLabel}>Online Tanks</Text>
                  </View>
                  <View style={s.heroStatDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroStatValue}>{Math.round(avgHealth * 100)}%</Text>
                    <Text style={s.heroStatLabel}>Fleet Health</Text>
                  </View>
                </View>
              </View>
            </GlassSurface>
          </Reveal>

          {/* Live Metrics */}
          {telemetryList.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Live Metrics" />
              <View style={s.metricsGrid}>
                <Reveal index={1} style={s.metricItem}>
                  <MetricOrbCard
                    icon="water-outline"
                    label="Water Level"
                    value={`${Math.round(avgLevel * 100)}`}
                    unit="%"
                    percentage={avgLevel}
                    color={colors.cyan}
                  />
                </Reveal>
                <Reveal index={2} style={s.metricItem}>
                  <MetricOrbCard
                    icon="leaf-outline"
                    label="Dissolved O₂"
                    value={`${Math.round(avgDO * 100)}`}
                    unit="%"
                    percentage={avgDO}
                    color={colors.success}
                  />
                </Reveal>
                <Reveal index={3} style={s.metricItem}>
                  <MetricOrbCard
                    icon="flask-outline"
                    label="pH Level"
                    value={avgPh.toFixed(1)}
                    percentage={avgPh / 14}
                    color={colors.seafoam}
                  />
                </Reveal>
                <Reveal index={4} style={s.metricItem}>
                  <MetricOrbCard
                    icon="thermometer-outline"
                    label="Temperature"
                    value={avgTemp.toFixed(1)}
                    unit="°C"
                    percentage={avgTemp / 40}
                    color={colors.warning}
                  />
                </Reveal>
                <Reveal index={5} style={s.metricItem}>
                  <MetricOrbCard
                    icon="eye-outline"
                    label="Turbidity"
                    value={avgTurbidity.toFixed(1)}
                    unit="NTU"
                    percentage={Math.min(1, avgTurbidity / 10)}
                    color={colors.electricBlue}
                  />
                </Reveal>
                <Reveal index={6} style={s.metricItem}>
                  <MetricOrbCard
                    icon="pulse-outline"
                    label="Device Health"
                    value={`${Math.round(avgHealth * 100)}`}
                    unit="%"
                    percentage={avgHealth}
                    color={colors.aqua}
                  />
                </Reveal>
              </View>
            </View>
          )}

          {/* Your Tanks */}
          {tankData.length > 0 && (
            <Reveal index={7}>
              <View style={s.section}>
                <SectionHeader
                  title="Your Tanks"
                  action="See all"
                  onAction={() => router.push('/(tabs)/tanks' as any)}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.tanksRow}
                >
                  {tankData.slice(0, 5).map(({ tank, telemetry, device }) => (
                    <TankPreviewCard
                      key={tank._id}
                      tank={tank}
                      telemetry={telemetry}
                      device={device}
                      onPress={() => router.push(`/tank/${tank._id}` as any)}
                    />
                  ))}
                </ScrollView>
              </View>
            </Reveal>
          )}

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <Reveal index={8}>
              <View style={s.section}>
                <SectionHeader
                  title="Recent Alerts"
                  action="See all"
                  onAction={() => router.push('/(tabs)/alerts' as any)}
                />
                <View style={{ gap: spacing.md }}>
                  {alerts.slice(0, 2).map(alert => (
                    <AlertCard
                      key={alert._id}
                      alert={alert}
                      onPress={() => router.push('/(tabs)/alerts' as any)}
                    />
                  ))}
                </View>
              </View>
            </Reveal>
          )}

          {/* Empty state */}
          {!loading && tankData.length === 0 && (
            <Reveal index={0}>
              <GlassSurface style={s.emptyCard}>
                <Text style={s.emptyTitle}>No tanks yet</Text>
                <Text style={s.emptySub}>Add a device to start monitoring your first tank.</Text>
              </GlassSurface>
            </Reveal>
          )}
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
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textSecondary,
  },
  userName: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mqttBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  mqttBadgeLive: {
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderColor: 'rgba(34,211,238,0.35)',
  },
  mqttDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  mqttDotLive: {
    backgroundColor: '#22D3EE',
  },
  mqttText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
  mqttTextLive: {
    color: '#22D3EE',
  },
  hero: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  heroLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  heroValue: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    marginTop: 4,
  },
  heroSub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroStat: {
    gap: 2,
  },
  heroStatValue: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  heroStatLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glassBorder,
  },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricItem: {
    width: '47%',
  },
  tanksRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.lg,
    color: colors.textSecondary,
  },
  emptySub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
