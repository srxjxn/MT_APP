import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#FFC107',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#D32F2F',
  errorLight: '#FFCDD2',
  success: '#2E7D32',
  successLight: '#C8E6C9',
  warning: '#F57F17',
  warningLight: '#FFF9C4',
  info: '#1976D2',
  infoLight: '#BBDEFB',
  text: '#212121',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  border: '#E0E0E0',
  divider: '#EEEEEE',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const TOUCH_TARGET = 48;

export const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryLight,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onBackground: COLORS.textPrimary,
    onSurface: COLORS.textPrimary,
    outline: COLORS.border,
  },
};
