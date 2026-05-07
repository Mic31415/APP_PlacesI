import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: true,
};

export type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError'
  | 'rigid'
  | 'soft';

const mapHapticForPlatform = (type: HapticType): HapticType => {
  if (Platform.OS !== 'android') {
    return type;
  }

  if (type === 'selection' || type === 'impactLight') {
    return 'impactMedium';
  }

  return type;
};

export const triggerHaptic = (type: HapticType = 'selection') => {
  try {
    ReactNativeHapticFeedback.trigger(mapHapticForPlatform(type), options);
  } catch (error) {
    console.warn('Haptic feedback error:', error);
  }
};

export const haptics = {
  selection: () => triggerHaptic('selection'),
  impactLight: () => triggerHaptic('impactLight'),
  impactMedium: () => triggerHaptic('impactMedium'),
  impactHeavy: () => triggerHaptic('impactHeavy'),
  success: () => triggerHaptic('notificationSuccess'),
  warning: () => triggerHaptic('notificationWarning'),
  error: () => triggerHaptic('notificationError'),
};
