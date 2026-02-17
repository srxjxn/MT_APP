import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const LAYOUT = {
  window: { width, height },
  contentPadding: 16,
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  buttonHeight: 48,
} as const;
