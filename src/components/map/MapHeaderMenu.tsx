import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';

interface MapHeaderMenuProps {
    onEdit: () => void;
    onShare: () => void;
    onDelete: () => void;
}

export const MapHeaderMenu: React.FC<MapHeaderMenuProps> = ({ onEdit, onShare, onDelete }) => {
    const { theme, colorScheme } = useTheme();
    const [visible, setVisible] = useState(false);

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    const handleOption = (action: () => void) => {
        closeMenu();
        // slight delay to allow modal to close smoothly before action
        setTimeout(action, 200);
    };

    return (
        <>
            <TouchableOpacity onPress={openMenu} style={{ padding: 8 }}>
                <Icon name="dots-horizontal" size={28} color={theme.colors.text.primary[colorScheme]} />
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={visible}
                animationType="fade"
                onRequestClose={closeMenu}
            >
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.sheet, { backgroundColor: theme.colors.card[colorScheme] }]}>
                                {/* Header / Handle */}
                                <View style={styles.handleContainer}>
                                    <View style={[styles.handle, { backgroundColor: theme.colors.border[colorScheme] }]} />
                                </View>

                                {/* Options */}
                                <TouchableOpacity
                                    style={[styles.option, { borderBottomColor: theme.colors.border[colorScheme] }]}
                                    onPress={() => handleOption(onEdit)}
                                >
                                    <Icon name="pencil" size={24} color={theme.colors.text.primary[colorScheme]} style={styles.icon} />
                                    <Text style={[styles.optionText, { color: theme.colors.text.primary[colorScheme] }]}>Edit Map</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.option, { borderBottomColor: theme.colors.border[colorScheme] }]}
                                    onPress={() => handleOption(onShare)}
                                >
                                    <Icon name="share-variant" size={24} color={theme.colors.text.primary[colorScheme]} style={styles.icon} />
                                    <Text style={[styles.optionText, { color: theme.colors.text.primary[colorScheme] }]}>Share</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => handleOption(onDelete)}
                                >
                                    <Icon name="trash-can-outline" size={24} color={theme.colors.error} style={styles.icon} />
                                    <Text style={[styles.optionText, { color: theme.colors.error }]}>Delete Map</Text>
                                </TouchableOpacity>

                                {/* Cancel Button */}
                                <TouchableOpacity
                                    style={[styles.cancelButton, { backgroundColor: theme.colors.surface[colorScheme], marginTop: 16 }]}
                                    onPress={closeMenu}
                                >
                                    <Text style={[styles.cancelText, { color: theme.colors.text.primary[colorScheme] }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    handleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
    },
    icon: {
        marginRight: 16,
    },
    optionText: {
        fontSize: 18,
        fontWeight: '500',
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: 'bold',
    }
});
