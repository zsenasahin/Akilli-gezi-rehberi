const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let SUPABASE_URL, SUPABASE_ANON_KEY;
try {
    const secretsContent = fs.readFileSync(path.join(__dirname, 'mobile', 'src', 'config', 'secrets.js'), 'utf8');
    const urlMatch = secretsContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = secretsContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
    SUPABASE_URL = urlMatch?.[1];
    SUPABASE_ANON_KEY = keyMatch?.[1];
} catch (e) {
    console.error(e);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function test() {
    const { data, error } = await supabase.from('favorites').select('*').limit(1);
    console.log("Favorites sample:", data, error);
}
test();
