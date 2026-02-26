/**
 * Formatting utilities.
 */

/**
 * Format a number as Turkish Lira currency.
 * @param {number} amount
 * @returns {string} e.g. "₺125.00"
 */
export const formatCurrency = (amount) => {
    if (amount == null) return '₺0';
    return `₺${Number(amount).toFixed(2)}`;
};

/**
 * Format hours into a human-readable string.
 * @param {number} hours
 * @returns {string} e.g. "2 saat" or "1.5 saat"
 */
export const formatDuration = (hours) => {
    if (!hours) return '—';
    return `${hours} saat`;
};

/**
 * Format a date string (ISO) into a short local date.
 * @param {string} isoDate
 * @returns {string} e.g. "17.02.2026"
 */
export const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('tr-TR');
};
