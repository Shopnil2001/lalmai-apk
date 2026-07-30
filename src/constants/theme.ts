import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Backgrounds
    background: '#FAFAFA',      // Creamy clean background
    surface: '#FFFFFF',         // Card/elevated surfaces
    surfaceDarker: '#F1F5F9',   // Light gray surfaces (border/separators)
    
    // Brand Colors
    primary: '#1E293B',         // Deep Navy/Slate (extremely professional)
    primaryLight: '#475569',    // Light Slate
    accent: '#4F46E5',          // Royal Indigo (for active states/highlights)
    accentLight: '#EEF2FF',     // Light indigo background tint
    
    // Status Colors
    success: '#10B981',         // Emerald Green
    successLight: '#ECFDF5',
    warning: '#D97706',         // Amber Gold
    warningLight: '#FEF3C7',
    error: '#EF4444',           // Rose Red
    errorLight: '#FEF2F2',
    info: '#3B82F6',            // Blue Info
    infoLight: '#EFF6FF',
    
    // Typography
    text: '#0F172A',            // Deep slate black
    textSecondary: '#64748B',   // Soft slate gray
    textLight: '#94A3B8',       // Light gray (disabled/placeholder)
    textOnPrimary: '#FFFFFF',   // Text on primary buttons
    textOnAccent: '#FFFFFF',    // Text on accent buttons

    // Borders & Lines
    border: '#E2E8F0',          // Subtle lines
    borderDark: '#CBD5E1',      // Medium lines
    
    // Shadows
    shadow: '#0F172A',
  },
  dark: {
    // Simple dark mode fallback (though light theme is primary)
    background: '#0F172A',
    surface: '#1E293B',
    surfaceDarker: '#0F172A',
    primary: '#FFFFFF',
    primaryLight: '#E2E8F0',
    accent: '#818CF8',
    accentLight: '#312E81',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    error: '#F87171',
    errorLight: '#7F1D1D',
    info: '#60A5FA',
    infoLight: '#1E3A8A',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textLight: '#475569',
    textOnPrimary: '#0F172A',
    textOnAccent: '#FFFFFF',
    border: '#334155',
    borderDark: '#475569',
    shadow: '#000000',
  }
} as const;

export const Gradients = {
  primary: ['#1E293B', '#0F172A'],
  accent: ['#4F46E5', '#7C3AED'],
  success: ['#10B981', '#059669'],
  card: ['#FFFFFF', '#F8FAFC'],
} as const;

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  }
};

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};
