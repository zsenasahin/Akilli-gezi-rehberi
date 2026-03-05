/**
 * weatherService.js — Open-Meteo hava durumu servisi
 *
 * Tamamen ücretsiz, API key gerektirmez.
 * https://open-meteo.com/
 */

import { getCityCenter } from '../constants/cities';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO hava kodu → emoji + Türkçe açıklama
const WMO_CODES = {
    0: { emoji: '☀️', label: 'Açık' },
    1: { emoji: '🌤️', label: 'Az Bulutlu' },
    2: { emoji: '⛅', label: 'Parçalı Bulutlu' },
    3: { emoji: '☁️', label: 'Bulutlu' },
    45: { emoji: '🌫️', label: 'Sisli' },
    48: { emoji: '🌫️', label: 'Kırağılı Sis' },
    51: { emoji: '🌦️', label: 'Hafif Çisenti' },
    53: { emoji: '🌦️', label: 'Çisenti' },
    55: { emoji: '🌧️', label: 'Yoğun Çisenti' },
    61: { emoji: '🌧️', label: 'Hafif Yağmur' },
    63: { emoji: '🌧️', label: 'Yağmurlu' },
    65: { emoji: '🌧️', label: 'Kuvvetli Yağmur' },
    71: { emoji: '🌨️', label: 'Hafif Kar' },
    73: { emoji: '❄️', label: 'Karlı' },
    75: { emoji: '❄️', label: 'Yoğun Kar' },
    77: { emoji: '🌨️', label: 'Taneli Kar' },
    80: { emoji: '🌦️', label: 'Sağanak' },
    81: { emoji: '🌧️', label: 'Kuvvetli Sağanak' },
    82: { emoji: '⛈️', label: 'Şiddetli Sağanak' },
    85: { emoji: '🌨️', label: 'Kar Sağanağı' },
    86: { emoji: '❄️', label: 'Yoğun Kar Sağanağı' },
    95: { emoji: '⛈️', label: 'Fırtına' },
    96: { emoji: '⛈️', label: 'Dolu ile Fırtına' },
    99: { emoji: '⛈️', label: 'Şiddetli Fırtına' },
};

const getWeatherInfo = (code) =>
    WMO_CODES[code] ?? { emoji: '🌡️', label: 'Bilinmiyor' };

/**
 * Belirtilen şehir için 5 günlük hava durumu tahminini çeker.
 * @param {string} cityName
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export const getWeatherForecast = async (cityName) => {
    try {
        const { lat, lng } = getCityCenter(cityName);

        const params = new URLSearchParams({
            latitude: lat,
            longitude: lng,
            daily: [
                'weathercode',
                'temperature_2m_max',
                'temperature_2m_min',
                'precipitation_probability_max',
            ].join(','),
            timezone: 'Europe/Istanbul',
            forecast_days: 5,
        });

        const res = await fetch(`${BASE_URL}?${params}`);
        if (!res.ok) throw new Error('API hatası');
        const json = await res.json();

        const { daily } = json;
        const forecast = daily.time.map((date, i) => ({
            date,
            code: daily.weathercode[i],
            ...getWeatherInfo(daily.weathercode[i]),
            tempMax: Math.round(daily.temperature_2m_max[i]),
            tempMin: Math.round(daily.temperature_2m_min[i]),
            rainChance: daily.precipitation_probability_max[i],
        }));

        return { data: forecast, error: null };
    } catch (err) {
        return { data: null, error: err.message };
    }
};

/**
 * Tarih stringini Türkçe kısa formata çevirir.
 * "2026-03-04" → "4 Mar"
 */
export const formatWeatherDate = (dateStr) => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
        'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]}`;
};

/**
 * Tarihin gün adını döndürür.
 * "2026-03-04" → "Bugün" veya "Yarın" veya "Çar"
 */
export const getDayLabel = (dateStr) => {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const today = new Date();
    const d = new Date(dateStr);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Bugün';
    if (dateStr === tomorrowStr) return 'Yarın';
    return days[d.getDay()];
};
