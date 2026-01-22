import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';

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
            <Card style={styles.cardRow}>
                <View style={styles.rowLeft}>
                    <Icon name={icon} size={24} color={iconColor} style={styles.icon} />
                    <Text style={[theme.typography.body, { color: textColor }]}>{title}</Text>
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
            </Card>
        </TouchableOpacity>
    );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const { theme, colorScheme } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary[colorScheme] }]}>
                {title}
            </Text>
            <View>
                {children}
            </View>
        </View>
    );
};

export const SettingsScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handlePremium = () => Alert.alert("Go Premium", "Premium flow coming soon!");
    const handleExport = () => Alert.alert("Export Data", "Export functionality coming soon.");
    const handleImport = () => Alert.alert("Import Data", "Import functionality coming soon.");
    const handleClearData = () => {
        Alert.alert(
            "Clear All Data",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => console.log("Deleted") }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
            {/* <View style={styles.header}>
                <Text style={[theme.typography.h2, { color: theme.colors.text.primary[colorScheme] }]}>
                    Settings
                </Text>
            </View> */}

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* PREMIUM */}
                <SettingsSection title="PREMIUM">
                    <TouchableOpacity
                        onPress={handlePremium}
                        activeOpacity={0.7}
                    >
                        <Card style={styles.premiumCard}>
                            <View style={styles.rowLeft}>
                                <Icon name="crown" size={24} color="#FFD700" style={styles.icon} />
                                <View>
                                    <Text style={[theme.typography.bodyBold, { color: theme.colors.text.primary[colorScheme] }]}>Go Premium</Text>
                                    <Text style={[theme.typography.caption, { color: theme.colors.text.secondary[colorScheme] }]}>Remove ads</Text>
                                </View>
                            </View>
                            {/* Chevron Removed */}
                        </Card>
                    </TouchableOpacity>
                </SettingsSection>

                {/* DATA */}
                <SettingsSection title="DATA">
                    <SettingsRow icon="database-export" title="Export Data" onPress={handleExport} />
                    <SettingsRow icon="database-import" title="Import Data" onPress={handleImport} />
                    <SettingsRow icon="delete" title="Clear All Data" isDestructive onPress={handleClearData} />
                </SettingsSection>

                {/* PREFERENCES */}
                <SettingsSection title="PREFERENCES">
                    <SettingsRow icon="theme-light-dark" title="Theme" value="Auto" onPress={() => Alert.alert("Theme", "Theme selection coming soon")} />
                    <SettingsRow
                        icon="bell"
                        title="Notifications"
                        hasToggle
                        isToggled={notificationsEnabled}
                        onToggle={setNotificationsEnabled}
                    />
                </SettingsSection>

                {/* ABOUT */}
                <SettingsSection title="ABOUT">
                    <SettingsRow icon="information" title="Version" value="1.0.0" onPress={() => { }} />
                    <SettingsRow icon="shield-check" title="Privacy Policy" onPress={() => Linking.openURL('https://example.com/privacy')} />
                    <SettingsRow icon="file-document" title="Terms of Service" onPress={() => Linking.openURL('https://example.com/terms')} />
                </SettingsSection>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
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
    },
    premiumCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        marginBottom: 12,
        minHeight: 70,
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
});
