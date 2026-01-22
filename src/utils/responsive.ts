import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11/12/13 standard)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Get responsive value based on screen width
 * @param small - Value for small screens (< 376px)
 * @param medium - Value for medium screens (376-414px)
 * @param large - Value for large screens (415-480px)
 * @param tablet - Value for tablets (> 480px)
 */
export const getResponsiveValue = <T,>(
    small: T,
    medium: T,
    large: T,
    tablet: T,
): T => {
    if (SCREEN_WIDTH >= 481) return tablet;
    if (SCREEN_WIDTH >= 415) return large;
    if (SCREEN_WIDTH >= 376) return medium;
    return small;
};

/**
 * Scale font size based on screen width
 */
export const scaleFont = (size: number): number => {
    return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Scale spacing based on screen width
 */
export const scaleSpacing = (size: number): number => {
    return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Scale size based on screen width (for width-based dimensions)
 */
export const scaleWidth = (size: number): number => {
    return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale size based on screen height (for height-based dimensions)
 */
export const scaleHeight = (size: number): number => {
    return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
    const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
    return Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600 && aspectRatio < 1.6;
};

/**
 * Check if device is small screen
 */
export const isSmallScreen = (): boolean => {
    return SCREEN_WIDTH < 376;
};

/**
 * Check if device is large screen
 */
export const isLargeScreen = (): boolean => {
    return SCREEN_WIDTH >= 415;
};

/**
 * Get screen dimensions
 */
export const getScreenDimensions = () => ({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isTablet: isTablet(),
    isSmallScreen: isSmallScreen(),
    isLargeScreen: isLargeScreen(),
});

/**
 * Moderately scale size (less aggressive than scaleWidth)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
    return size + (scaleWidth(size) - size) * factor;
};

/**
 * Platform-specific value
 */
export const platformValue = <T,>(ios: T, android: T): T => {
    return Platform.OS === 'ios' ? ios : android;
};
