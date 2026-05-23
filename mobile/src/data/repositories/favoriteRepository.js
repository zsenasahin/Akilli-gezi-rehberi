import AsyncStorage from '@react-native-async-storage/async-storage';

const getFavoritesKey = (userId) => `@favorites_${userId}`;

export const getFavorites = async (userId) => {
    try {
        const jsonValue = await AsyncStorage.getItem(getFavoritesKey(userId));
        const data = jsonValue ? JSON.parse(jsonValue) : [];
        // sort by created_at desc
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { data, error: null };
    } catch (e) {
        return { data: null, error: e };
    }
};

export const getFavoriteIds = async (userId) => {
    try {
        const jsonValue = await AsyncStorage.getItem(getFavoritesKey(userId));
        const data = jsonValue ? JSON.parse(jsonValue) : [];
        const favoriteIds = new Set(data.map((f) => f.place_id));
        return { favoriteIds, error: null };
    } catch (e) {
        return { favoriteIds: new Set(), error: e };
    }
};

export const checkIsFavorite = async (userId, placeId) => {
    try {
        const { favoriteIds } = await getFavoriteIds(userId);
        const isFavorite = favoriteIds.has(placeId);
        return { isFavorite, error: null };
    } catch (e) {
        return { isFavorite: false, error: e };
    }
};

export const addFavorite = async (userId, place) => {
    if (!place || !place.id) {
        return { data: null, error: { message: 'Geçersiz yer verisi.' } };
    }
    try {
        const jsonValue = await AsyncStorage.getItem(getFavoritesKey(userId));
        let data = jsonValue ? JSON.parse(jsonValue) : [];
        
        // Prevent duplicates
        if (data.some(f => f.place_id === place.id)) {
            return { data: null, error: null }; // Already favorite
        }
        
        const minimalPlace = {
            id: place.id,
            name: place.name,
            category: place.category,
            image_url: place.image_url || place.imageUrl,
            avg_duration: place.avg_duration || 1,
            entry_fee: place.entry_fee || 0,
            popularity_score: place.popularity_score || 50,
            cities: place.cities
        };
        
        const newFav = {
            id: Date.now().toString(),
            user_id: userId,
            place_id: place.id,
            created_at: new Date().toISOString(),
            places: minimalPlace
        };
        data.push(newFav);
        
        try {
            await AsyncStorage.setItem(getFavoritesKey(userId), JSON.stringify(data));
        } catch (saveError) {
            // Eğer disk dolu hatası alırsak, cache'i temizleyip tekrar deneyelim
            if (saveError.message?.includes('full') || saveError.code === '13') {
                console.warn('Storage full, clearing cache to make room for favorite...');
                // cacheService'i doğrudan import etmek yerine cache prefix ile temizlik yapalım
                const keys = await AsyncStorage.getAllKeys();
                const cacheKeys = keys.filter(k => k.startsWith('sgr_cache_'));
                if (cacheKeys.length > 0) {
                    await AsyncStorage.multiRemove(cacheKeys);
                    // Temizlik sonrası tekrar kaydetmeyi dene
                    await AsyncStorage.setItem(getFavoritesKey(userId), JSON.stringify(data));
                } else {
                    throw saveError; // Temizlenecek bir şey yoksa hatayı fırlat
                }
            } else {
                throw saveError;
            }
        }
        
        return { data: newFav, error: null };
    } catch (e) {
        console.error('Favorite add error:', e);
        return { data: null, error: e };
    }
};

export const removeFavorite = async (userId, placeId) => {
    try {
        const jsonValue = await AsyncStorage.getItem(getFavoritesKey(userId));
        if (jsonValue) {
            let data = JSON.parse(jsonValue);
            data = data.filter(f => f.place_id !== placeId);
            await AsyncStorage.setItem(getFavoritesKey(userId), JSON.stringify(data));
        }
        return { error: null };
    } catch (e) {
        return { error: e };
    }
};

export const toggleFavorite = async (userId, place) => {
    if (!place || !place.id) {
        return { isFavorite: false, error: { message: 'Geçersiz yer verisi.' } };
    }
    const placeId = place.id;
    const { isFavorite, error: checkError } = await checkIsFavorite(userId, placeId);
    if (checkError) return { isFavorite: false, error: checkError };

    if (isFavorite) {
        const { error } = await removeFavorite(userId, placeId);
        return { isFavorite: false, error };
    } else {
        const { error } = await addFavorite(userId, place);
        return { isFavorite: true, error };
    }
};
