import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LiquidGauge from '@/src/components/water/LiquidGauge';
import WaterVessel from '@/src/components/water/WaterVessel';
import StatusPill from '@/src/components/glass/StatusPill';
import FloatingBadge from '@/src/components/glass/FloatingBadge';
import PulseRing from '@/src/components/water/PulseRing';
import { colors, gradients, radius, typography } from '@/src/theme/tokens';

// ── Monitor Illustration ─────────────────────────────────────────────────────

function MiniBar({ height, color }: { height: number; color: string }) {
  return (
    <View style={{ width: 10, height: 40, justifyContent: 'flex-end', marginHorizontal: 2 }}>
      <LinearGradient
        colors={[color + '40', color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ height, borderRadius: 3 }}
      />
    </View>
  );
}

export function MonitorIllustration() {
  return (
    <View style={styles.illustrationRoot}>
      <LiquidGauge
        size={200}
        percentage={0.74}
        color={colors.cyan}
        label="Tank Level"
        value="74"
        unit="%"
        icon={<Ionicons name="water-outline" size={28} color={colors.cyan} />}
      />
      <FloatingBadge
        icon="checkmark-circle"
        label="All Systems Normal"
        color={colors.success}
        style={{ top: 10, right: -20 }}
        delay={0}
      />
      <FloatingBadge
        icon="thermometer-outline"
        label="24.3°C"
        color={colors.warning}
        style={{ bottom: 20, left: -30 }}
        delay={400}
      />
    </View>
  );
}

// ── Analytics Illustration ───────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

export function AnalyticsIllustration() {
  const bars = [0.4, 0.7, 0.5, 0.85, 0.6, 0.9, 0.75];
  const barColors = [colors.cyan, colors.seafoam, colors.cyan, colors.teal, colors.cyan, colors.seafoam, colors.cyan];

  return (
    <View style={styles.illustrationRoot}>
      <FloatingBadge
        icon="trending-up"
        label="+12% this week"
        color={colors.success}
        style={{ top: 0, right: -10 }}
        delay={200}
      />
      <View style={styles.analyticsGrid}>
        <StatChip label="Avg Level" value="72%" color={colors.cyan} />
        <StatChip label="Alerts" value="3" color={colors.warning} />
        <StatChip label="Tanks" value="8" color={colors.seafoam} />
        <StatChip label="Online" value="100%" color={colors.success} />
      </View>
      <View style={styles.barRow}>
        {bars.map((h, i) => (
          <MiniBar key={i} height={h * 40} color={barColors[i % barColors.length]} />
        ))}
      </View>
    </View>
  );
}

// ── Alerts Illustration ──────────────────────────────────────────────────────

export function AlertsIllustration() {
  return (
    <View style={styles.illustrationRoot}>
      <View style={styles.alertCenter}>
        <PulseRing size={110} color={colors.danger} delay={0} duration={1800} />
        <PulseRing size={110} color={colors.danger} delay={700} duration={1800} />
        <WaterVessel
          percentage={0.23}
          color={colors.danger}
          width={64}
          height={120}
        />
      </View>
      <View style={{ marginTop: 16 }}>
        <StatusPill label="Critical" color={colors.danger} />
      </View>
      <FloatingBadge
        icon="warning-outline"
        label="Low water level"
        color={colors.danger}
        style={{ top: 8, right: -24 }}
        delay={600}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  illustrationRoot: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
    width: 240,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    width: 108,
  },
  chipValue: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  chipLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 44,
  },
  alertCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 120,
    height: 140,
  },
});
