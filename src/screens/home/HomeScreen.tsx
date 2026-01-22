import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/ThemeContext';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { MapCard } from '../../components/home/MapCard';
import { EmptyState } from '../../components/common/EmptyState';
import { FloatingButton } from '../../components/common/FloatingButton';
import { getResponsiveValue } from '../../utils/responsive';
import { MainTabParamList } from '../../types/navigation';

// Mock Data
const MOCK_MAPS = [
    { id: '1', name: 'Travel Bucket List', emoji: '🌎', pinCount: 12, type: 'Travel' },
    { id: '2', name: 'Favorite Ramen Spots', emoji: '🍜', pinCount: 5, type: 'Food' },
    { id: '3', name: 'Hiking Trails', emoji: '🥾', pinCount: 8, type: 'Activity' },
];

type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { theme, colorScheme } = useTheme();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [maps, setMaps] = useState(MOCK_MAPS);

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

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background[colorScheme] }]}>
            <ScreenHeader title="My Maps" />

            <FlatList
                data={maps}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MapCard
                        map={item}
                        onPress={() => handleMapPress(item.id)}
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
