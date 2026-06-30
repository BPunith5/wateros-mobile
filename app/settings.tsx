import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import FilterPill from '@/src/components/glass/FilterPill';
import MenuRow from '@/src/components/glass/MenuRow';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

const SETTINGS_KEY = 'waterOS_settings';

type Settings = {
  pushEnabled: boolean;
  criticalOnly: boolean;
  emailReports: boolean;
  soundEffects: boolean;
  units: 'metric' | 'imperial';
};

const DEFAULT_SETTINGS: Settings = {
  pushEnabled: true,
  criticalOnly: false,
  emailReports: true,
  soundEffects: true,
  units: 'metric',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const storeGet = (k: string): Promise<string | null> =>
    Platform.OS === 'web'
      ? Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null)
      : SecureStore.getItemAsync(k);

  const storeSet = (k: string, v: string): Promise<void> =>
    Platform.OS === 'web'
      ? (typeof localStorage !== 'undefined' && localStorage.setItem(k, v), Promise.resolve())
      : SecureStore.setItemAsync(k, v);

  useEffect(() => {
    storeGet(SETTINGS_KEY)
      .then(raw => {
        if (raw) {
          try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await storeSet(SETTINGS_KEY, JSON.stringify(next));
    } catch {}
  }

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Notifications */}
          <Text style={styles.sectionLabel}>Notifications</Text>
          <GlassSurface style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.switchLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={settings.pushEnabled}
                onValueChange={v => updateSetting('pushEnabled', v)}
                trackColor={{ false: colors.glassBorder, true: `${colors.cyan}88` }}
                thumbColor={settings.pushEnabled ? colors.cyan : colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.switchLabel}>Critical Alerts Only</Text>
              </View>
              <Switch
                value={settings.criticalOnly}
                onValueChange={v => updateSetting('criticalOnly', v)}
                trackColor={{ false: colors.glassBorder, true: `${colors.cyan}88` }}
                thumbColor={settings.criticalOnly ? colors.cyan : colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.switchLabel}>Weekly Email Reports</Text>
              </View>
              <Switch
                value={settings.emailReports}
                onValueChange={v => updateSetting('emailReports', v)}
                trackColor={{ false: colors.glassBorder, true: `${colors.cyan}88` }}
                thumbColor={settings.emailReports ? colors.cyan : colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons name="volume-medium-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.switchLabel}>Sound Effects</Text>
              </View>
              <Switch
                value={settings.soundEffects}
                onValueChange={v => updateSetting('soundEffects', v)}
                trackColor={{ false: colors.glassBorder, true: `${colors.cyan}88` }}
                thumbColor={settings.soundEffects ? colors.cyan : colors.textTertiary}
              />
            </View>
          </GlassSurface>

          {/* Preferences */}
          <Text style={styles.sectionLabel}>Preferences</Text>
          <GlassSurface style={styles.card}>
            <View style={styles.prefRow}>
              <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.switchLabel}>Units</Text>
              <View style={styles.pillGroup}>
                <FilterPill
                  label="Metric"
                  active={settings.units === 'metric'}
                  onPress={() => updateSetting('units', 'metric')}
                />
                <FilterPill
                  label="Imperial"
                  active={settings.units === 'imperial'}
                  onPress={() => updateSetting('units', 'imperial')}
                />
              </View>
            </View>
            <View style={styles.divider} />
            <MenuRow icon="moon-outline" label="Theme" value="Dark Ocean" />
            <View style={styles.divider} />
            <MenuRow icon="language-outline" label="Language" value="English" />
          </GlassSurface>

          {/* Data & Privacy */}
          <Text style={styles.sectionLabel}>Data & Privacy</Text>
          <GlassSurface style={styles.card}>
            <MenuRow icon="download-outline" label="Export Data" showChevron onPress={() => {}} />
            <View style={styles.divider} />
            <MenuRow icon="shield-checkmark-outline" label="Privacy Policy" showChevron onPress={() => {}} />
          </GlassSurface>

          {/* About */}
          <Text style={styles.sectionLabel}>About</Text>
          <GlassSurface style={styles.card}>
            <MenuRow icon="information-circle-outline" label="App Version" value="1.0.0" />
            <View style={styles.divider} />
            <MenuRow icon="document-text-outline" label="Terms of Service" showChevron onPress={() => {}} />
          </GlassSurface>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
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
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    marginLeft: 4,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginHorizontal: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  switchLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
});
