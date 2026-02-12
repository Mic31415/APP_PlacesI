import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Region, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geocoder from 'react-native-geocoding';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { HomeStackParamList } from '../../types/navigation';
import AppConfig from '../../config';
import { moderateScale } from '../../utils/responsive';

// Initialize Geocoder if not already initialized
Geocoder.init(AppConfig.GOOGLE_MAPS_API_KEY);

type MapPickerScreenRouteProp = RouteProp<HomeStackParamList, 'MapPicker'>;

export const MapPickerScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation();
    const route = useRoute<MapPickerScreenRouteProp>();
    const insets = useSafeAreaInsets();

    const { initialRegion, onSelectLocation } = route.params;

    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState<Region>(initialRegion || {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    const [isLocating, setIsLocating] = useState<boolean>(!initialRegion);

    // We track the center coordinate as the user drags
    const [centerCoordinate, setCenterCoordinate] = useState<{ latitude: number, longitude: number }>(
        initialRegion ? { latitude: initialRegion.latitude, longitude: initialRegion.longitude } : { latitude: 37.78825, longitude: -122.4324 }
    );

    const [address, setAddress] = useState<string>('');
    const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial reverse geocode & Current Location
    useEffect(() => {
        if (initialRegion) {
            reverseGeocode(centerCoordinate.latitude, centerCoordinate.longitude);
        } else {
            getCurrentLocation();
        }
    }, []);

    const getCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const permission = Platform.select({
                ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
                android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            });

            if (!permission) {
                setIsLocating(false);
                return;
            }

            const result = await check(permission);

            if (result === RESULTS.DENIED) {
                await request(permission);
            }

            Geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newRegion = {
                        latitude,
                        longitude,
                        latitudeDelta: 0.005, // Zoom in closer for current location
                        longitudeDelta: 0.002,
                    };

                    setRegion(newRegion);
                    setCenterCoordinate({ latitude, longitude });
                    mapRef.current?.animateToRegion(newRegion, 1000);

                    // Fetch address for current location
                    reverseGeocode(latitude, longitude);
                    setIsLocating(false);
                },
                (error) => {
                    console.log('Error getting location:', error);
                    // Fallback to default if failed, already set in state
                    reverseGeocode(centerCoordinate.latitude, centerCoordinate.longitude);
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        } catch (error) {
            console.error("Location permission error:", error);
            // Fallback
            reverseGeocode(centerCoordinate.latitude, centerCoordinate.longitude);
            setIsLocating(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        setIsLoadingAddress(true);
        try {
            const json = await Geocoder.from(lat, lng);
            if (json.results && json.results.length > 0) {
                const formattedAddress = json.results[0].formatted_address;
                setAddress(formattedAddress);
            } else {
                setAddress('Unknown location');
            }
        } catch (error) {
            console.warn('Reverse geocoding failed', error);
            setAddress('Location found');
        } finally {
            setIsLoadingAddress(false);
        }
    };

    const onRegionChangeComplete = (newRegion: Region) => {
        setRegion(newRegion);
        setCenterCoordinate({
            latitude: newRegion.latitude,
            longitude: newRegion.longitude,
        });

        // Debounce the reverse geocoding
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            reverseGeocode(newRegion.latitude, newRegion.longitude);
        }, 800);
    };

    const handleConfirm = () => {
        onSelectLocation({
            latitude: centerCoordinate.latitude,
            longitude: centerCoordinate.longitude,
            address: address,
        });
        navigation.goBack();
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    const handleCurrentLocation = () => {
        getCurrentLocation();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>

            {/* Search Bar Overlay */}
            <View style={{ position: 'absolute', top: insets.top + 10, left: 10, right: 10, zIndex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                        width: 44,
                        height: 44,
                        backgroundColor: theme.colors.surface[colorScheme],
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 10,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                >
                    <Icon name="chevron-left" size={30} color={theme.colors.text.primary[colorScheme]} />
                </TouchableOpacity>

                <GooglePlacesAutocomplete
                    placeholder='Search for a place'
                    onPress={(data, details = null) => {
                        // 'details' is provided when fetchDetails = true
                        if (details) {
                            const { lat, lng } = details.geometry.location;
                            const newRegion = {
                                latitude: lat,
                                longitude: lng,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            };
                            mapRef.current?.animateToRegion(newRegion, 1000);
                            setRegion(newRegion);
                            setCenterCoordinate({ latitude: lat, longitude: lng });
                            reverseGeocode(lat, lng);
                        }
                    }}
                    query={{
                        key: AppConfig.GOOGLE_MAPS_API_KEY,
                        language: 'en',
                    }}
                    fetchDetails={true}
                    styles={{
                        textInputContainer: {
                            backgroundColor: 'transparent',
                        },
                        textInput: {
                            height: 44,
                            color: theme.colors.text.primary[colorScheme],
                            fontSize: 16,
                            backgroundColor: theme.colors.surface[colorScheme],
                            borderRadius: 8,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                        },
                        listView: {
                            backgroundColor: theme.colors.surface[colorScheme],
                            marginTop: 8,
                            borderRadius: 8,
                            elevation: 3,
                            width: '100%'
                        },
                        row: {
                            backgroundColor: theme.colors.surface[colorScheme],
                            padding: 13,
                            paddingRight: 24, // Added more space on the right
                            height: 44,
                            flexDirection: 'row',
                        },
                        separator: {
                            height: 0.5,
                            backgroundColor: theme.colors.border[colorScheme],
                        },
                        description: {
                            color: theme.colors.text.primary[colorScheme],
                        },
                        poweredContainer: {
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            borderBottomRightRadius: 5,
                            borderBottomLeftRadius: 5,
                            borderColor: '#c8c7cc',
                            borderTopWidth: 0.5,
                            backgroundColor: theme.colors.surface[colorScheme],
                        },
                        powered: {
                            tintColor: theme.colors.text.tertiary[colorScheme],
                        },
                    }}
                    enablePoweredByContainer={false}
                />
            </View>

            {isLocating ? (
                <View style={[styles.centerMarkerContainer, { backgroundColor: theme.colors.background[colorScheme], zIndex: 20 }]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 16, color: theme.colors.text.secondary[colorScheme], fontFamily: 'poppins_medium' }}>Finding your location...</Text>
                </View>
            ) : (
                <>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_DEFAULT}
                        style={styles.map}
                        initialRegion={region}
                        onRegionChangeComplete={onRegionChangeComplete}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                    />

                    {/* Center Fixed Pin */}
                    <View style={styles.centerMarkerContainer} pointerEvents="none">
                        <Icon name="map-marker" size={48} color={theme.colors.primary} style={{ marginBottom: 48 }} />
                        {/* marginBottom lifts the pin tip to center roughly */}
                    </View>
                </>
            )}

            {/* Bottom Sheet for Address & Confirm */}
            <View style={[styles.bottomSheet, { backgroundColor: theme.colors.surface[colorScheme], paddingBottom: insets.bottom + 16 }]}>
                <Text style={[styles.addressLabel, { color: theme.colors.text.tertiary[colorScheme] }]}>
                    Selected Location
                </Text>

                <View style={styles.addressContainer}>
                    <Icon name="map-marker-outline" size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        {isLoadingAddress ? (
                            <ActivityIndicator size="small" color={theme.colors.text.secondary[colorScheme]} style={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <Text style={[styles.addressText, { color: theme.colors.text.primary[colorScheme] }]} numberOfLines={2}>
                                {address || "Drag map to select"}
                            </Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleConfirm}
                    disabled={isLoadingAddress}
                >
                    <Text style={styles.confirmButtonText}>Confirm Location</Text>
                </TouchableOpacity>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    centerMarkerContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    headerOverlay: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    headerTitleContainer: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        marginRight: 44 + 12, // Balance out the back button spacing
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    headerTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        fontFamily: 'poppins_bold',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    addressLabel: {
        fontSize: moderateScale(12),
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        fontFamily: 'poppins_semibold',
    },
    addressContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    addressText: {
        fontSize: moderateScale(16),
        fontWeight: '500',
        lineHeight: 22,
        fontFamily: 'poppins_semibold',
    },
    confirmButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: moderateScale(16),
        fontWeight: '700',
        fontFamily: 'poppins_bold',
    },
});
