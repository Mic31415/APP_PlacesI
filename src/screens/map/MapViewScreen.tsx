import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Alert, Modal, TextInput, Share } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { CustomMarker } from '../../components/map/CustomMarker';
import { MapSearchBar } from '../../components/map/MapSearchBar';
import { FloatingButton } from '../../components/common/FloatingButton';
import { RootStackParamList, HomeStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PinDetailModal } from '../../components/map/PinDetailModal';
import { EmojiPickerModal } from '../../components/common/EmojiPickerModal';
import { MapHeaderMenu } from '../../components/map/MapHeaderMenu';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ... imports
import { databaseService, PinData } from '../../services/DatabaseService';

// Default Region (Tokyo)
const INITIAL_REGION = {
    latitude: 35.6895,
    longitude: 139.6917,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

type MapViewScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'MapView'>;
type MapViewScreenRouteProp = RouteProp<HomeStackParamList, 'MapView'>;



export const MapViewScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<MapViewScreenNavigationProp>();
    const route = useRoute<MapViewScreenRouteProp>();
    const { mapId, mapName, emoji } = route.params || {};

    const mapRef = useRef<MapView>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pins, setPins] = useState<PinData[]>([]);

    // Local state for Map Details (to allow updates)
    const [currentMapName, setCurrentMapName] = useState(mapName);
    const [currentMapEmoji, setCurrentMapEmoji] = useState(emoji);

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState(mapName);
    const [editEmoji, setEditEmoji] = useState(emoji);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

    const filteredPins = useMemo(() => {
        if (!searchQuery.trim()) return pins;
        const query = searchQuery.toLowerCase();
        return pins.filter(pin =>
            pin.title.toLowerCase().includes(query) ||
            (pin.description && pin.description.toLowerCase().includes(query))
        );
    }, [pins, searchQuery]);

    useFocusEffect(
        React.useCallback(() => {
            if (!mapId) return;

            const loadPins = async () => {
                try {
                    const fetchedPins = await databaseService.getPins(mapId);
                    setPins(fetchedPins);
                } catch (error) {
                    console.error('Failed to load pins:', error);
                }
            };
            loadPins();
        }, [mapId])
    );



    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPin, setSelectedPin] = useState<PinData | null>(null);

    const handleEditMap = () => {
        setEditName(currentMapName);
        setEditEmoji(currentMapEmoji);
        setEditModalVisible(true);
    };

    const handleSaveMap = async () => {
        if (!editName.trim()) {
            Alert.alert("Error", "Map name cannot be empty");
            return;
        }

        try {
            await databaseService.updateMap(mapId, editName.trim(), editEmoji);
            setCurrentMapName(editName.trim());
            setCurrentMapEmoji(editEmoji);
            setEditModalVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update map");
        }
    };

    const handleAddPin = () => {
        navigation.navigate('CreatePin', { mapId, mapEmoji: emoji });
    };

    const handleEditPin = (pin: any) => {
        setModalVisible(false); // Close modal first
        navigation.navigate('CreatePin', { mapId, mapEmoji: emoji, pin });
    };

    const handleSharePin = async (pin: any) => {
        try {
            let message = `${pin.emoji || '📍'} *${pin.title}*\n`;
            if (pin.rating) message += `⭐ ${pin.rating}/5\n`;
            if (pin.description) message += `"${pin.description}"\n`;
            if (pin.latitude && pin.longitude) {
                message += `🗺️ https://maps.google.com/?q=${pin.latitude},${pin.longitude}\n`;
            }
            message += `\nShared from *Places I...* App`;

            await Share.share({
                message: message,
                title: `Check out ${pin.title}`,
            });
        } catch (error) {
            console.error('Error sharing pin:', error);
        }
    };

    const handleMarkerPress = useCallback((pin: any) => {
        setSelectedPin(pin);
        setModalVisible(true);
    }, []);

    const handleClosePinDetail = useCallback(() => {
        setModalVisible(false);
        setSelectedPin(null);
    }, []);

    const handleDeletePin = useCallback(async (pinId: string) => {
        try {
            await databaseService.deletePin(pinId);
            const updatedPins = pins.filter(p => p.id !== pinId);
            setPins(updatedPins);
        } catch (error) {
            console.error('Failed to delete pin:', error);
            Alert.alert('Error', 'Failed to delete pin');
        }
    }, [pins]);

    const handleShareMap = async () => {
        try {
            const hasPins = pins.length > 0;

            // Build a human-readable message
            let message = `🗺️ *${currentMapName}* ${currentMapEmoji}\n`;
            message += `📍 ${pins.length} Places Pinned\n\n`;

            if (hasPins) {
                // Header for the list
                message += `Here are the places I've saved:\n\n`;

                // Loop through pins and format them
                pins.forEach((pin, index) => {
                    const ratingStar = pin.rating ? '⭐ ' + pin.rating + '/5' : '';
                    message += `${index + 1}. ${pin.emoji || '📍'} *${pin.title}*\n`;
                    if (ratingStar) message += `   ${ratingStar}\n`;
                    if (pin.description) message += `   "${pin.description}"\n`;
                    // Add Google Maps link if coords exist
                    if (pin.latitude && pin.longitude) {
                        message += `   🗺️ https://maps.google.com/?q=${pin.latitude},${pin.longitude}\n`;
                    }
                    message += '\n'; // Add spacing between pins
                });
            } else {
                message += "No pins added yet! Start exploring.\n";
            }

            message += `\nShared from *Places I...* App`;

            await Share.share({
                message: message,
                title: `My Map: ${currentMapName}`,
            });
        } catch (error) {
            console.error('Error sharing map:', error);
            Alert.alert('Share Failed', 'Could not share map.');
        }
    };

    const handleDeleteMap = () => {
        Alert.alert(
            "Delete Map",
            `Are you sure you want to delete "${currentMapName}"?\nAll ${pins.length} pins will serve no purpose and be removed.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await databaseService.deleteMap(mapId);
                            navigation.goBack();
                        } catch (error) {
                            console.error('Failed to delete map:', error);
                            Alert.alert('Error', 'Failed to delete map');
                        }
                    }
                }
            ]
        );
    };

    const renderHeaderRight = useCallback(() => (
        <MapHeaderMenu
            onEdit={() => handleEditMap()}
            onShare={handleShareMap}
            onDelete={handleDeleteMap}
        />
    ), [handleEditMap, currentMapName, currentMapEmoji, pins]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                leftComponent={
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="chevron-left" size={32} color={theme.colors.text.primary[colorScheme]} />
                    </TouchableOpacity>
                }
                centerComponent={
                    <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme] }]}>
                        {currentMapEmoji || '🗺️'} {currentMapName || 'Map'}
                    </Text>
                }
                rightComponent={renderHeaderRight()}
            />

            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={INITIAL_REGION}
                >
                    {filteredPins.map((pin) => (
                        <CustomMarker
                            key={pin.id}
                            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                            emoji={pin.emoji || '📍'}
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
                        data={filteredPins}
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
                                <Text style={styles.cardEmoji}>📍</Text>
                                <View style={styles.cardContent}>
                                    <Text style={[theme.typography.bodyBold, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={[theme.typography.caption, { color: theme.colors.text.secondary[colorScheme] }]}>
                                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
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
                onDelete={handleDeletePin}
                onEdit={() => handleEditPin(selectedPin)}
                onShare={() => handleSharePin(selectedPin)}
            />

            {/* Edit Map Modal */}
            <Modal
                visible={editModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: theme.colors.card[colorScheme], borderRadius: 16, padding: 20 }}>
                        <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme], marginBottom: 16 }]}>Edit Map</Text>

                        <Text style={[theme.typography.caption, { color: theme.colors.text.secondary[colorScheme], marginBottom: 8 }]}>Name</Text>
                        <TextInput
                            style={{
                                backgroundColor: theme.colors.surface[colorScheme],
                                borderRadius: 8,
                                padding: 12,
                                color: theme.colors.text.primary[colorScheme],
                                fontSize: 16,
                                marginBottom: 16
                            }}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Map Name"
                            placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                        />

                        <Text style={[theme.typography.caption, { color: theme.colors.text.secondary[colorScheme], marginBottom: 8 }]}>Icon</Text>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: theme.colors.surface[colorScheme],
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 24
                            }}
                            onPress={() => setEmojiPickerVisible(true)}
                        >
                            <Text style={{ fontSize: 24, marginRight: 12 }}>{editEmoji}</Text>
                            <Text style={{ color: theme.colors.text.secondary[colorScheme] }}>Change Icon</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ padding: 12 }}>
                                <Text style={{ color: theme.colors.text.secondary[colorScheme], fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveMap}
                                style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <EmojiPickerModal
                visible={emojiPickerVisible}
                onClose={() => setEmojiPickerVisible(false)}
                onSelectEmoji={setEditEmoji}
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
