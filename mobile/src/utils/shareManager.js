/**
 * shareManager — Deep Link ve Paylaşım Yöneticisi
 *
 * Gezi planlarını smarttravelguide://itinerary/{id} formatında paylaşır.
 */
import { Share } from 'react-native';
import { formatDayMonthWeekday } from './dateUtils';

/**
 * Deep link URL üretir.
 * @param {string} itineraryId - Supabase itineraries.id (UUID)
 * @returns {string} "smarttravelguide://itinerary/{itineraryId}"
 */
export const buildDeepLink = (itineraryId) => {
    return `smarttravelguide://itinerary/${itineraryId}`;
};

/**
 * Gün gün okunabilir program metni üretir. Alıcının uygulaması olmasa bile
 * (veya plan ona ait olmadığı için deep link açılamasa bile) program okunabilir.
 * @param {Array<{ day: number, date?: string, items: Array }>} dayGroups
 */
export const buildPlanText = (dayGroups = []) => dayGroups
    .filter(group => group.items?.length)
    .map(group => {
        const title = `Gün ${group.day}${group.date ? ` · ${formatDayMonthWeekday(group.date)}` : ''}`;
        const lines = group.items.map((item, index) => {
            const time = item.timing?.arrivalTime ? `${item.timing.arrivalTime} ` : `${index + 1}. `;
            return `  ${time}${item.places?.name || 'Durak'}`;
        });
        return [title, ...lines].join('\n');
    })
    .join('\n\n');

/**
 * Paylaşım mesajı üretir.
 * @param {{ cityName: string, days: number, itineraryId: string, dayGroups?: Array, transportLabel?: string }} params
 * @returns {string}
 */
export const buildShareMessage = ({ cityName, days, itineraryId, dayGroups, transportLabel }) => {
    const link = buildDeepLink(itineraryId);
    const planText = buildPlanText(dayGroups);
    return (
        `🗺️ ${cityName} Gezi Rotam\n\n` +
        `📅 ${days} günlük plan${transportLabel ? ` · ${transportLabel}` : ''}\n\n` +
        (planText ? `${planText}\n\n` : '') +
        `Akıllı Gezi Rehberi'nde görüntüle:\n${link}`
    );
};

/**
 * Sistem paylaşım diyaloğunu açar.
 * @param {{ cityName: string, days: number, itineraryId: string, dayGroups?: Array, transportLabel?: string }} params
 */
export const shareItinerary = async (params) => {
    try {
        const message = buildShareMessage(params);
        await Share.share({ message });
    } catch (error) {
        console.error('Share error:', error);
    }
};
