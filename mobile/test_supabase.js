const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function test() {
    // try to insert a dummy string
    const { data, error } = await supabase.from('favorites').insert([{ user_id: '123e4567-e89b-12d3-a456-426614174000', place_id: 'test-string' }]);
    console.log("Insert result:", error);
}
test();
