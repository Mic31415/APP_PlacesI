import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { moderateScale } from '../../utils/responsive';

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
                <Icon name="dots-vertical" size={28} color={theme.colors.text.primary[colorScheme]} />
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={visible}
                animationType="slide"
                onRequestClose={closeMenu}
            >
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.sheet, { backgroundColor: theme.colors.card[colorScheme] }]}>
                                {/* Header Row */}
                                <View style={[styles.headerRow, { borderBottomColor: theme.colors.border[colorScheme] }]}>
                                    <View style={styles.headerLeft}>
                                        <Text style={[styles.headerTitle, { color: theme.colors.text.primary[colorScheme] }]}>More</Text>
                                    </View>
                                    <View style={styles.headerCenter}>
                                        <View style={[styles.handle, { backgroundColor: theme.colors.border[colorScheme] }]} />
                                    </View>
                                    <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                                        <Icon name="close" size={24} color={theme.colors.text.primary[colorScheme]} />
                                    </TouchableOpacity>
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
                                    style={[styles.option, { borderBottomWidth: 0 }]}
                                    onPress={() => handleOption(onDelete)}
                                >
                                    <Icon name="trash-can-outline" size={24} color={theme.colors.error} style={styles.icon} />
                                    <Text style={[styles.optionText, { color: theme.colors.error }]}>Delete Map</Text>
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
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        borderBottomWidth: 0.5,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    headerCenter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        pointerEvents: 'none',
    },
    headerTitle: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
        marginTop: 10,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        marginTop: -30, // Move handle up nicely
    },
    closeButton: {
        paddingVertical: 8,
        marginTop: 10,
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
        fontSize: moderateScale(18),
        fontWeight: '500',
    },
});
