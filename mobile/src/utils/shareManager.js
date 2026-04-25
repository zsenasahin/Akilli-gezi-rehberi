/**
 * shareManager — Deep Link ve Paylaşım Yöneticisi
 *
 * Gezi planlarını smarttravelguide://itinerary/{id} formatında paylaşır.
 */
import { Share } from 'react-native';

/**
 * Deep link URL üretir.
 * @param {string} itineraryId - Supabase itineraries.id (UUID)
 * @returns {string} "smarttravelguide://itinerary/{itineraryId}"
 */
export const buildDeepLink = (itineraryId) => {
    return `smarttravelguide://itinerary/${itineraryId}`;
};

/**
 * Paylaşım mesajı üretir.
 * @param {{ cityName: string, days: number, itineraryId: string }} params
 * @returns {string}
 */
export const buildShareMessage = ({ cityName, days, itineraryId }) => {
    const link = buildDeepLink(itineraryId);
    return (
        `🗺️ ${cityName} Gezi Rotam\n\n` +
        `📅 ${days} günlük plan\n\n` +
        `Akıllı Gezi Rehberi'nde görüntüle:\n${link}`
    );
};

/**
 * Sistem paylaşım diyaloğunu açar.
 * @param {{ cityName: string, days: number, itineraryId: string }} params
 */
export const shareItinerary = async ({ cityName, days, itineraryId }) => {
    try {
        const message = buildShareMessage({ cityName, days, itineraryId });
        await Share.share({ message });
    } catch (error) {
        console.error('Share error:', error);
    }
};
