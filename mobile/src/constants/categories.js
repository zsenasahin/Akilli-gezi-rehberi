/**
 * Place category definitions used across the app.
 * Each entry has a label, icon (Ionicons), and tint color.
 */
export const CATEGORIES = [
    { key: 'all', label: 'Tümü', icon: 'grid-outline', color: '#6E5A47' },
    { key: 'historical', label: 'Tarihi', icon: 'time-outline', color: '#9C7230' },
    { key: 'museum', label: 'Müze', icon: 'business-outline', color: '#7A5C42' },
    { key: 'nature', label: 'Doğa', icon: 'leaf-outline', color: '#4F6342' },
    { key: 'beach', label: 'Plaj', icon: 'sunny-outline', color: '#0EA5E9' },
    { key: 'religious', label: 'Dini', icon: 'moon-outline', color: '#8B6B4E' },
    { key: 'shopping', label: 'Alışveriş', icon: 'cart-outline', color: '#A86A5A' },
    { key: 'food', label: 'Yemek', icon: 'restaurant-outline', color: '#B87B4F' },
    { key: 'artificial', label: 'Yapay', icon: 'construct-outline', color: '#64748B' },
];

/**
 * Get category config by key.
 * @param {string} key
 * @returns {object|undefined}
 */
export const getCategoryByKey = (key) =>
    CATEGORIES.find((c) => c.key === key);
