import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking, Platform, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { databaseService } from '../../services/DatabaseService';
import { moderateScale } from '../../utils/responsive';
import { ScreenHeader } from '../../components/common/ScreenHeader';

interface SettingsRowProps {
    icon: string;
    title: string;
    value?: string;
    isDestructive?: boolean;
    hasToggle?: boolean;
    isToggled?: boolean;
    onToggle?: (val: boolean) => void;
    onPress?: () => void;
    color?: string;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
    icon, title, value, isDestructive, hasToggle, isToggled, onToggle, onPress, color
}) => {
    const { theme, colorScheme } = useTheme();
    const iconColor = color || (isDestructive ? theme.colors.error : theme.colors.text.primary[colorScheme]);
    const textColor = isDestructive ? theme.colors.error : theme.colors.text.primary[colorScheme];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={hasToggle}
            activeOpacity={0.7}
        >
            <View style={[styles.cardRow, { backgroundColor: theme.colors.surface[colorScheme] }]}>
                <View style={styles.rowLeft}>
                    <Icon name={icon} size={24} color={iconColor} style={styles.icon} />
                    <Text style={[styles.titleText, { color: textColor }]}>{title}</Text>
                </View>
                <View style={styles.rowRight}>
                    {value && (
                        <Text style={[theme.typography.body, { color: theme.colors.text.secondary[colorScheme], marginRight: 8 }]}>
                            {value}
                        </Text>
                    )}
                    {hasToggle && (
                        <Switch
                            value={isToggled}
                            onValueChange={onToggle}
                            trackColor={{ false: theme.colors.border[colorScheme], true: theme.colors.primary }}
                            thumbColor="#FFF"
                        />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title = "", children }) => {
    const { theme, colorScheme } = useTheme();
    return (
        <View style={styles.section}>
            {title && (
                <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary[colorScheme], textTransform: 'none' }]}>
                    {title}
                </Text>
            )}
            <View>
                {children}
            </View>
        </View>
    );
};

