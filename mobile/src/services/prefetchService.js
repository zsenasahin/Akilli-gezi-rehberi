import { getCities } from '../data/repositories/cityRepository';
import { getPlacesByCity } from '../data/repositories/placeRepository';
import { getPlaceSummary } from './wikipediaService';
import { cache } from './cacheService';

/**
 * PrefetchService — Uygulama açılışında verileri arka planda yükler.
 * Kullanıcı şehri seçtiğinde verinin hazır (cache'lenmiş) olmasını sağlar.
 */

let isInitialized = false;

export const initPrefetch = async () => {
    if (isInitialized) return;
    isInitialized = true;

    try {
        console.log('[Prefetch] Başlatılıyor...');

        // 1. Tüm şehirleri çek (ve cache'le)
        const { data: cities } = await getCities();
        if (!cities || cities.length === 0) return;

        // 2. İlk 5 popüler şehri hemen çek, diğerlerini zamana yay
        const priorityCities = cities.slice(0, 5);
        const remainingCities = cities.slice(5);

        // Öncelikli şehirler (Likit yükleme)
        for (const city of priorityCities) {
            preloadCityData(city);
        }

        // Kalan şehirler (Gecikmeli yükleme — ana thread'i yormamak için)
        setTimeout(() => {
            remainingCities.forEach((city, index) => {
                setTimeout(() => {
                    preloadCityData(city);
                }, index * 2000); // Her 2 saniyede bir şehir
            });
        }, 5000);

    } catch (err) {
        console.warn('[Prefetch] Hata:', err);
    }
};

/**
 * Belirli bir şehir için yerleri ve açıklamayı arka planda yükler
 */
const preloadCityData = async (city) => {
    if (!city || !city.id || !city.name) return;
    
    try {
        // Yerleri çek
        await getPlacesByCity(city.id);
        
        // Wikipedia açıklamasını çek
        await getPlaceSummary(city.name);
    } catch (err) {
        // Sessizce geç
    }
};
