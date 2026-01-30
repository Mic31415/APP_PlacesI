import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types/navigation';
import { databaseService } from '../../services/DatabaseService';
import { EmojiPickerModal } from '../../components/common/EmojiPickerModal';
import { InterstitialAdService } from '../../services/InterstitialAdService';
import { moderateScale } from '../../utils/responsive';
import { ScreenHeader } from '../../components/common/ScreenHeader';

type CreateScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Create'>;

export const CreateScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<CreateScreenNavigationProp>();
    const { top, bottom } = useSafeAreaInsets();

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

    const handleCreate = async () => {
        if (!mapName.trim()) {
            Alert.alert('Required', 'Please enter a map name', undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
            return;
        }

        try {
            await databaseService.createMap(mapName.trim(), selectedEmoji, mapType);

            // Show interstitial ad if not premium
            await InterstitialAdService.show();

            // Optional: Haptic feedback here
            setMapName('');
            setSelectedEmoji('🗺️');
            setMapType('exact');
            navigation.navigate('Home');
        } catch (error) {
            console.error('Error creating map:', error);
            Alert.alert('Error', 'Failed to create map. Please try again.', undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
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
        <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
            <ScreenHeader
                centerComponent={
                    <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]}>
                        New Map
                    </Text>
                }
            />

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
                    style={[
                        styles.emojiSelector,
                        { backgroundColor: theme.colors.surface[colorScheme] }
                    ]}
                    onPress={() => setEmojiModalVisible(true)}
                >
                    <View style={[styles.emojiInnerContainer, { backgroundColor: theme.colors.innerSurface[colorScheme] }]}>
                        <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
                    </View>
                    <Text style={[styles.caption, { color: theme.colors.text.tertiary[colorScheme], marginTop: 12 }]}>
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
            <EmojiPickerModal
                visible={emojiModalVisible}
                onClose={() => setEmojiModalVisible(false)}
                onSelectEmoji={setSelectedEmoji}
            />
        </View>
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
    headerText: {
        fontSize: moderateScale(20),
        fontWeight: '600',
    },
    headerBtn: {
        padding: 4,
    },
    content: {
        padding: 24,
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        marginBottom: 8,
        marginTop: 16,
    },
    inputContainer: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    input: {
        fontSize: moderateScale(12),
    },
    emojiSelector: {
        flexDirection: 'column',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginBottom: 8,
        width: '100%',
        justifyContent: 'center',
    },
    emojiInnerContainer: {
        width: '100%',
        height: 100,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emojiPreview: {
        fontSize: moderateScale(60),
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    radioLabel: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        marginLeft: 12,
    },
    createButton: {
        marginTop: 32,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    caption: {
        fontSize: moderateScale(12),
        fontWeight: '400',
    },
});
