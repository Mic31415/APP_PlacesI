export const colors = {
  primary: '#2F80ED', // Brand Blue
  secondary: '#E9C46A', // Warm Sand
  accent: '#264653', // Dark Charcoal Blue

  background: {
    light: '#FFFFFF',
    dark: '#0F0F0F',
  },

  surface: {
    light: '#F6F6F6',
    dark: '#1C1C1E',
  },

  innerSurface: {
    light: '#FFFFFF',
    dark: '#29292b',
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
      light: '#B4BAC5',
      dark: '#B4BAC5',
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

  // Unified accent for star ratings — reads against both light and dark
  // surfaces. Use this everywhere a filled star is shown so colors stay
  // consistent between the Pin Detail Modal, Global Search, and any
  // future surface that renders a rating.
  star: '#FFC93C',

  // Premium upsell card. Needs to be readable in both color schemes —
  // the previous hardcoded light blue + black combo became unreadable
  // in dark mode.
  premiumCard: {
    background: {
      light: '#c1cee1ff',
      dark: '#2A3A55',
    },
    text: {
      light: '#000000',
      dark: '#FFFFFF',
    },
    subtext: {
      light: '#3C3C43',
      dark: '#C7CDDB',
    },
  },

  // Transparent overlays
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(255, 255, 255, 0.3)',
  },

  // Single backdrop tone used behind modal sheets in BOTH themes.
  // It intentionally does NOT flip on dark mode — a dark dim behind a
  // lifted sheet is correct regardless of theme. Consolidates the
  // `rgba(0,0,0,0.5)` literal that was repeated across five modals.
  backdrop: 'rgba(0,0,0,0.5)',

  // Drag handle on bottom sheets. Replaces the hardcoded `#E0E0E0`
  // that several sheets defaulted to, which became almost invisible
  // on the dark card background.
  handle: {
    light: '#E0E0E0',
    dark: '#48484A',
  },
};

export type ColorScheme = 'light' | 'dark';
