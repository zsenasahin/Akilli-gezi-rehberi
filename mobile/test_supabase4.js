const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function test() {
    const { data: cols, error } = await supabase.from('places').select('*').limit(1);
    console.log("Places:", cols, error);
}
test();
