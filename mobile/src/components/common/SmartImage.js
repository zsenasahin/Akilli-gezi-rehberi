/**
 * SmartImage — expo-image sarmalayıcısı.
 *
 * - Uzak adresler `normalizeImageUrl` ile kodlanır (Kültür Portalı adreslerinde
 *   boşluk ve parantez bulunur).
 * - Yükleme sırasında arka plan rengi yer tutucu görevi görür. expo-image'ın
 *   `placeholder` alanına `{ color }` gibi geçersiz bir kaynak verilmez: yeni
 *   sürümde bu, hata olayını tetikleyip asıl resmin yerine yedek resmin
 *   gösterilmesine yol açıyordu.
 * - `fallbackUri` yalnızca asıl resim gerçekten yüklenemezse kullanılır.
 * - `thumbnail` verilirse küçük sürüm yüklenir; bulunamazsa büyük sürüme geçilir.
 * - Listelerde görünüm yeniden kullanıldığında eski resmin bir anlığına
 *   görünmemesi için `recyclingKey` adres olarak verilir.
 */
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { normalizeImageUrl, thumbnailUrl } from '../../utils/imageUrl';
import { createThemedStyles } from '../../utils/themedStyles';

const SmartImage = ({
    uri,
    source,
    fallbackUri,
    style,
    contentFit = 'cover',
    transition = 250,
    thumbnail = false,
    ...rest
}) => {
    const [failed, setFailed] = useState(false);

    useEffect(() => { setFailed(false); }, [uri]);

    const original = uri ? normalizeImageUrl(uri) : null;
    const primary = thumbnail && uri ? thumbnailUrl(uri) : original;
    // Küçük sürüm yoksa önce asıl görsele, o da yoksa verilen yedeğe düş.
    const fallback = thumbnail && primary !== original
        ? original
        : (fallbackUri ? normalizeImageUrl(fallbackUri) : null);
    const resolvedUri = failed ? fallback : primary;
    const resolvedSource = source || (resolvedUri ? { uri: resolvedUri } : null);

    if (!resolvedSource) {
        return <View style={[styles.placeholder, style]} />;
    }

    return (
        <Image
            source={resolvedSource}
            style={[styles.placeholder, style]}
            contentFit={contentFit}
            transition={transition}
            cachePolicy="memory-disk"
            recyclingKey={resolvedUri || undefined}
            onError={() => {
                if (!failed && fallback && fallback !== primary) setFailed(true);
            }}
            {...rest}
        />
    );
};

const styles = createThemedStyles(() => ({
    placeholder: {
        backgroundColor: COLORS.surfaceAlt,
    },
}));

export default SmartImage;
