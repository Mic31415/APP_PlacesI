import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, Theme, ColorScheme } from './index';

interface ThemeContextType {
    theme: Theme;
    colorScheme: ColorScheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const colorScheme: ColorScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
    const theme = createTheme(colorScheme);

    return (
        <ThemeContext.Provider value={{ theme, colorScheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
