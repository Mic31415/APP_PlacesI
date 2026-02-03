import React, { useState } from 'react';
import {
    TextInput as RNTextInput,
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { moderateScale } from '../../utils/responsive';

interface TextInputProps extends RNTextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    showCharacterCount?: boolean;
    maxLength?: number;
}

export const TextInput: React.FC<TextInputProps> = ({
    label,
    error,
    containerStyle,
    showCharacterCount = false,
    maxLength,
    value,
    ...props
}) => {
    const { theme, colorScheme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const inputStyle = [
        styles.input,
        {
            backgroundColor: theme.colors.surface[colorScheme],
            borderWidth: 1.5,
            borderColor: error
                ? theme.colors.error
                : isFocused
                    ? theme.colors.primary
                    : theme.colors.border[colorScheme],
            borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            color: theme.colors.text.primary[colorScheme],
        }
    ];

    return (
        <View style={containerStyle}>
            {label && (
                <Text
                    style={[
                        styles.label,
                        {
                            color: theme.colors.text.secondary[colorScheme],
                            marginBottom: theme.spacing.xs,
                        }
                    ]}
                >
                    {label}
                </Text>
            )}

            <RNTextInput
                style={inputStyle}
                placeholderTextColor={theme.colors.text.tertiary[colorScheme]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                maxLength={maxLength}
                value={value}
                {...props}
            />

            {(error || (showCharacterCount && maxLength)) && (
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: theme.spacing.xs,
                    }}
                >
                    {error && (
                        <Text
                            style={[
                                styles.errorText,
                                {
                                    color: theme.colors.error,
                                }
                            ]}
                        >
                            {error}
                        </Text>
                    )}
                    {showCharacterCount && maxLength && (
                        <Text
                            style={[
                                styles.charCountText,
                                {
                                    color: theme.colors.text.tertiary[colorScheme],
                                    marginLeft: 'auto',
                                }
                            ]}
                        >
                            {value?.length || 0}/{maxLength}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    input: {
        fontSize: moderateScale(14),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
        minHeight: 44,
    },
    label: {
        fontSize: moderateScale(12),
        fontWeight: '600',
        fontFamily: 'poppins_semibold',
    },
    errorText: {
        fontSize: moderateScale(12),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
    },
    charCountText: {
        fontSize: moderateScale(12),
        fontWeight: '400',
        fontFamily: 'poppins_regular',
    },
});
