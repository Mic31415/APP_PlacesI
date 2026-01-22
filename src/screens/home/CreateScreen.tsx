import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types/navigation';

// Emoji Data
const EMOJI_LIST = [
    '🗺️', '🌍', '🌎', '🌏', '✈️', '🚗', '🚂', '⚓',
    '🏔️', '🏖️', '🏝️', '🏜️', '🌲', '🏕️', '🌋',
    '🏙️', '🗼', '🗽', '🏰', '🌉', '🏟️', '🎡',
    '🍕', '🍔', '🍜', '🍣', '🍦', '☕', '🍺', '🍷',
    '🏠', '🏨', '🏥', '🎓', '💼', '🛒', '🎁', '🎈'
];

type CreateScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Create'>;

export const CreateScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<CreateScreenNavigationProp>();

    const [mapName, setMapName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🗺️');
    const [mapType, setMapType] = useState<'country' | 'state' | 'exact'>('exact');
    const [emojiModalVisible, setEmojiModalVisible] = useState(false);

    const handleCancel = () => {
        // Find 'Home' tab and navigate
        navigation.navigate('Home');
        // Or reset form
        setMapName('');
        setSelectedEmoji('🗺️');
        setMapType('exact');
    };

    const handleCreate = () => {
        if (!mapName.trim()) {
            Alert.alert('Required', 'Please enter a map name');
            return;
        }
        // Logic to save map would go here
        console.log('Create Map:', { name: mapName, emoji: selectedEmoji, type: mapType });

        // Navigate to the new map (mock)
        // ideally we get the ID back and navigate to MapView
        navigation.navigate('Home');
        // Note: In a real app we'd navigate to the HomeStack -> MapView with new ID
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
                        <FlatList
                            data={EMOJI_LIST}
                            numColumns={6}
                            keyExtractor={(item) => item}
                            contentContainerStyle={{ paddingVertical: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.emojiItem}
                                    onPress={() => {
                                        setSelectedEmoji(item);
                                        setEmojiModalVisible(false);
                                    }}
                                >
                                    <Text style={{ fontSize: 32 }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
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
        padding: 16,
        maxHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    emojiItem: {
        flex: 1,
        alignItems: 'center',
        padding: 8,
    },
});
