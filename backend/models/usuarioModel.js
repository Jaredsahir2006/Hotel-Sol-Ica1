const supabase = require("../config/supabase");

const buscarUsuarioPorLogeo = async (logeo) => {

    const { data, error } = await supabase
        .from("usuario")
        .select(`
            id_usuario,
            id_tipousuario,
            id_empleado,
            logeo,
            clave,
            estado
        `)
        .eq("logeo", logeo)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
};

module.exports = {
    buscarUsuarioPorLogeo
};