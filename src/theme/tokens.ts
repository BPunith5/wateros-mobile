export const colors = {
  abyss: '#01040F',
  deepNavy: '#03142E',
  oceanBlue: '#06294D',
  midOcean: '#0A3D62',
  surfaceBlue: '#0F5E8C',
  aqua: '#4DE8E6',
  cyan: '#22D3EE',
  teal: '#2DD4BF',
  seafoam: '#5EEAD4',
  electricBlue: '#3B82F6',
  success: '#34D8A6',
  warning: '#FBBF24',
  danger: '#FB7185',
  info: '#60A5FA',
  textPrimary: '#F4FBFF',
  textSecondary: 'rgba(244,251,255,0.68)',
  textTertiary: 'rgba(244,251,255,0.42)',
  textInverse: '#03142E',
  glassFill: 'rgba(255,255,255,0.08)',
  glassFillStrong: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.18)',
  glassBorderBright: 'rgba(255,255,255,0.35)',
  glassHighlight: 'rgba(255,255,255,0.5)',
};

export const radius = {
  xs: 8,
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: {
    heading: 'Outfit_600SemiBold',
    headingBold: 'Outfit_700Bold',
    headingMedium: 'Outfit_500Medium',
    headingLight: 'Outfit_300Light',
    body: 'Manrope_400Regular',
    bodyMedium: 'Manrope_500Medium',
    bodySemiBold: 'Manrope_600SemiBold',
    bodyBold: 'Manrope_700Bold',
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
    hero: 48,
  },
};

export const gradients = {
  ocean: ['#01040F', '#03142E', '#0A3D62'] as const,
  oceanDeep: ['#000308', '#01142B', '#06294D'] as const,
  glassPanel: ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)'] as const,
  aquaGlow: ['#4DE8E6', '#22D3EE', '#3B82F6'] as const,
  tealGlow: ['#5EEAD4', '#2DD4BF', '#0F5E8C'] as const,
  warmGlow: ['#FFE29F', '#FBBF24', '#FB923C'] as const,
  dangerGlow: ['#FFB3B3', '#FB7185', '#E11D48'] as const,
  drinking: ['#7FE9FF', '#22D3EE', '#0F5E8C'] as const,
  aquaculture: ['#9CFFD9', '#34D8A6', '#0A3D62'] as const,
  industrial: ['#C9D6FF', '#7C8FE8', '#3D2E8C'] as const,
  irrigation: ['#D6FFB3', '#A3E635', '#1F7A4D'] as const,
};

export const shadows = {
  glow: (color: string, opacity = 0.45) => ({
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  }),
  soft: {
    shadowColor: '#000814',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  } as const,
};

export const tankTypeMeta: Record<string, { label: string; accent: string; gradient: readonly string[]; icon: string }> = {
  drinking: {
    label: 'Drinking Water',
    accent: colors.cyan,
    gradient: gradients.drinking,
    icon: 'water-outline',
  },
  aquaculture: {
    label: 'Aquaculture',
    accent: colors.success,
    gradient: gradients.aquaculture,
    icon: 'fish-outline',
  },
  industrial: {
    label: 'Industrial',
    accent: '#7C8FE8',
    gradient: gradients.industrial,
    icon: 'cog-outline',
  },
  irrigation: {
    label: 'Irrigation',
    accent: '#A3E635',
    gradient: gradients.irrigation,
    icon: 'leaf-outline',
  },
};
