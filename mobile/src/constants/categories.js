/**
 * Place category definitions used across the app.
 * Each entry has a label, icon (Ionicons), and tint color.
 */
export const CATEGORIES = [
    { key: 'all', label: 'Tümü', icon: 'grid-outline', color: '#6366F1' },
    { key: 'historical', label: 'Tarihi', icon: 'time-outline', color: '#D97706' },
    { key: 'museum', label: 'Müze', icon: 'business-outline', color: '#7C3AED' },
    { key: 'nature', label: 'Doğa', icon: 'leaf-outline', color: '#059669' },
    { key: 'beach', label: 'Plaj', icon: 'sunny-outline', color: '#0EA5E9' },
    { key: 'religious', label: 'Dini', icon: 'moon-outline', color: '#8B5CF6' },
    { key: 'shopping', label: 'Alışveriş', icon: 'cart-outline', color: '#EC4899' },
    { key: 'food', label: 'Yemek', icon: 'restaurant-outline', color: '#F97316' },
    { key: 'artificial', label: 'Yapay', icon: 'construct-outline', color: '#64748B' },
];

/**
 * Get category config by key.
 * @param {string} key
 * @returns {object|undefined}
 */
export const getCategoryByKey = (key) =>
    CATEGORIES.find((c) => c.key === key);
