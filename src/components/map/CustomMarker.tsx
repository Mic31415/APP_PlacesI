import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, MapMarkerProps } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';

interface CustomMarkerProps extends Omit<MapMarkerProps, 'coordinate'> {
    coordinate: { latitude: number; longitude: number };
    emoji: string;
    onPress?: () => void;
    selected?: boolean;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({
    coordinate,
    emoji,
    onPress,
    selected = false,
    ...props
}) => {
    const { theme } = useTheme();

    return (
        <Marker coordinate={coordinate} onPress={onPress} {...props}>
            <View
                style={[
                    styles.container,
                    selected && {
                        transform: [{ scale: 1.2 }],
                        shadowOpacity: 0.3,
                    },
                ]}
            >
                <Text style={styles.emoji}>{emoji}</Text>
                {selected && <View style={styles.arrow} />}
            </View>
        </Marker>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 32,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    arrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#FFFFFF', // Or primary color
        transform: [{ rotate: '180deg' }],
        marginTop: -4,
    },
});
