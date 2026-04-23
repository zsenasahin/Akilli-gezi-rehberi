import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

// secrets.js gitignore'da olduğu için EAS build'de yok.
// Değerler app.config.js extra'sından okunur (hem local hem build çalışır).
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase config eksik! app.config.js extra alanını kontrol edin.');
}

/**
 * SecureStore adaptörü — JWT token'larını Keychain/Keystore'da saklar.
 */
const SecureStoreAdapter = {
    getItem: async (key) => {
        try { return await SecureStore.getItemAsync(key); } catch { return null; }
    },
    setItem: async (key, value) => {
        try { await SecureStore.setItemAsync(key, value); } catch { }
    },
    removeItem: async (key) => {
        try { await SecureStore.deleteItemAsync(key); } catch { }
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // PKCE için expo-crypto kullan
        flowType: 'pkce',
    },
    global: {
        // expo-crypto ile SHA-256 hash fonksiyonu sağla
        fetch: (...args) => fetch(...args),
        headers: {
            'X-Client-Info': 'supabase-js-react-native',
        },
    },
    db: {
        schema: 'public',
    },
    realtime: {
        timeout: 15000, // 15 saniye timeout
    },
});
