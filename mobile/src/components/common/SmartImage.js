/**
 * SmartImage — expo-image wrapper with consistent cache & placeholder settings.
 *
 * Resimler Expo Go'da bazen yüklenmiyorsa:
 * 1. Network izni / SSL sorununa karşı cachePolicy="memory-disk"
 * 2. Yüklenmezse placeholder gösterir
 * 3. İsteğe bağlı fallbackUri ile yedek resim
 */
import React, { useState } from 'react';
import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const SmartImage = ({
    uri,
    fallbackUri,
    style,
    contentFit = 'cover',
    transition = 300,
    ...rest
}) => {
    const [failed, setFailed] = useState(false);

    const source = failed
        ? (fallbackUri ? { uri: fallbackUri } : null)
        : { uri };

    if (!source) {
        return <View style={[styles.placeholder, style]} />;
    }

    return (
        <Image
            source={source}
            style={style}
            contentFit={contentFit}
            transition={transition}
            cachePolicy="memory-disk"
            placeholder={{ color: COLORS.surfaceWarm }}
            onError={() => {
                if (!failed && fallbackUri) setFailed(true);
            }}
            {...rest}
        />
    );
};

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: COLORS.surfaceWarm,
    },
});

export default SmartImage;
