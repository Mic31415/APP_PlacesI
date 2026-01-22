import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/ThemeContext';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { databaseService, MapData } from '../../services/DatabaseService';
import { MapCard } from '../../components/home/MapCard';
import { EmptyState } from '../../components/common/EmptyState';
import { FloatingButton } from '../../components/common/FloatingButton';
import { getResponsiveValue } from '../../utils/responsive';
import { MainTabParamList } from '../../types/navigation';

// Mock Data removed
// import { useFocusEffect } from '@react-navigation/native';
// import { databaseService, MapData } from '../../services/DatabaseService';

// ... imports

type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    // Initialize with empty array
    const [maps, setMaps] = useState<MapData[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            const loadMaps = async () => {
                try {
                    const fetchedMaps = await databaseService.getMaps();
                    setMaps(fetchedMaps);
                } catch (error) {
                    console.error('Failed to load maps:', error);
                }
            };
            loadMaps();
        }, [])
    );

    // Responsive Layout: 1 column on mobile, 2 on tablet
    const numColumns = getResponsiveValue(1, 1, 2, 2);

    const handleCreateMap = () => {
        // Navigate to Create Tab
        navigation.navigate('Create');
    };

    const handleMapPress = (mapId: string) => {
        // @ts-ignore - navigation types are tricky with nested stacks, forcing consistent nav for now
        navigation.navigate('MapView', { mapId });
    };

    const handleDeleteMap = useCallback((map: MapData) => {
        Alert.alert(
            'Delete Map',
            `Are you sure you want to delete "${map.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await databaseService.deleteMap(map.id);
                            // Optimistic update or refresh
                            const updatedMaps = maps.filter(m => m.id !== map.id);
                            setMaps(updatedMaps);
                        } catch (error) {
                            console.error('Failed to delete map:', error);
                            Alert.alert('Error', 'Failed to delete map.');
                        }
                    }
                }
            ]
        );
    }, [maps]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
            <ScreenHeader
                leftComponent={
                    <Text style={[theme.typography.h3, { color: theme.colors.text.primary[colorScheme] }]}>
                        My Maps
                    </Text>
                }
            />

            <FlatList
                data={maps}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MapCard
                        map={item}
                        onPress={() => handleMapPress(item.id)}
                        onLongPress={() => handleDeleteMap(item)}
                        style={{ flex: 1, margin: theme.spacing.sm }}
                    />
                )}
                numColumns={numColumns}
                key={numColumns} // Force re-render on column change
                contentContainerStyle={{ padding: theme.spacing.sm, paddingBottom: 80 }} // Add padding for FAB
                ListEmptyComponent={
                    <EmptyState
                        title="No Maps Yet"
                        description="Create your first map to start pinning your favorite places!"
                        actionLabel="Create Map"
                        onAction={handleCreateMap}
                    />
                }
            />

            <FloatingButton onPress={handleCreateMap} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
