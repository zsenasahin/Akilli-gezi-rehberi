// app.config.js — app.json'ı override eder, environment variable desteği ekler
// EAS Build'de secrets.js olmadığı için değerler buradan okunur

export default ({ config }) => ({
    ...config,
    extra: {
        ...config.extra,
        supabaseUrl: process.env.SUPABASE_URL || 'https://hgyuzdgrmgsfemluccab.supabase.co',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'SUPABASE_ANON_KEY_REMOVED',
        geminiApiKey: process.env.GEMINI_API_KEY || 'GEMINI_API_KEY_REMOVED',
        eas: {
            projectId: '0ad1e6cd-3563-4569-8fab-b3fb8249d6c1',
        },
    },
});
