import { TextStyle } from 'react-native';
import { moderateScale } from '../utils/responsive';

export interface TypographyStyle extends TextStyle {
    fontSize: number;
    fontWeight: TextStyle['fontWeight'];
    lineHeight: number;
    fontFamily?: string;
}

export const typography: Record<string, TypographyStyle> = {
    h1: {
        fontSize: moderateScale(30),
        fontWeight: '700',
        lineHeight: moderateScale(41),
        fontFamily: 'poppins_bold',
    },
    h2: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        lineHeight: moderateScale(30),
        fontFamily: 'poppins_bold',
    },
    h3: {
        fontSize: moderateScale(22),
        fontWeight: '700',
        lineHeight: moderateScale(28),
        fontFamily: 'poppins_bold',
    },
    h4: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        lineHeight: moderateScale(25),
        fontFamily: 'poppins_bold',
    },
    body: {
        fontSize: moderateScale(16),
        fontWeight: '300',
        lineHeight: moderateScale(20),
        fontFamily: 'poppins_light',
    },
    bodyBold: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        lineHeight: moderateScale(22),
        fontFamily: 'poppins_semibold',
    },
    caption: {
        fontSize: moderateScale(13),
        fontWeight: '400',
        lineHeight: moderateScale(18),
        fontFamily: 'poppins_regular',
    },
    captionBold: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        lineHeight: moderateScale(18),
        fontFamily: 'poppins_semibold',
    },
    small: {
        fontSize: moderateScale(11),
        fontWeight: '400',
        lineHeight: moderateScale(13),
        fontFamily: 'poppins_regular',
    },
    button: {
        fontSize: moderateScale(17),
        fontWeight: '500',
        lineHeight: moderateScale(22),
        fontFamily: 'poppins_medium',
    },
};
