import { TextStyle } from 'react-native';
import { moderateScale } from '../utils/responsive';

export interface TypographyStyle extends TextStyle {
    fontSize: number;
    fontWeight: TextStyle['fontWeight'];
    lineHeight: number;
}

export const typography: Record<string, TypographyStyle> = {
    h1: {
        fontSize: moderateScale(30),
        fontWeight: '700',
        lineHeight: moderateScale(41),
    },
    h2: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        lineHeight: moderateScale(30),
    },
    h3: {
        fontSize: moderateScale(22),
        fontWeight: '700',
        lineHeight: moderateScale(28),
    },
    h4: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        lineHeight: moderateScale(25),
    },
    body: {
        fontSize: moderateScale(16),
        fontWeight: '300',
        lineHeight: moderateScale(20),
    },
    bodyBold: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        lineHeight: moderateScale(22),
    },
    caption: {
        fontSize: moderateScale(13),
        fontWeight: '400',
        lineHeight: moderateScale(18),
    },
    captionBold: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        lineHeight: moderateScale(18),
    },
    small: {
        fontSize: moderateScale(11),
        fontWeight: '400',
        lineHeight: moderateScale(13),
    },
    button: {
        fontSize: moderateScale(17),
        fontWeight: '500',
        lineHeight: moderateScale(22),
    },
};
