import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { RatingPicker } from '../../components/common/RatingPicker';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { databaseService } from '../../services/DatabaseService';
import { MAP_EMOJIS } from '../../constants/emojis';

export const CreatePinScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [rating, setRating] = useState(0);
    const [selectedEmoji, setSelectedEmoji] = useState('📍');
    const [imageUri, setImageUri] = useState<string | null>(null);

    const route = useRoute();
    const { mapId } = route.params as { mapId: string };

    const handleSave = async () => {
        if (!title.trim()) {
            // Alert or toast
            return;
        }

        try {
            await databaseService.addPin({
                mapId: mapId,
                title: title.trim(),
                description: description.trim(),
                latitude: 35.6895, // Mock location
                longitude: 139.6917 + (Math.random() * 0.01),
                rating: rating,
                emoji: selectedEmoji,
                imageUri: imageUri || undefined,
            });
            navigation.goBack();
        } catch (error) {
            console.error('Failed to add pin:', error);
        }
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const handleTakePhoto = () => {
        // Placeholder for camera logic
        console.log('Take Photo');
        // Simulate image selection
        setImageUri('mock_image_uri');
    };

    const handlePickPhoto = () => {
        // Placeholder for gallery logic
        console.log('Pick Photo');
    };

    const renderInput = (
        label: string,
        value: string,
        setValue: (text: string) => void,
        placeholder: string,
        multiline = false
    ) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>{label}</Text>
            <View style={[
                styles.inputContainer,
                { backgroundColor: theme.colors.surface[colorScheme] },
                multiline && { minHeight: 100 }
            ]}>
                <TextInput
                    style={[
                        styles.input,
                        { color: theme.colors.text.primary[colorScheme] },
                        multiline && { height: 80, textAlignVertical: 'top' }
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                    value={value}
                    onChangeText={setValue}
                    multiline={multiline}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]} edges={['left', 'right', 'bottom']}>
            {/* Header */}
            {/* Header */}
            <ScreenHeader
                leftComponent={
                    <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
                        <Icon name="chevron-left" size={32} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
                centerComponent={
                    <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme] }]}>
                        Add Pin
                    </Text>
                }
                rightComponent={
                    <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                        <Text style={[theme.typography.bodyBold, { color: theme.colors.primary }]}>Save</Text>
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Location (Simplified Search) */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Location</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface[colorScheme], flexDirection: 'row', alignItems: 'center' }]}>
                            <Icon name="magnify" size={24} color={theme.colors.text.tertiary[colorScheme]} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.input, { flex: 1, color: theme.colors.text.primary[colorScheme] }]}
                                placeholder="Search location"
                                placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>
                        <View style={styles.locationActions}>
                            <TouchableOpacity style={[styles.locationBtn, { borderColor: theme.colors.border[colorScheme] }]}>
                                <Icon name="crosshairs-gps" size={18} color={theme.colors.primary} />
                                <Text style={[styles.locationBtnText, { color: theme.colors.primary }]}>Use Current</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.locationBtn, { borderColor: theme.colors.border[colorScheme] }]}>
                                <Icon name="map-marker-outline" size={18} color={theme.colors.primary} />
                                <Text style={[styles.locationBtnText, { color: theme.colors.primary }]}>Pick on Map</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {renderInput('Title', title, setTitle, 'Enter title...')}
                    {renderInput('Description', description, setDescription, 'Add notes...', true)}

                    {/* Rating */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Rating</Text>
                        <RatingPicker value={rating} onValueChange={setRating} />
                    </View>

                    {/* Emoji Selector */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Icon</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                            {MAP_EMOJIS.slice(0, 50).map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => setSelectedEmoji(emoji)}
                                    style={[
                                        styles.emojiItem,
                                        selectedEmoji === emoji && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Photo */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Photo (Optional)</Text>
                        <View style={styles.photoActions}>
                            <TouchableOpacity
                                style={[styles.photoBtn, { backgroundColor: theme.colors.surface[colorScheme] }]}
                                onPress={handleTakePhoto}
                            >
                                <Icon name="camera" size={24} color={theme.colors.primary} />
                                <Text style={[styles.photoBtnText, { color: theme.colors.text.primary[colorScheme] }]}>Take Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.photoBtn, { backgroundColor: theme.colors.surface[colorScheme] }]}
                                onPress={handlePickPhoto}
                            >
                                <Icon name="image" size={24} color={theme.colors.primary} />
                                <Text style={[styles.photoBtnText, { color: theme.colors.text.primary[colorScheme] }]}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                        {imageUri && (
                            <View style={styles.imagePreview}>
                                <Icon name="image-area" size={48} color={theme.colors.text.tertiary[colorScheme]} />
                                <Text style={{ color: theme.colors.text.tertiary[colorScheme] }}>Mock Image Preview</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    headerBtn: {
        padding: 4,
    },
    content: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    input: {
        fontSize: 16,
        padding: 0,
    },
    locationActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    locationBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    photoBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    photoBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    imagePreview: {
        height: 150,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    emojiItem: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        backgroundColor: 'transparent',
    }
});
