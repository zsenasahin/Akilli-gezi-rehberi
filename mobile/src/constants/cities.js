/**
 * Centralized city data used across the app.
 * Türkiye'nin 81 ili — Open-Meteo hava durumu ve harita için koordinatlar.
 */

/** Map default coordinates for each supported city. */
export const CITY_CENTERS = {
    // ─── Marmara ───
    İstanbul: { lat: 41.0082, lng: 28.9784 },
    Bursa: { lat: 40.1824, lng: 29.0669 },
    Kocaeli: { lat: 40.8533, lng: 29.8815 },
    Sakarya: { lat: 40.6940, lng: 30.4358 },
    Tekirdağ: { lat: 40.9781, lng: 27.5117 },
    Edirne: { lat: 41.6818, lng: 26.5623 },
    Kırklareli: { lat: 41.7333, lng: 27.2167 },
    Çanakkale: { lat: 40.1553, lng: 26.4142 },
    Balıkesir: { lat: 39.6484, lng: 27.8826 },
    Yalova: { lat: 40.6500, lng: 29.2667 },
    Bilecik: { lat: 40.1500, lng: 29.9833 },

    // ─── Ege ───
    İzmir: { lat: 38.4192, lng: 27.1287 },
    Manisa: { lat: 38.6191, lng: 27.4289 },
    Aydın: { lat: 37.8444, lng: 27.8458 },
    Denizli: { lat: 37.7765, lng: 29.0864 },
    Muğla: { lat: 37.2153, lng: 28.3636 },
    Bodrum: { lat: 37.0344, lng: 27.4305 },
    Uşak: { lat: 38.6823, lng: 29.4082 },
    Afyonkarahisar: { lat: 38.7507, lng: 30.5567 },
    Kütahya: { lat: 39.4167, lng: 29.9833 },

    // ─── İç Anadolu ───
    Ankara: { lat: 39.9208, lng: 32.8541 },
    Konya: { lat: 37.8746, lng: 32.4932 },
    Kayseri: { lat: 38.7312, lng: 35.4787 },
    Sivas: { lat: 39.7477, lng: 37.0179 },
    Yozgat: { lat: 39.8181, lng: 34.8147 },
    Kırıkkale: { lat: 39.8468, lng: 33.5153 },
    Aksaray: { lat: 38.3687, lng: 34.0370 },
    Niğde: { lat: 37.9667, lng: 34.6833 },
    Nevşehir: { lat: 38.6939, lng: 34.6857 },
    Kapadokya: { lat: 38.6431, lng: 34.8289 },
    Kırşehir: { lat: 39.1425, lng: 34.1709 },
    Eskişehir: { lat: 39.7667, lng: 30.5256 },
    Çankırı: { lat: 40.6013, lng: 33.6134 },

    // ─── Karadeniz ───
    Trabzon: { lat: 41.0027, lng: 39.7168 },
    Samsun: { lat: 41.2928, lng: 36.3313 },
    Ordu: { lat: 40.9860, lng: 37.8797 },
    Giresun: { lat: 40.9128, lng: 38.3895 },
    Rize: { lat: 41.0201, lng: 40.5234 },
    Artvin: { lat: 41.1828, lng: 41.8183 },
    Gümüşhane: { lat: 40.4386, lng: 39.4814 },
    Bayburt: { lat: 40.2552, lng: 40.2249 },
    Amasya: { lat: 40.6499, lng: 35.8353 },
    Tokat: { lat: 40.3167, lng: 36.5500 },
    Sinop: { lat: 42.0231, lng: 35.1531 },
    Bartın: { lat: 41.6358, lng: 32.3375 },
    Karabük: { lat: 41.2061, lng: 32.6204 },
    Zonguldak: { lat: 41.4535, lng: 31.7987 },
    Bolu: { lat: 40.7396, lng: 31.6060 },
    Düzce: { lat: 40.8438, lng: 31.1565 },
    Kastamonu: { lat: 41.3887, lng: 33.7827 },

    // ─── Akdeniz ───
    Antalya: { lat: 36.8969, lng: 30.7133 },
    Mersin: { lat: 36.8121, lng: 34.6415 },
    Adana: { lat: 37.0000, lng: 35.3213 },
    Hatay: { lat: 36.2025, lng: 36.1606 },
    Isparta: { lat: 37.7648, lng: 30.5566 },
    Burdur: { lat: 37.7265, lng: 30.2906 },

    // ─── Güneydoğu Anadolu ───
    Gaziantep: { lat: 37.0662, lng: 37.3833 },
    Şanlıurfa: { lat: 37.1591, lng: 38.7969 },
    Diyarbakır: { lat: 37.9144, lng: 40.2306 },
    Mardin: { lat: 37.3212, lng: 40.7245 },
    Şırnak: { lat: 37.5164, lng: 42.4611 },
    Siirt: { lat: 37.9333, lng: 41.9500 },
    Batman: { lat: 37.8812, lng: 41.1351 },
    Adıyaman: { lat: 37.7648, lng: 38.2786 },
    Kilis: { lat: 36.7184, lng: 37.1212 },

    // ─── Doğu Anadolu ───
    Erzurum: { lat: 39.9000, lng: 41.2700 },
    Erzincan: { lat: 39.7500, lng: 39.5000 },
    Malatya: { lat: 38.3552, lng: 38.3095 },
    Elazığ: { lat: 38.6810, lng: 39.2264 },
    Tunceli: { lat: 39.1079, lng: 39.5480 },
    Bingöl: { lat: 38.8854, lng: 40.4983 },
    Muş: { lat: 38.7432, lng: 41.4914 },
    Bitlis: { lat: 38.4015, lng: 42.1232 },
    Van: { lat: 38.4891, lng: 43.4089 },
    Hakkari: { lat: 37.5744, lng: 43.7408 },
    Ağrı: { lat: 39.7191, lng: 43.0503 },
    Iğdır: { lat: 39.9167, lng: 44.0333 },
    Ardahan: { lat: 41.1105, lng: 42.7022 },
    Kars: { lat: 40.6013, lng: 43.0975 },

    // ─── Alternatif / popüler isimler ───
    'Kahramanmaraş': { lat: 37.5753, lng: 36.9228 },
    Maraş: { lat: 37.5753, lng: 36.9228 },
    Urfa: { lat: 37.1591, lng: 38.7969 },
    Antep: { lat: 37.0662, lng: 37.3833 },
};

/** Fallback coordinates when a city is not in the map. */
export const DEFAULT_CITY_CENTER = CITY_CENTERS.İstanbul;

/**
 * Get the center coordinates for a city by name.
 * Falls back to Istanbul if the city is not found.
 *
 * @param {string} cityName
 * @returns {{ lat: number, lng: number }}
 */
export const getCityCenter = (cityName) =>
    CITY_CENTERS[cityName] ?? DEFAULT_CITY_CENTER;
