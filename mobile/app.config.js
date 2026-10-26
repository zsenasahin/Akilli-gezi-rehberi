// .env dosyasını Expo CLI otomatik yükler (dotenv gerekmez).

// app.json'daki ayarlar `config` olarak gelir. Eklentiler (expo-font,
// expo-secure-store, expo-image-picker izin metinleri) korunmalıdır; önceki
// `plugins: []` bunları sildiği için iOS'ta galeri/kamera izni metni build'e
// girmiyordu.
//
// Gemini gibi gizli anahtarlar buraya EKLENMEZ: `extra` alanı uygulama paketine
// gömülür ve herkes tarafından okunabilir. Gizli anahtarlar yalnızca Supabase
// Edge Function secret'ı olarak tutulur (bkz. supabase/functions/travel-assistant).
export default ({ config }) => ({
    ...config,
    extra: {
        ...config.extra,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        eas: {
            projectId: '0ad1e6cd-3563-4569-8fab-b3fb8249d6c1',
        },
    },
});
