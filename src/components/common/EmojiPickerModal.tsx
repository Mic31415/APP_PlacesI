import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { MAP_EMOJIS } from '../../constants/emojis';
import { moderateScale } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

interface EmojiPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectEmoji: (emoji: string) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLS = 7;
const EMOJI_ITEM_SIZE = SCREEN_WIDTH / COLS;

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ visible, onClose, onSelectEmoji }) => {
    const { theme, colorScheme } = useTheme();
    // No memo needed for raw array


    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card[colorScheme] }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border[colorScheme] }]}>
                        <Text style={[styles.selectedEmojiText, { color: theme.colors.text.primary[colorScheme] }]}>Select Emoji</Text>
                        <TouchableOpacity onPress={() => { haptics.selection(); onClose(); }}>
                            <Icon name="close" size={24} color={theme.colors.text.secondary[colorScheme]} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 400 }}>
                        <FlatList
                            data={MAP_EMOJIS}
                            numColumns={COLS}
                            keyExtractor={(item) => item}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item: emoji }) => (
                                <TouchableOpacity
                                    style={{
                                        width: EMOJI_ITEM_SIZE,
                                        height: EMOJI_ITEM_SIZE,
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        haptics.selection();
                                        onSelectEmoji(emoji);
                                        onClose();
                                    }}
                                >
                                    <Text style={{ fontSize: moderateScale(32) }}>{emoji}</Text>
                                </TouchableOpacity>
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
        // backgroundColor applied at use site via theme.colors.card
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        // borderBottomColor applied at use site via theme.colors.border
        marginBottom: 16,
    },
    selectedEmojiText: {
        fontSize: moderateScale(20),
        fontWeight: '500',
    },
});