export const SettingsScreen: React.FC = () => {
    const { theme, colorScheme, themeType, setAppTheme } = useTheme();
    const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const { top, bottom } = useSafeAreaInsets();

    // Helpers
    const getThemeLabel = (t: string) => {
        if (t === 'system') return 'Auto (System)';
        if (t === 'dark') return 'Dark Mode';
        return 'Light Mode';
    };

    const handleThemeSelect = (selectedTheme: any) => {
        setAppTheme(selectedTheme);
        setIsThemeModalVisible(false);
    };

    const handlePremium = () => Alert.alert("Go Premium", "Premium flow coming soon!", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });

    const handleExport = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const data = await databaseService.getAllData();
            const filePath = RNFS.DocumentDirectoryPath + '/places_backup.json';

            await RNFS.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

            await Share.open({
                url: 'file://' + filePath,
                type: 'application/json',
                message: 'Here is my Places I... backup!',
                title: 'Export Data'
            });
        } catch (error) {
            console.error(error);
            Alert.alert("Export Failed", "Could not export data.", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (isLoading) return;
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.allFiles], // Allow all files since JSON mime types can vary
            });

            if (res.uri) {
                // Check file size to prevent OOM crashes
                try {
                    const stats = await RNFS.stat(res.uri);
                    const sizeInMB = stats.size / (1024 * 1024);
                    if (sizeInMB > 150) {
                        Alert.alert("File Too Large", "This backup file is too large to import directly on this device.", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
                        return; // Stop here
                    }
                } catch (statError) {
                    console.warn("Could not check file stats", statError);
                }

                setIsLoading(true);
                // Tiny delay to ensure UI updates before heavy work starts
                await new Promise(resolve => setTimeout(resolve, 100));

                const fileContent = await RNFS.readFile(res.uri, 'utf8');
                const jsonData = JSON.parse(fileContent);

                await databaseService.importData(jsonData);

                Alert.alert(
                    "Import Successful",
                    `Restored ${jsonData.maps?.length || 0} maps and ${jsonData.pins?.length || 0} pins.`,
                    undefined,
                    { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' }
                );
            }
        } catch (err: any) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled
            } else if (err instanceof SyntaxError) {
                Alert.alert("Import Failed", "The selected file is not a valid JSON file.", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
            } else {
                console.error(err);
                if (err.message && (err.message.includes("Failed to allocate") || err.message.includes("OOM") || err.message.includes("OutOfMemory"))) {
                    Alert.alert("Import Failed", "The backup file is too large for this device's memory.", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
                } else {
                    Alert.alert("Import Failed", err.message || "An unknown error occurred.", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearData = () => {
        Alert.alert(
            "Clear All Data",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await databaseService.clearAllData();
                            Toast.show({
                                type: 'success',
                                text1: 'All maps and pins have been deleted.',
                                position: 'bottom',
                                visibilityTime: 3000,
                            });
                        } catch (error) {
                            Alert.alert("Error", "Failed to clear data.", undefined, { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' });
                        }
                    }
                }
            ],
            { userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light' }
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
            <ScreenHeader
                centerComponent={
                    <Text style={[styles.headerText, { color: theme.colors.text.primary[colorScheme] }]}>
                        Settings
                    </Text>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* PREMIUM */}
                <SettingsSection title="">
                    <TouchableOpacity
                        onPress={handlePremium}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.premiumCard, { backgroundColor: '#EAF2FD' }]}>
                            <View style={styles.rowLeft}>
                                <Icon name="crown" size={36} color="#FFD700" style={styles.icon} />
                                <View>
                                    <Text style={[styles.premiumCardText, { color: '000000' }]}>Go Premium</Text>
                                    <Text style={[styles.premiumCardCaption, { color: '#3C3C43' }]}>Remove ads</Text>
                                </View>
                            </View>
                            {/* Chevron Removed */}
                        </View>
                    </TouchableOpacity>
                </SettingsSection>

                {/* DATA */}
                <SettingsSection title="Data">
                    <SettingsRow icon="database-export" title="Export Data" onPress={handleExport} />
                    <SettingsRow icon="database-import" title="Import Data" onPress={handleImport} />
                    <SettingsRow icon="delete" title="Clear All Data" isDestructive onPress={handleClearData} />
                </SettingsSection>

                {/* PREFERENCES */}
                <SettingsSection title="Preferences">
                    <SettingsRow
                        icon="theme-light-dark"
                        title="Theme"
                        value={getThemeLabel(themeType)} // Fixed usage
                        onPress={() => setIsThemeModalVisible(true)}
                    />
                    <SettingsRow
                        icon="bell"
                        title="Notifications"
                        hasToggle
                        isToggled={notificationsEnabled}
                        onToggle={setNotificationsEnabled}
                    />
                </SettingsSection>

                {/* ABOUT */}
                <SettingsSection title="About">
                    <SettingsRow icon="information" title="Version" value="1.0.0" onPress={() => { }} />
                    <SettingsRow icon="shield-check" title="Privacy Policy" onPress={() => Linking.openURL('https://upriseix.com/PrivacyPolicy.html')} />
                    <SettingsRow icon="file-document" title="Terms of Service" onPress={() => Linking.openURL('https://upriseix.com/TC.html')} />
                </SettingsSection>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Loading Modal */}
            <Modal transparent visible={isLoading} animationType="fade">
                <View style={styles.loadingModalOverlay}>
                    <View style={[styles.loadingModalContent, { backgroundColor: theme.colors.card[colorScheme] }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={[theme.typography.bodyBold, styles.loadingText, { color: theme.colors.text.primary[colorScheme] }]}>
                            Processing Data...
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Theme Selector Modal */}
            <Modal transparent visible={isThemeModalVisible} animationType="slide" onRequestClose={() => setIsThemeModalVisible(false)}>
                <TouchableOpacity
                    style={styles.themeModalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsThemeModalVisible(false)}
                >
                    <View style={[styles.themeModalContent, {
                        backgroundColor: theme.colors.card[colorScheme],
                        paddingBottom: bottom + 20,
                    }]}>
                        {/* Drag Handle */}
                        <View style={[styles.dragHandle, { backgroundColor: theme.colors.text.tertiary[colorScheme] }]} />

                        <Text style={[styles.chooseThemeText, { color: theme.colors.text.primary[colorScheme] }]}>
                            Choose Theme
                        </Text>

                        {['light', 'dark', 'system'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.themeOption, {
                                    borderBottomWidth: t === 'system' ? 0 : StyleSheet.hairlineWidth,
                                    borderBottomColor: theme.colors.border[colorScheme],
                                }]}
                                onPress={() => handleThemeSelect(t)}
                            >
                                <Text style={[theme.typography.body, { color: theme.colors.text.primary[colorScheme] }]}>
                                    {getThemeLabel(t)}
                                </Text>
                                {themeType === t && (
                                    <Icon name="check" size={24} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerText: {
        fontSize: moderateScale(20),
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 16,
        textTransform: 'uppercase',
        opacity: 0.7,
    },
    sectionContent: {
        // Removed
    },
    row: {
        // Removed
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        marginBottom: 12,
        minHeight: 70,
        borderRadius: 12,
    },
    premiumCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        marginBottom: 12,
        minHeight: 70,
        borderRadius: 12,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 16,
    },
    loadingModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingModalContent: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
    },
    themeModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    themeModalContent: {
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    themeModalTitle: {
        marginBottom: 20,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    bottomSpacer: {
        height: 40,
    },
    premiumCardText: {
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    premiumCardCaption: {
        fontSize: moderateScale(14),
        fontWeight: '300',
    },
    titleText: {
        fontSize: moderateScale(13),
        fontWeight: '400',
    },
    chooseThemeText: {
        fontSize: moderateScale(18),
        fontWeight: '500',
    }
});
