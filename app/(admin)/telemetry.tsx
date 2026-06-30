import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Platform, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import FilterPill from '@/src/components/glass/FilterPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import { adminApi, telemetryApi, DeviceRecord, TelemetryRecord } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function TelemetryScreen() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [logs, setLogs] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const data = await adminApi.myDevices();
      setDevices(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0]._id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadLogs = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    setLogsLoading(true);
    try {
      const data = await adminApi.telemetry(deviceId);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, []);
  useEffect(() => { if (selectedId) loadLogs(selectedId); }, [selectedId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs(selectedId);
  };

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderLog = ({ item }: { item: TelemetryRecord }) => (
    <GlassSurface style={styles.logCard}>
      <View style={styles.logHeader}>
        <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
        <Text style={styles.logTime}>{formatDate(item.timestamp)}</Text>
      </View>
      <View style={styles.logGrid}>
        <View style={styles.logCell}>
          <Text style={styles.cellLabel}>Water Level</Text>
          <Text style={styles.cellValue}>{item.waterLevel.toFixed(1)}%</Text>
        </View>
        <View style={styles.logCell}>
          <Text style={styles.cellLabel}>Temperature</Text>
          <Text style={styles.cellValue}>{item.temperature.toFixed(1)}°C</Text>
        </View>
        <View style={styles.logCell}>
          <Text style={styles.cellLabel}>pH</Text>
          <Text style={styles.cellValue}>{item.ph.toFixed(2)}</Text>
        </View>
        <View style={styles.logCell}>
          <Text style={styles.cellLabel}>Dissolved O₂</Text>
          <Text style={styles.cellValue}>{item.dissolvedOxygen.toFixed(1)}%</Text>
        </View>
        <View style={styles.logCell}>
          <Text style={styles.cellLabel}>Turbidity</Text>
          <Text style={styles.cellValue}>{item.turbidity.toFixed(0)} NTU</Text>
        </View>
        <View style={styles.logCell}>
          <Text style={styles.cellLabel}>Battery</Text>
          <Text style={styles.cellValue}>{item.battery}%</Text>
        </View>
      </View>
    </GlassSurface>
  );

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={logs}
          keyExtractor={item => item._id}
          renderItem={renderLog}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          ListHeaderComponent={
            <View>
              <SectionHeader title="Telemetry" style={styles.sectionHeader} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.devicePills}>
                {devices.map(d => (
                  <FilterPill
                    key={d._id}
                    label={d.deviceName}
                    active={selectedId === d._id}
                    onPress={() => setSelectedId(d._id)}
                  />
                ))}
                {devices.length === 0 && !loading && (
                  <Text style={styles.noDevices}>No devices</Text>
                )}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            !logsLoading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="pulse-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No telemetry data</Text>
              </GlassSurface>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Text style={styles.emptyText}>Loading...</Text>
              </GlassSurface>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.sm },
  devicePills: { flexGrow: 0, marginBottom: spacing.md },
  logCard: { padding: spacing.md, gap: spacing.sm },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  logTime: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  logGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  logCell: {
    width: '30%',
    minWidth: 90,
    flex: 1,
  },
  cellLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  cellValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textSecondary,
  },
  noDevices: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
  },
});
