declare module 'react-native-vector-icons/MaterialCommunityIcons' {
    import { IconProps } from 'react-native-vector-icons/Icon';
    import { Component } from 'react';
    export default class MaterialCommunityIcons extends Component<IconProps> { }
}

declare module '*.png';

declare module 'react-native-haptic-feedback' {
    export interface HapticOptions {
        enableVibrateFallback?: boolean;
        ignoreAndroidSystemSettings?: boolean;
    }

    export function trigger(method: string, options?: HapticOptions): void;

    const ReactNativeHapticFeedback: {
        trigger: typeof trigger;
    };

    export default ReactNativeHapticFeedback;
}
