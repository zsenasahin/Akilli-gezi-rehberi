import 'dotenv/config';

export default ({ config }) => ({
    ...config,
    plugins: [],
    extra: {
        ...config.extra,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
        eas: {
            projectId: '0ad1e6cd-3563-4569-8fab-b3fb8249d6c1',
        },
    },
});
