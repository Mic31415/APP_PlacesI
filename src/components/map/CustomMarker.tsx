import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, MapMarkerProps } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { moderateScale } from '../../utils/responsive';

interface CustomMarkerProps extends Omit<MapMarkerProps, 'coordinate'> {
    coordinate: { latitude: number; longitude: number };
    emoji: string;
    onPress?: () => void;
    selected?: boolean;
    // 'wishlist' ("Want to go") pins are drawn inside a dashed ring so they
    // read as "not yet visited" at a glance. Defaults to a plain visited marker.
    status?: 'visited' | 'wishlist';
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({
    coordinate,
    emoji,
    onPress,
    selected = false,
    status = 'visited',
    ...props
}) => {
    const { theme, colorScheme } = useTheme();
    const isWishlist = status === 'wishlist';

    // react-native-maps caches a marker's rendered view. When the appearance
    // changes (emoji/status/selection) we briefly re-enable view tracking so the
    // native side re-captures the new look, then turn it off again for perf.
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    useEffect(() => {
        setTracksViewChanges(true);
        const t = setTimeout(() => setTracksViewChanges(false), 600);
        return () => clearTimeout(t);
    }, [emoji, status, selected]);

    return (
        <Marker
            coordinate={coordinate}
            onPress={onPress}
            tracksViewChanges={tracksViewChanges}
            {...props}
        >
            <View
                style={[
                    styles.container,
                    selected && {
                        transform: [{ scale: 1.2 }],
                        shadowOpacity: 0.3,
                    },
                ]}
            >
                <View
                    style={[
                        styles.emojiWrap,
                        isWishlist && {
                            borderWidth: 2,
                            borderStyle: 'dashed',
                            borderColor: theme.colors.primary,
                            backgroundColor: theme.colors.card[colorScheme],
                        },
                    ]}
                >
                    <Text
                        style={[styles.emoji, isWishlist && styles.emojiWishlist]}
                    >
                        {emoji}
                    </Text>
                </View>
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
    emojiWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        padding: 3,
    },
    emoji: {
        fontSize: moderateScale(32),
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    emojiWishlist: {
        // Slightly smaller so the ring sits neatly around the glyph.
        fontSize: moderateScale(24),
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
