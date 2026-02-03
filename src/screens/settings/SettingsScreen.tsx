import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Switch, Alert, Linking, Platform, Modal, ActivityIndicator } from 'react-native';
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
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing
} from 'react-native-reanimated';

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
                        <Text style={[styles.valueText, { color: theme.colors.text.secondary[colorScheme], marginRight: 8 }]}>
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

    // Animation values for smooth sequential entrance
    const premiumOpacity = useSharedValue(0);
    const premiumTranslateY = useSharedValue(30);

    const dataOpacity = useSharedValue(0);
    const dataTranslateY = useSharedValue(30);

    const preferencesOpacity = useSharedValue(0);
    const preferencesTranslateY = useSharedValue(30);

    const aboutOpacity = useSharedValue(0);
    const aboutTranslateY = useSharedValue(30);

    // Theme modal animation values
    const themeBackdropOpacity = useSharedValue(0);
    const themeSheetTranslateY = useSharedValue(400);

    const themeOption1Opacity = useSharedValue(0);
    const themeOption1TranslateX = useSharedValue(-20);

    const themeOption2Opacity = useSharedValue(0);
    const themeOption2TranslateX = useSharedValue(-20);

    const themeOption3Opacity = useSharedValue(0);
    const themeOption3TranslateX = useSharedValue(-20);

    // Trigger smooth entrance animations on mount
    React.useEffect(() => {
        const easing = Easing.bezier(0.25, 0.1, 0.25, 1);
        const duration = 600;
        const stagger = 150;

        setTimeout(() => {
            // Premium section (0ms)
            premiumOpacity.value = withTiming(1, { duration, easing });
            premiumTranslateY.value = withTiming(0, { duration, easing });

            // Data section (150ms)
            setTimeout(() => {
                dataOpacity.value = withTiming(1, { duration, easing });
                dataTranslateY.value = withTiming(0, { duration, easing });
            }, stagger);

            // Preferences section (300ms)
            setTimeout(() => {
                preferencesOpacity.value = withTiming(1, { duration, easing });
                preferencesTranslateY.value = withTiming(0, { duration, easing });
            }, stagger * 2);

            // About section (450ms)
            setTimeout(() => {
                aboutOpacity.value = withTiming(1, { duration, easing });
                aboutTranslateY.value = withTiming(0, { duration, easing });
            }, stagger * 3);
        }, 100);
    }, []);

    // Animated styles
    const premiumAnimatedStyle = useAnimatedStyle(() => ({
        opacity: premiumOpacity.value,
        transform: [{ translateY: premiumTranslateY.value }],
    }));

    const dataAnimatedStyle = useAnimatedStyle(() => ({
        opacity: dataOpacity.value,
        transform: [{ translateY: dataTranslateY.value }],
    }));

    const preferencesAnimatedStyle = useAnimatedStyle(() => ({
        opacity: preferencesOpacity.value,
        transform: [{ translateY: preferencesTranslateY.value }],
    }));

    const aboutAnimatedStyle = useAnimatedStyle(() => ({
        opacity: aboutOpacity.value,
        transform: [{ translateY: aboutTranslateY.value }],
    }));

    // Theme modal animated styles
    const themeBackdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: themeBackdropOpacity.value,
    }));

    const themeSheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: themeSheetTranslateY.value }],
    }));

    const themeOption1AnimatedStyle = useAnimatedStyle(() => ({
        opacity: themeOption1Opacity.value,
        transform: [{ translateX: themeOption1TranslateX.value }],
    }));

    const themeOption2AnimatedStyle = useAnimatedStyle(() => ({
        opacity: themeOption2Opacity.value,
        transform: [{ translateX: themeOption2TranslateX.value }],
    }));

    const themeOption3AnimatedStyle = useAnimatedStyle(() => ({
        opacity: themeOption3Opacity.value,
        transform: [{ translateX: themeOption3TranslateX.value }],
    }));

    // Trigger theme modal animations
    React.useEffect(() => {
        if (isThemeModalVisible) {
            // Entrance animation
            themeBackdropOpacity.value = withTiming(1, {
                duration: 400,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1)
            });
            themeSheetTranslateY.value = withSpring(0, {
                damping: 30,
                stiffness: 150
            });

            // Stagger theme options
            setTimeout(() => {
                themeOption1Opacity.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
                themeOption1TranslateX.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            }, 150);

            setTimeout(() => {
                themeOption2Opacity.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
                themeOption2TranslateX.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            }, 250);

            setTimeout(() => {
                themeOption3Opacity.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
                themeOption3TranslateX.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            }, 350);
        } else {
            // Exit animation
            themeBackdropOpacity.value = withTiming(0, { duration: 300, easing: Easing.bezier(0.4, 0.0, 0.2, 1) });
            themeSheetTranslateY.value = withTiming(400, { duration: 300, easing: Easing.bezier(0.4, 0.0, 0.2, 1) });

            // Reset options
            themeOption1Opacity.value = 0;
            themeOption1TranslateX.value = -20;
            themeOption2Opacity.value = 0;
            themeOption2TranslateX.value = -20;
            themeOption3Opacity.value = 0;
            themeOption3TranslateX.value = -20;
        }
    }, [isThemeModalVisible]);

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
                <Animated.View style={premiumAnimatedStyle}>
                    <SettingsSection title="">
                        <TouchableOpacity
                            onPress={handlePremium}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.premiumCard, { backgroundColor: '#c1cee1ff' }]}>
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
                </Animated.View>

                {/* DATA */}
                <Animated.View style={dataAnimatedStyle}>
                    <SettingsSection title="Data">
                        <SettingsRow icon="database-export" title="Export Data" onPress={handleExport} />
                        <SettingsRow icon="database-import" title="Import Data" onPress={handleImport} />
                        <SettingsRow icon="delete" title="Clear All Data" isDestructive onPress={handleClearData} />
                    </SettingsSection>
                </Animated.View>

                {/* PREFERENCES */}
                <Animated.View style={preferencesAnimatedStyle}>
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
                </Animated.View>

                {/* ABOUT */}
                <Animated.View style={aboutAnimatedStyle}>
                    <SettingsSection title="About">
                        <SettingsRow icon="information" title="Version" value="1.0.0" onPress={() => { }} />
                        <SettingsRow icon="shield-check" title="Privacy Policy" onPress={() => Linking.openURL('https://upriseix.com/PrivacyPolicy.html')} />
                        <SettingsRow icon="file-document" title="Terms of Service" onPress={() => Linking.openURL('https://upriseix.com/TC.html')} />
                    </SettingsSection>
                </Animated.View>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Loading Modal */}
            <Modal transparent visible={isLoading} animationType="fade">
                <View style={styles.loadingModalOverlay}>
                    <View style={[styles.loadingModalContent, { backgroundColor: theme.colors.card[colorScheme] }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={[styles.loadingModalText, { color: theme.colors.text.primary[colorScheme] }]}>
                            Processing Data...
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Theme Selector Modal */}
            <Modal transparent visible={isThemeModalVisible} animationType="none" onRequestClose={() => setIsThemeModalVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setIsThemeModalVisible(false)}>
                    <Animated.View style={[styles.themeModalOverlay, themeBackdropAnimatedStyle]}>
                        <TouchableWithoutFeedback>
                            <Animated.View style={[styles.themeModalContent, {
                                backgroundColor: theme.colors.card[colorScheme],
                                paddingBottom: bottom + 20,
                            }, themeSheetAnimatedStyle]}>
                                {/* Drag Handle */}
                                <View style={[styles.dragHandle, { backgroundColor: theme.colors.text.tertiary[colorScheme] }]} />

                                <Text style={[styles.chooseThemeText, { color: theme.colors.text.primary[colorScheme] }]}>
                                    Choose Theme
                                </Text>

                                {/* Light Mode */}
                                <Animated.View style={themeOption1AnimatedStyle}>
                                    <TouchableOpacity
                                        style={[styles.themeOption, {
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: theme.colors.border[colorScheme],
                                        }]}
                                        onPress={() => handleThemeSelect('light')}
                                    >
                                        <Text style={[styles.themeOptionLabel, { color: theme.colors.text.primary[colorScheme] }]}>
                                            {getThemeLabel('light')}
                                        </Text>
                                        {themeType === 'light' && (
                                            <Icon name="check" size={24} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* Dark Mode */}
                                <Animated.View style={themeOption2AnimatedStyle}>
                                    <TouchableOpacity
                                        style={[styles.themeOption, {
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: theme.colors.border[colorScheme],
                                        }]}
                                        onPress={() => handleThemeSelect('dark')}
                                    >
                                        <Text style={[styles.themeOptionLabel, { color: theme.colors.text.primary[colorScheme] }]}>
                                            {getThemeLabel('dark')}
                                        </Text>
                                        {themeType === 'dark' && (
                                            <Icon name="check" size={24} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* System Mode */}
                                <Animated.View style={themeOption3AnimatedStyle}>
                                    <TouchableOpacity
                                        style={[styles.themeOption, {
                                            borderBottomWidth: 0,
                                        }]}
                                        onPress={() => handleThemeSelect('system')}
                                    >
                                        <Text style={[styles.themeOptionLabel, { color: theme.colors.text.primary[colorScheme] }]}>
                                            {getThemeLabel('system')}
                                        </Text>
                                        {themeType === 'system' && (
                                            <Icon name="check" size={24} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
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
        fontFamily: 'poppins_bold',
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
        fontFamily: 'poppins_semibold',
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
    loadingModalText: {
        marginTop: 16,
        fontSize: moderateScale(16),
        fontWeight: '600',
        fontFamily: 'poppins_semibold',
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
        fontFamily: 'poppins_semibold',
    },
    premiumCardCaption: {
        fontSize: moderateScale(14),
        fontWeight: '300',
        fontFamily: 'poppins_light',
    },
    titleText: {
        fontSize: moderateScale(13),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
    },
    valueText: {
        fontSize: moderateScale(14),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
    },
    chooseThemeText: {
        fontSize: moderateScale(18),
        fontWeight: '500',
        fontFamily: 'poppins_medium',
    },
    themeOptionLabel: {
        fontSize: moderateScale(16),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
    },
});
