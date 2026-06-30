import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import GlassInput from '@/src/components/glass/GlassInput';
import LiquidButton from '@/src/components/glass/LiquidButton';
import FilterPill from '@/src/components/glass/FilterPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import { adminApi, DeviceRecord } from '@/src/lib/api';
import { colors, spacing, typography } from '@/src/theme/tokens';

export default function PushScreen() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);

  const [waterLevel, setWaterLevel] = useState('');
  const [temperature, setTemperature] = useState('');
  const [ph, setPh] = useState('');

  const loadDevices = useCallback(async () => {
    try {
      const data = await adminApi.myDevices();
      setDevices(data);
      if (data.length > 0) setSelectedId(data[0]._id);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, []);

  const handlePush = async () => {
    if (!selectedId) {
      Alert.alert('Error', 'Please select a device.');
      return;
    }
    const wl = parseFloat(waterLevel);
    const temp = parseFloat(temperature);
    const phVal = parseFloat(ph);

    if (isNaN(wl) || wl < 0 || wl > 100) {
      Alert.alert('Error', 'Water level must be between 0 and 100%.');
      return;
    }

    setPushing(true);
    try {
      await adminApi.pushReading(selectedId, {
        waterLevel: wl,
        temperature: isNaN(temp) ? undefined : temp,
        ph: isNaN(phVal) ? undefined : phVal,
      } as any);
      Alert.alert('Success', 'Reading pushed successfully!');
      setWaterLevel('');
      setTemperature('');
      setPh('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to push reading.');
    } finally {
      setPushing(false);
    }
  };

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionHeader title="Push Reading" style={styles.sectionHeader} />

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.teal} />
            </View>
          ) : (
            <>
              {/* Device selector */}
              <Text style={styles.label}>Select Device</Text>
              <View style={styles.pillsRow}>
                {devices.map(d => (
                  <FilterPill
                    key={d._id}
                    label={d.deviceName}
                    active={selectedId === d._id}
                    onPress={() => setSelectedId(d._id)}
                  />
                ))}
                {devices.length === 0 && (
                  <Text style={styles.noDevices}>No devices assigned</Text>
                )}
              </View>

              <GlassSurface style={styles.form}>
                <GlassInput
                  label="Water Level (%)"
                  icon="water-outline"
                  value={waterLevel}
                  onChangeText={setWaterLevel}
                  keyboardType="decimal-pad"
                  placeholder="0 – 100"
                />
                <GlassInput
                  label="Temperature (°C)"
                  icon="thermometer-outline"
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 24.5"
                />
                <GlassInput
                  label="pH"
                  icon="flask-outline"
                  value={ph}
                  onChangeText={setPh}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 7.2"
                />
              </GlassSurface>

              <LiquidButton
                label="Push Reading"
                onPress={handlePush}
                loading={pushing}
                fullWidth
                icon="cloud-upload-outline"
                style={styles.pushBtn}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.md },
  loader: { padding: spacing.xl, alignItems: 'center' },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  noDevices: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
  },
  form: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pushBtn: {},
});
