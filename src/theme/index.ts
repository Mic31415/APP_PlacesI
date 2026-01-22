import { colors, ColorScheme } from './colors';
import { spacing, borderRadius, shadows } from './spacing';
import { typography } from './typography';

export interface Theme {
    colors: typeof colors;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    shadows: typeof shadows;
    typography: typeof typography;
    isDark: boolean;
}

export const createTheme = (colorScheme: ColorScheme): Theme => ({
    colors,
    spacing,
    borderRadius,
    shadows,
    typography,
    isDark: colorScheme === 'dark',
});

export { colors, spacing, borderRadius, shadows, typography };
export type { ColorScheme };
