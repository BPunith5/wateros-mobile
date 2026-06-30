import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import GlassInput from '@/src/components/glass/GlassInput';
import LiquidButton from '@/src/components/glass/LiquidButton';
import WaterVessel from '@/src/components/water/WaterVessel';
import SectionHeader from '@/src/components/glass/SectionHeader';
import { tanksApi, TankType } from '@/src/lib/api';
import { tankTypeMeta } from '@/src/theme/tokens';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

const TANK_TYPES: TankType[] = ['drinking', 'aquaculture', 'industrial', 'irrigation'];

export default function EditTankScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [tankName, setTankName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [tankType, setTankType] = useState<TankType>('drinking');
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ tankName?: string; capacity?: string }>({});

  const meta = tankTypeMeta[tankType];

  useEffect(() => {
    if (!id) return;
    tanksApi.get(id).then(tank => {
      setTankName(tank.tankName);
      setCapacity(String(tank.capacity));
      setLocation(tank.location ?? '');
      setNotes(tank.description ?? '');
      setTankType(tank.tankType);
    }).catch(() => {
      Alert.alert('Error', 'Could not load tank data.');
      router.back();
    }).finally(() => setFetching(false));
  }, [id]);

  const validate = () => {
    const next: typeof errors = {};
    if (!tankName.trim()) next.tankName = 'Tank name is required';
    const cap = parseFloat(capacity);
    if (!capacity.trim() || isNaN(cap) || cap <= 0) next.capacity = 'Enter a valid capacity in litres';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!id) return;
    setSaving(true);
    try {
      await tanksApi.update(id, {
        tankName: tankName.trim(),
        tankType,
        capacity: parseFloat(capacity),
        location: location.trim() || undefined,
        description: notes.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loader}><ActivityIndicator color={colors.cyan} size="large" /></View>
        </SafeAreaView>
      </View>
    );
  }

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
              <Text style={styles.title}>Edit Tank</Text>
              <View style={styles.backBtn} />
            </View>

            <SectionHeader title="Tank Type" style={styles.sectionHeader} />
            <View style={styles.typeGrid}>
              {TANK_TYPES.map(type => {
                const m = tankTypeMeta[type];
                const isActive = tankType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setTankType(type)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      isActive && { backgroundColor: `${m.accent}18`, borderColor: `${m.accent}88` },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name={m.icon as any} size={22} color={isActive ? m.accent : colors.textTertiary} />
                    <Text style={[styles.typeText, isActive && { color: m.accent }]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionHeader title="Tank Details" style={styles.sectionHeader} />
            <GlassSurface style={styles.card}>
              <GlassInput
                label="Tank Name"
                icon="water-outline"
                value={tankName}
                onChangeText={t => { setTankName(t); if (errors.tankName) setErrors(e => ({ ...e, tankName: undefined })); }}
                placeholder="e.g. Main Storage Tank"
                autoCapitalize="words"
              />
              {errors.tankName ? <Text style={styles.fieldError}>{errors.tankName}</Text> : null}

              <GlassInput
                label="Capacity (Litres)"
                icon="resize-outline"
                value={capacity}
                onChangeText={t => { setCapacity(t); if (errors.capacity) setErrors(e => ({ ...e, capacity: undefined })); }}
                keyboardType="decimal-pad"
                placeholder="e.g. 5000"
              />
              {errors.capacity ? <Text style={styles.fieldError}>{errors.capacity}</Text> : null}

              <GlassInput
                label="Location (optional)"
                icon="location-outline"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Rooftop, Zone A"
                autoCapitalize="words"
              />

              <GlassInput
                label="Description (optional)"
                icon="document-text-outline"
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Supplies drinking water to Block A"
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />
            </GlassSurface>

            <SectionHeader title="Preview" style={styles.sectionHeader} />
            <GlassSurface style={styles.previewCard}>
              <WaterVessel percentage={0.5} color={meta.accent} width={88} height={160} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewSub}>Vessel preview for</Text>
                <Text style={[styles.previewType, { color: meta.accent }]}>{meta.label}</Text>
                <Text style={styles.previewHint}>
                  Live levels will appear once a device is connected to this tank.
                </Text>
              </View>
            </GlassSurface>

            <LiquidButton
              label="Save Changes"
              onPress={handleSave}
              loading={saving}
              fullWidth
              icon="checkmark-circle-outline"
              style={styles.saveBtn}
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
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.xl, color: colors.textPrimary },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  typeCard: {
    flex: 1, minWidth: '45%', padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glassFill,
    alignItems: 'center', gap: 6,
  },
  typeText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.textTertiary, textAlign: 'center' },
  pressed: { opacity: 0.8 },
  card: { padding: spacing.lg, marginBottom: spacing.xs },
  fieldError: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.danger,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  notesInput: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  previewInfo: { flex: 1, gap: 4 },
  previewSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary },
  previewType: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg },
  previewHint: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, lineHeight: 16 },
  saveBtn: { marginTop: spacing.md },
});
