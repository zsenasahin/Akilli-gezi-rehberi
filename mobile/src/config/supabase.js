import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────
// Supabase Yapılandırması
// API key'ler secrets.js'den okunur (git'e gönderilmez)
// ─────────────────────────────────────────────

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './secrets';

/**
 * AsyncStorage adaptörü – Supabase'in beklediği formata uygun hale getiriyoruz.
 * Yeni AsyncStorage sürümlerinde dönüş tipleri farklı olabiliyor,
 * bu yüzden her metodu açıkça sarmalıyoruz.
 */
const ExpoSecureStoreAdapter = {
    getItem: async (key) => {
        try {
            const value = await AsyncStorage.getItem(key);
            return value;
        } catch {
            return null;
        }
    },
    setItem: async (key, value) => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch {
            // Sessizce devam et
        }
    },
    removeItem: async (key) => {
        try {
            await AsyncStorage.removeItem(key);
        } catch {
            // Sessizce devam et
        }
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // React Native için gerekli değil
    },
});
