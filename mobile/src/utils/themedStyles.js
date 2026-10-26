/**
 * themedStyles.js — Temaya duyarlı StyleSheet.
 *
 * `StyleSheet.create` dosya yüklenirken bir kez çalışır; `COLORS` sonradan
 * değişse bile stiller eski renkte kalır. Bu yüzden koyu tema yalnızca kısmen
 * uygulanıyordu. `createThemedStyles` stilleri bir fonksiyonla tanımlar ve tema
 * sürümü değiştiğinde ilk erişimde yeniden üretir:
 *
 *   const styles = createThemedStyles(() => ({
 *       card: { backgroundColor: COLORS.surface },
 *   }));
 *   // kullanım aynı: styles.card
 *
 * Tema değişince ThemeProvider `bumpThemeVersion()` çağırır ve uygulama ağacını
 * yeniden çizer; bileşenler `styles.x`'e eriştiğinde yeni renkleri alır.
 */
import { StyleSheet } from 'react-native';

let themeVersion = 0;

export const bumpThemeVersion = () => { themeVersion += 1; };

export function createThemedStyles(factory) {
    let cached = null;
    let cachedVersion = -1;
    const resolve = () => {
        if (cachedVersion !== themeVersion) {
            cached = StyleSheet.create(factory());
            cachedVersion = themeVersion;
        }
        return cached;
    };

    return new Proxy({}, {
        get: (_, key) => resolve()[key],
        has: (_, key) => key in resolve(),
        ownKeys: () => Reflect.ownKeys(resolve()),
        getOwnPropertyDescriptor: (_, key) => ({
            enumerable: true,
            configurable: true,
            value: resolve()[key],
        }),
    });
}
