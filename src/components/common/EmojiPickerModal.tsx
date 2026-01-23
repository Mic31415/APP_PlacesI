import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { MAP_EMOJIS } from '../../constants/emojis';

interface EmojiPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectEmoji: (emoji: string) => void;
}

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

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ visible, onClose, onSelectEmoji }) => {
    const { theme, colorScheme } = useTheme();
    const emojiPages = useMemo(() => chunkArray(MAP_EMOJIS, PAGE_SIZE), []);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card[colorScheme] }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme] }]}>Select Emoji</Text>
                        <TouchableOpacity onPress={onClose}>
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
                                                onSelectEmoji(emoji);
                                                onClose();
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
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
        width: '100%',
        backgroundColor: '#F5F5F5',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
});
