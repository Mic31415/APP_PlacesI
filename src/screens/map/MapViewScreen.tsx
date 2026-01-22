import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Alert } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { CustomMarker } from '../../components/map/CustomMarker';
import { MapSearchBar } from '../../components/map/MapSearchBar';
import { FloatingButton } from '../../components/common/FloatingButton';
import { RootStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Menu } from 'react-native-paper';
import { PinDetailModal } from '../../components/map/PinDetailModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { BottomSheetModal } from '@gorhom/bottom-sheet'; // Unused

// Mock Data
const MOCK_PINS = [
    { id: '1', emoji: '🗼', lat: 35.6586, lng: 139.7454, title: 'Tokyo Tower' },
    { id: '2', emoji: '🍱', lat: 35.6895, lng: 139.6917, title: 'Sushi Spot' },
    { id: '3', emoji: '⛩️', lat: 35.7148, lng: 139.7967, title: 'Senso-ji' },
];

const INITIAL_REGION = {
    latitude: 35.6895,
    longitude: 139.6917,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

type MapViewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MapViewScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<MapViewScreenNavigationProp>();

    const mapRef = useRef<MapView>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pins, setPins] = useState(MOCK_PINS);

    // Menu State
    const [menuVisible, setMenuVisible] = useState(false);
    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPin, setSelectedPin] = useState<any>(null);

    const handleAddPin = () => {
        // @ts-ignore
        navigation.navigate('CreatePin');
    };

    const handleMarkerPress = useCallback((pin: any) => {
        setSelectedPin(pin);
        setModalVisible(true);
    }, []);

    const handleClosePinDetail = useCallback(() => {
        setModalVisible(false);
        setSelectedPin(null);
    }, []);

    const renderHeaderRight = () => (
        <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
                <TouchableOpacity onPress={openMenu} style={{ padding: 8 }}>
                    <Icon name="dots-vertical" size={24} color={theme.colors.text.primary[colorScheme]} />
                </TouchableOpacity>
            }
            contentStyle={{ backgroundColor: theme.colors.card[colorScheme] }}
        >
            <Menu.Item onPress={() => { closeMenu(); console.log('Edit'); }} title="Edit Map" />
            <Menu.Item onPress={() => { closeMenu(); console.log('Share'); }} title="Share" />
            <Menu.Item onPress={() => { closeMenu(); console.log('Delete'); }} title="Delete Map" titleStyle={{ color: theme.colors.error }} />
        </Menu>
    );

    console.log(selectedPin, "selectedPin");

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Tokyo Trip"
                rightAction={renderHeaderRight()}
                onBack={() => navigation.goBack()}
            />

            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={INITIAL_REGION}
                >
                    {pins.map((pin) => (
                        <CustomMarker
                            key={pin.id}
                            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                            emoji={pin.emoji}
                            onPress={() => handleMarkerPress(pin)}
                        />
                    ))}
                </MapView>

                <MapSearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFilterPress={() => console.log('Filter')}
                    style={{ top: 10 }}
                />

                <FloatingButton
                    onPress={handleAddPin}
                    style={{ bottom: 100, right: 0 }}
                    icon="map-marker-plus-outline"
                />

                {/* Horizontal Pin List */}
                <View style={styles.horizontalListContainer}>
                    <FlatList
                        horizontal
                        data={pins}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={280 + 16} // card width + margin
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.card, { backgroundColor: theme.colors.card[colorScheme], borderColor: theme.colors.border[colorScheme] }]}
                                onPress={() => handleMarkerPress(item)}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                                <View style={styles.cardContent}>
                                    <Text style={[theme.typography.bodyBold, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={[theme.typography.caption, { color: theme.colors.text.secondary[colorScheme] }]}>
                                        {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>

            <PinDetailModal
                visible={modalVisible}
                pin={selectedPin}
                onClose={handleClosePinDetail}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    horizontalListContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        height: 80,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 260,
        padding: 12,
        marginRight: 16,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardEmoji: {
        fontSize: 32,
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
});
