import { TextStyle } from 'react-native';

export interface TypographyStyle extends TextStyle {
    fontSize: number;
    fontWeight: TextStyle['fontWeight'];
    lineHeight: number;
}

export const typography: Record<string, TypographyStyle> = {
    h1: {
        fontSize: 34,
        fontWeight: '700',
        lineHeight: 41,
    },
    h2: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 34,
    },
    h3: {
        fontSize: 22,
        fontWeight: '600',
        lineHeight: 28,
    },
    h4: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 25,
    },
    body: {
        fontSize: 17,
        fontWeight: '400',
        lineHeight: 22,
    },
    bodyBold: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 22,
    },
    caption: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    captionBold: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    small: {
        fontSize: 11,
        fontWeight: '400',
        lineHeight: 13,
    },
    button: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 22,
    },
};
