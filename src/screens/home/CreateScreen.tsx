import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types/navigation';
import { databaseService } from '../../services/DatabaseService';

// Emoji Data
import { MAP_EMOJIS } from '../../constants/emojis';


type CreateScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Create'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLS = 7;
const ROWS = 3;
const PAGE_SIZE = COLS * ROWS;
const EMOJI_ITEM_SIZE = SCREEN_WIDTH / COLS;

const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

export const CreateScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<CreateScreenNavigationProp>();

    const [mapName, setMapName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🗺️');
    const [mapType, setMapType] = useState<'country' | 'state' | 'exact'>('exact');
    const [emojiModalVisible, setEmojiModalVisible] = useState(false);

    const emojiPages = useMemo(() => chunkArray(MAP_EMOJIS, PAGE_SIZE), []);

    const handleCancel = () => {
        // Find 'Home' tab and navigate
        navigation.navigate('Home');
        // Or reset form
        setMapName('');
        setSelectedEmoji('🗺️');
        setMapType('exact');
    };

    const handleCreate = async () => {
        if (!mapName.trim()) {
            Alert.alert('Required', 'Please enter a map name');
            return;
        }

        try {
            await databaseService.createMap(mapName.trim(), selectedEmoji, mapType);
            // Optional: Haptic feedback here
            navigation.navigate('Home');
        } catch (error) {
            console.error('Error creating map:', error);
            Alert.alert('Error', 'Failed to create map. Please try again.');
        }
    };

    const renderMapTypeOption = (type: 'country' | 'state' | 'exact', label: string) => (
        <TouchableOpacity
            style={styles.radioButtonContainer}
            onPress={() => setMapType(type)}
            activeOpacity={0.7}
        >
            <Icon
                name={mapType === type ? 'radiobox-marked' : 'radiobox-blank'}
                size={24}
                color={mapType === type ? theme.colors.primary : theme.colors.text.tertiary[colorScheme]}
            />
            <Text style={[styles.radioLabel, { color: theme.colors.text.primary[colorScheme] }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border[colorScheme] }]}>
                <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary[colorScheme] }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme] }]}>New Map</Text>
                <TouchableOpacity onPress={handleCreate} style={styles.headerBtn}>
                    <Icon name="check" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Map Name */}
                <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Map Name</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface[colorScheme] }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text.primary[colorScheme] }]}
                        placeholder="e.g. Places I've Visited"
                        placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                        value={mapName}
                        onChangeText={setMapName}
                    />
                </View>

                {/* Emoji Selector */}
                <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Choose Emoji</Text>
                <TouchableOpacity
                    style={[styles.emojiSelector, { backgroundColor: theme.colors.surface[colorScheme] }]}
                    onPress={() => setEmojiModalVisible(true)}
                >
                    <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary[colorScheme], marginTop: 8 }]}>
                        Tap to change
                    </Text>
                </TouchableOpacity>

                {/* Map Type */}
                <Text style={[styles.label, { color: theme.colors.text.secondary[colorScheme] }]}>Map Type</Text>
                {renderMapTypeOption('country', 'Country Level')}
                {renderMapTypeOption('state', 'State Level')}
                {renderMapTypeOption('exact', 'Exact Location')}

                {/* Create Button (Redundant via header, but layout diagram creates it) */}
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleCreate}
                >
                    <Text style={[theme.typography.bodyBold, { color: '#ffffff' }]}>Create Map</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Emoji Modal */}
            <Modal
                visible={emojiModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEmojiModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card[colorScheme] }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme] }]}>Select Emoji</Text>
                            <TouchableOpacity onPress={() => setEmojiModalVisible(false)}>
                                <Icon name="close" size={24} color={theme.colors.text.secondary[colorScheme]} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: EMOJI_ITEM_SIZE * ROWS + 20 }}>
                            <FlatList
                                data={emojiPages}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(_, index) => `page-${index}`}
                                renderItem={({ item: pageEmojis }) => (
                                    <View style={{ width: SCREEN_WIDTH, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingHorizontal: 0 }}>
                                        {pageEmojis.map((emoji) => (
                                            <TouchableOpacity
                                                key={emoji}
                                                style={{
                                                    width: EMOJI_ITEM_SIZE,
                                                    height: EMOJI_ITEM_SIZE,
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}
                                                onPress={() => {
                                                    setSelectedEmoji(emoji);
                                                    setEmojiModalVisible(false);
                                                }}
                                            >
                                                <Text style={{ fontSize: 32 }}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    inputContainer: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    input: {
        fontSize: 16,
    },
    emojiSelector: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 12,
        marginBottom: 8,
    },
    emojiPreview: {
        fontSize: 64,
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    radioLabel: {
        fontSize: 16,
        marginLeft: 12,
    },
    createButton: {
        marginTop: 32,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
        width: '100%',
        backgroundColor: '#F5F5F5', // Slightly gray background often used in pickers
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    emojiItem: {
        flex: 1,
        alignItems: 'center',
        padding: 8,
    },
});
