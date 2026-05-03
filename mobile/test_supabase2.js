const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function test() {
    const { data: tables, error } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles table:", tables, error);
}
test();
