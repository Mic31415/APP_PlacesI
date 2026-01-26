import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useMemo,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTheme, Theme, ColorScheme } from './index';

// Define theme types
export type ThemeType = "light" | "dark" | "system";

// Create context
export interface ThemeContextType {
    theme: Theme;
    colorScheme: ColorScheme;
    themeType: ThemeType;
    setAppTheme: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: createTheme('light'),
    colorScheme: 'light',
    themeType: 'system',
    setAppTheme: () => { },
});

// Create provider
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const systemColorScheme = useColorScheme();
    const [themeType, setThemeType] = useState<ThemeType>("system");
    const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

    // Load saved theme from AsyncStorage on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem("appTheme");
                if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
                    setThemeType(savedTheme as ThemeType);
                }
            } catch (error) {
                console.error("Failed to load theme from AsyncStorage:", error);
            }
        };
        loadTheme();
    }, []);

    // Update colorScheme when themeType or systemColorScheme changes
    useEffect(() => {
        if (themeType === 'system') {
            setColorScheme(systemColorScheme === 'dark' ? 'dark' : 'light');
        } else {
            setColorScheme(themeType as ColorScheme);
        }
    }, [themeType, systemColorScheme]);

    // Create theme object using the centralized createTheme function
    const theme = useMemo(() => {
        return createTheme(colorScheme);
    }, [colorScheme]);

    const setAppTheme = async (type: ThemeType) => {
        try {
            await AsyncStorage.setItem("appTheme", type);
            setThemeType(type);
        } catch (error) {
            console.error("Failed to save theme to AsyncStorage:", error);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, colorScheme, themeType, setAppTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Create hook
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

export default ThemeContext;
