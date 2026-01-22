import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';

interface PinDetailModalProps {
    visible: boolean;
    pin: any; // Type this properly later
    onClose: () => void;
}

export const PinDetailModal: React.FC<PinDetailModalProps> = ({ visible, pin, onClose }) => {
    const { theme, colorScheme } = useTheme();

    if (!pin) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
            presentationStyle="pageSheet" // iOS Native Sheet feel
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.content, { backgroundColor: theme.colors.card[colorScheme] }]}>
                            {/* Drag Handle (Visual only for Modal) */}
                            <View style={[styles.dragHandle, { backgroundColor: theme.colors.text.tertiary[colorScheme] }]} />

                            {/* Image Placeholder */}
                            <View style={[styles.imageContainer, { backgroundColor: theme.colors.surface[colorScheme] }]}>
                                <Icon name="image" size={48} color={theme.colors.text.tertiary[colorScheme]} />
                                <Text style={{ color: theme.colors.text.tertiary[colorScheme] }}>No Image</Text>
                            </View>

                            {/* Title & Rating */}
                            <View style={styles.headerRow}>
                                <Text style={[theme.typography.h2, { flex: 1, color: theme.colors.text.primary[colorScheme] }]}>
                                    {pin.emoji} {pin.title}
                                </Text>
                                <View style={styles.ratingContainer}>
                                    <Icon name="star" size={18} color="#FFD700" />
                                    <Icon name="star" size={18} color="#FFD700" />
                                    <Icon name="star" size={18} color="#FFD700" />
                                    <Icon name="star" size={18} color="#FFD700" />
                                    <Icon name="star-outline" size={18} color={theme.colors.text.tertiary[colorScheme]} />
                                </View>
                            </View>

                            {/* Description */}
                            <Text style={[styles.description, { color: theme.colors.text.secondary[colorScheme] }]}>
                                This is a placeholder description for {pin.title}. It would contain notes added by the user.
                            </Text>

                            {/* Info Rows */}
                            <View style={styles.infoRow}>
                                <Icon name="map-marker" size={20} color={theme.colors.primary} />
                                <Text style={[styles.infoText, { color: theme.colors.text.primary[colorScheme] }]}>
                                    Lat: {pin.lat.toFixed(4)}, Lng: {pin.lng.toFixed(4)}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Icon name="calendar" size={20} color={theme.colors.text.tertiary[colorScheme]} />
                                <Text style={[styles.infoText, { color: theme.colors.text.secondary[colorScheme] }]}>
                                    Added: Jan 21, 2026
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View style={[styles.actions, { borderTopColor: theme.colors.border[colorScheme] }]}>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Icon name="pencil" size={24} color={theme.colors.primary} />
                                    <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Icon name="share-variant" size={24} color={theme.colors.primary} />
                                    <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Icon name="delete" size={24} color={theme.colors.error} />
                                    <Text style={[styles.actionLabel, { color: theme.colors.error }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    content: {
        padding: 24,
        paddingTop: 12,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 400,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    ratingContainer: {
        flexDirection: 'row',
        marginTop: 6,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    infoText: {
        fontSize: 15,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 'auto',
        borderTopWidth: 1,
        paddingTop: 20,
        justifyContent: 'space-around',
    },
    actionBtn: {
        alignItems: 'center',
        gap: 4,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '500',
    }
});
