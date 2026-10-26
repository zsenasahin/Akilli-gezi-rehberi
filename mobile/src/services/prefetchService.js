import { getCities } from '../data/repositories/cityRepository';

/**
 * PrefetchService — Uygulama açılışında yalnızca hafif ve her ekranda gereken
 * veriyi (şehir listesi) önceden alır.
 *
 * Önceki sürüm açılışta 81 şehrin tamamının yerlerini (~180 KB/şehir, toplam
 * ~14 MB) indirip AsyncStorage'a yazmaya ve her şehir için Wikipedia'ya istek
 * atmaya çalışıyordu. Android'de AsyncStorage sınırı 6 MB olduğu için depolama
 * doluyor, önbellek tamamen silinip iş baştan başlıyordu; bu sırada JavaScript
 * iş parçacığı dakikalarca meşgul kaldığı için açılan ekranlarda resimler hiç
 * yüklenmiyordu. Şehrin yerleri artık o şehir açıldığında tek sorguyla gelir.
 */

let isInitialized = false;

export const initPrefetch = () => {
    if (isInitialized) return;
    isInitialized = true;

    // İlk ekran çizildikten sonra çalışsın
    setTimeout(() => {
        getCities().catch(() => { /* çevrimdışıysa önbellekteki liste kullanılır */ });
    }, 1500);
};
