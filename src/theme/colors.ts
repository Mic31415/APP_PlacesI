export const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  
  background: {
    light: '#FFFFFF',
    dark: '#000000',
  },
  
  surface: {
    light: '#F2F2F7',
    dark: '#1C1C1E',
  },
  
  card: {
    light: '#FFFFFF',
    dark: '#2C2C2E',
  },
  
  text: {
    primary: {
      light: '#000000',
      dark: '#FFFFFF',
    },
    secondary: {
      light: '#3C3C43',
      dark: '#EBEBF5',
    },
    tertiary: {
      light: '#8E8E93',
      dark: '#8E8E93',
    },
  },
  
  border: {
    light: '#C6C6C8',
    dark: '#38383A',
  },
  
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  
  // Transparent overlays
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(255, 255, 255, 0.3)',
  },
};

export type ColorScheme = 'light' | 'dark';
