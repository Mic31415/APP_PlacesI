import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AppConfig } from '../../config';
import { useTheme } from '../../theme/ThemeContext';
import { getNonPersonalizedFlag } from '../../helpers/adConsent';

interface BannerAdProps {
    size?: BannerAdSize;
}

export const BannerAdView: React.FC<BannerAdProps> = ({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }) => {
    const { theme, colorScheme } = useTheme();
    const [adLoaded, setAdLoaded] = useState(false);

    const adUnitId = __DEV__
        ? TestIds.BANNER
        : Platform.select({
            ios: AppConfig.admob.bannerIOS,
            android: AppConfig.admob.bannerAndroid,
        }) || TestIds.BANNER;

    return (
        <View style={[
            styles.container,
            {
                // backgroundColor: theme.colors.background[colorScheme], // Removed to avoid black bars
                height: adLoaded ? 'auto' : 0,
                overflow: 'hidden'
            }
        ]}>
            <BannerAd
                unitId={adUnitId}
                size={size}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: getNonPersonalizedFlag(),
                }}
                onAdLoaded={() => setAdLoaded(true)}
                onAdFailedToLoad={(error) => {
                    console.error('Banner Ad failed to load', error);
                    setAdLoaded(false);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
});
