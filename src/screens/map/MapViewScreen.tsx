import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Alert, Modal, TextInput, Share, KeyboardAvoidingView, Platform } from 'react-native';
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
import { BannerAdView } from '../../components/ads/BannerAdView';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Easing
} from 'react-native-reanimated';

// ... imports
import { databaseService, PinData } from '../../services/DatabaseService';
import { moderateScale } from '../../utils/responsive';

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

    // Animation values for smooth, soft animations
    const searchBarOpacity = useSharedValue(0);
    const searchBarTranslateY = useSharedValue(-20); // Smaller distance for subtle effect

    const horizontalListOpacity = useSharedValue(0);
    const horizontalListTranslateY = useSharedValue(30); // Smaller distance

    const fabOpacity = useSharedValue(0);
    const fabScale = useSharedValue(0.8); // Scale instead of translate for softer feel

    // Edit Map modal animation values
    const editModalBackdropOpacity = useSharedValue(0);
    const editModalTranslateY = useSharedValue(500);

    const editFieldOpacity = useSharedValue(0);
    const editFieldTranslateY = useSharedValue(20);

    const editIconOpacity = useSharedValue(0);
    const editIconTranslateY = useSharedValue(20);

    const editButtonsOpacity = useSharedValue(0);
    const editButtonsTranslateY = useSharedValue(20);

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

            // Trigger smooth entrance animations
            // Reset to initial state
            searchBarOpacity.value = 0;
            searchBarTranslateY.value = -20;
            horizontalListOpacity.value = 0;
            horizontalListTranslateY.value = 30;
            fabOpacity.value = 0;
            fabScale.value = 0.8;

            // Animate with very smooth, soft timing
            setTimeout(() => {
                // Search bar - gentle fade and slide (200ms delay)
                setTimeout(() => {
                    searchBarOpacity.value = withTiming(1, {
                        duration: 600,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1) // Ease out
                    });
                    searchBarTranslateY.value = withTiming(0, {
                        duration: 600,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
                    });
                }, 200);

                // Horizontal list - very soft slide up (400ms delay)
                setTimeout(() => {
                    horizontalListOpacity.value = withTiming(1, {
                        duration: 700,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
                    });
                    horizontalListTranslateY.value = withSpring(0, {
                        damping: 25, // Higher damping for softer spring
                        stiffness: 80 // Lower stiffness for gentler motion
                    });
                }, 400);

                // FAB - gentle scale and fade (500ms delay)
                setTimeout(() => {
                    fabOpacity.value = withTiming(1, {
                        duration: 600,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
                    });
                    fabScale.value = withSpring(1, {
                        damping: 20,
                        stiffness: 100
                    });
                }, 500);
            }, 100);

            return () => {
                // Cleanup
                searchBarOpacity.value = 0;
                horizontalListOpacity.value = 0;
                fabOpacity.value = 0;
            };
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
            Alert.alert("Error", "Map name cannot be empty", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
            return;
        }

        try {
            await databaseService.updateMap(mapId, editName.trim(), editEmoji);
            setCurrentMapName(editName.trim());
            setCurrentMapEmoji(editEmoji);
            setEditModalVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update map", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
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
            Alert.alert('Error', 'Failed to delete pin', undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
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
                            Alert.alert('Error', 'Failed to delete map', undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
                        }
                    }
                }
            ],
            { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' }
        );
    };

    const renderHeaderRight = useCallback(() => (
        <MapHeaderMenu
            onEdit={() => handleEditMap()}
            onShare={handleShareMap}
            onDelete={handleDeleteMap}
        />
    ), [handleEditMap, currentMapName, currentMapEmoji, pins]);

    // Animated styles for smooth, soft animations
    const searchBarAnimatedStyle = useAnimatedStyle(() => ({
        opacity: searchBarOpacity.value,
        transform: [{ translateY: searchBarTranslateY.value }],
    }));

    const horizontalListAnimatedStyle = useAnimatedStyle(() => ({
        opacity: horizontalListOpacity.value,
        transform: [{ translateY: horizontalListTranslateY.value }],
    }));

    const fabAnimatedStyle = useAnimatedStyle(() => ({
        opacity: fabOpacity.value,
        transform: [{ scale: fabScale.value }],
    }));

    // Edit Map modal animated styles
    const editModalBackdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: editModalBackdropOpacity.value,
    }));

    const editModalAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: editModalTranslateY.value }],
    }));

    const editFieldAnimatedStyle = useAnimatedStyle(() => ({
        opacity: editFieldOpacity.value,
        transform: [{ translateY: editFieldTranslateY.value }],
    }));

    const editIconAnimatedStyle = useAnimatedStyle(() => ({
        opacity: editIconOpacity.value,
        transform: [{ translateY: editIconTranslateY.value }],
    }));

    const editButtonsAnimatedStyle = useAnimatedStyle(() => ({
        opacity: editButtonsOpacity.value,
        transform: [{ translateY: editButtonsTranslateY.value }],
    }));

    // Trigger Edit Map modal animations
    React.useEffect(() => {
        if (editModalVisible) {
            // Entrance animation
            editModalBackdropOpacity.value = withTiming(1, {
                duration: 400,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1)
            });
            editModalTranslateY.value = withSpring(0, {
                damping: 30,
                stiffness: 150
            });

            // Stagger form fields
            setTimeout(() => {
                editFieldOpacity.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
                editFieldTranslateY.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            }, 150);

            setTimeout(() => {
                editIconOpacity.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
                editIconTranslateY.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            }, 250);

            setTimeout(() => {
                editButtonsOpacity.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
                editButtonsTranslateY.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            }, 350);
        } else {
            // Exit animation
            editModalBackdropOpacity.value = withTiming(0, { duration: 300, easing: Easing.bezier(0.4, 0.0, 0.2, 1) });
            editModalTranslateY.value = withTiming(500, { duration: 300, easing: Easing.bezier(0.4, 0.0, 0.2, 1) });

            // Reset fields
            editFieldOpacity.value = 0;
            editFieldTranslateY.value = 20;
            editIconOpacity.value = 0;
            editIconTranslateY.value = 20;
            editButtonsOpacity.value = 0;
            editButtonsTranslateY.value = 20;
        }
    }, [editModalVisible]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                leftComponent={
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="chevron-left" size={32} color={theme.colors.text.primary[colorScheme]} />
                    </TouchableOpacity>
                }
                centerComponent={
                    <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]}>
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

                <Animated.View style={searchBarAnimatedStyle}>
                    <MapSearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFilterPress={() => console.log('Filter')}
                        style={{ top: 10 }}
                    />
                </Animated.View>

                <Animated.View style={[fabAnimatedStyle, { position: 'absolute', bottom: pins.length === 0 ? 0 : 100, right: 0 }]}>
                    <FloatingButton
                        onPress={handleAddPin}
                        icon="map-marker-plus-outline"
                    />
                </Animated.View>

                {/* Horizontal Pin List */}
                <Animated.View style={[styles.horizontalListContainer, horizontalListAnimatedStyle]}>
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
                                activeOpacity={0.98}
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
                </Animated.View>
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
                animationType="none"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <Animated.View style={[styles.bottomSheetOverlay, editModalBackdropAnimatedStyle]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1, justifyContent: 'flex-end' }}
                    >
                        <Animated.View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.card[colorScheme] }, editModalAnimatedStyle]}>
                            {/* Handle */}
                            <View style={styles.sheetHandleContainer}>
                                <View style={styles.sheetHandle} />
                            </View>

                            {/* Header */}
                            <View style={styles.sheetHeader}>
                                <Text style={[styles.sheetTitle, { color: theme.colors.text.primary[colorScheme] }]}>Edit Map</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Icon name="close" size={24} color={theme.colors.text.primary[colorScheme]} />
                                </TouchableOpacity>
                            </View>

                            {/* Name Input */}
                            <Animated.View style={editFieldAnimatedStyle}>
                                <Text style={[styles.label, { color: theme.colors.text.primary[colorScheme] }]}>Name</Text>
                                <TextInput
                                    style={[
                                        styles.inputContainer,
                                        {
                                            backgroundColor: theme.colors.surface[colorScheme],
                                            color: theme.colors.text.primary[colorScheme],
                                        }
                                    ]}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Map Name"
                                    placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                                />
                            </Animated.View>

                            {/* Icon Selector */}
                            <Animated.View style={editIconAnimatedStyle}>
                                <Text style={[styles.label, { color: theme.colors.text.primary[colorScheme] }]}>Icon</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.iconSelector,
                                        {
                                            borderColor: theme.colors.primary,
                                            backgroundColor: theme.colors.surface[colorScheme]
                                        }
                                    ]}
                                    onPress={() => {
                                        setEditModalVisible(false);
                                        setTimeout(() => setEmojiPickerVisible(true), 300);
                                    }}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Text style={{ fontSize: moderateScale(24) }}>{editEmoji}</Text>
                                    </View>
                                    <Text style={{ color: theme.colors.text.primary[colorScheme], fontSize: moderateScale(16) }}>Change Icon</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Action Buttons */}
                            <Animated.View style={[styles.buttonRow, editButtonsAnimatedStyle]}>
                                <TouchableOpacity
                                    onPress={() => setEditModalVisible(false)}
                                    style={[styles.actionButton, { backgroundColor: theme.colors.surface[colorScheme] }]}
                                >
                                    <Text style={[styles.cancelButtonText, { color: theme.colors.text.primary[colorScheme] }]}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSaveMap}
                                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                                >
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </Modal>

            <EmojiPickerModal
                visible={emojiPickerVisible}
                onClose={() => {
                    setEmojiPickerVisible(false);
                    setTimeout(() => setEditModalVisible(true), 300);
                }}
                onSelectEmoji={setEditEmoji}
            />
            <BannerAdView />
        </View >
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
        fontSize: moderateScale(32),
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    headerText: {
        fontSize: moderateScale(20),
        fontWeight: '600',
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheetContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    sheetHandleContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sheetTitle: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
    },
    label: {
        fontSize: moderateScale(16),
        fontWeight: '500',
        marginBottom: 8,
    },
    inputContainer: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    iconSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginBottom: 32,
        borderWidth: 2,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
});
