const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "No se encontraron las variables de configuración de Supabase."
    );
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

module.exports = supabase;