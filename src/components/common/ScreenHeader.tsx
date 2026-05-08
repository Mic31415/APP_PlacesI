import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getResponsiveValue, moderateScale } from '../../utils/responsive';

interface ScreenHeaderProps {
    leftComponent?: React.ReactNode;
    centerComponent?: React.ReactNode;
    rightComponent?: React.ReactNode;
    safeAreaTop?: boolean;
    paddingX?: number;
    paddingY?: number;
    backgroundColor?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    leftComponent,
    centerComponent,
    rightComponent,
    safeAreaTop = true,
    paddingX,
    paddingY,
    backgroundColor,
}) => {
    const { theme, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();

    const containerStyle = {
        backgroundColor: backgroundColor || theme.colors.background[colorScheme],
        paddingTop: safeAreaTop ? insets.top : 0,
        paddingHorizontal: paddingX !== undefined ? paddingX : theme.spacing.lg,
        paddingBottom: paddingY !== undefined ? paddingY : theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border[colorScheme],
    };
    const sideWidth = getResponsiveValue(40, 40, 44, 56);
    const normalizedCenterComponent = React.isValidElement(centerComponent)
        ? React.cloneElement(centerComponent as React.ReactElement<any>, {
            style: [
                (centerComponent as React.ReactElement<any>).props.style,
                styles.headerTitle,
            ],
        })
        : centerComponent;

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={styles.content}>
                <View style={[styles.leftComponent, { minWidth: sideWidth }]}>
                    {leftComponent}
                </View>

                <View style={[styles.centerComponent, { flex: 1, alignItems: 'center' }]}>
                    {normalizedCenterComponent}
                </View>

                <View style={[styles.rightComponent, { minWidth: sideWidth, alignItems: 'flex-end' }]}>
                    {rightComponent}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftComponent: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 1,
    },
    centerComponent: {
        justifyContent: 'center',
        zIndex: 0,
    },
    rightComponent: {
        justifyContent: 'center',
        zIndex: 1,
    },
    headerTitle: {
        fontSize: getResponsiveValue(
            moderateScale(20),
            moderateScale(20),
            moderateScale(20),
            30,
        ),
        lineHeight: getResponsiveValue(
            moderateScale(26),
            moderateScale(26),
            moderateScale(26),
            38,
        ),
    },
});
