const {
    buscarUsuarioPorLogeo
} = require("../models/usuarioModel");

const autenticarUsuario = async (logeo, clave) => {

    const usuario = await buscarUsuarioPorLogeo(logeo);

    if (!usuario) {
        return {
            success: false,
            message: "El usuario o la contraseña son incorrectos."
        };
    }

    // En tu BD los registros mostrados tienen estado = 1.
    if (String(usuario.estado) !== "1") {
        return {
            success: false,
            message: "El usuario se encuentra inactivo."
        };
    }

    /*
     * Comparación temporal basada en la estructura actual
     * de tu tabla usuario.
     *
     * Si posteriormente confirmamos que 'clave' está
     * almacenada mediante hash, reemplazaremos esta
     * comparación por bcrypt.
     */
    if (String(usuario.clave) !== String(clave)) {
        return {
            success: false,
            message: "El usuario o la contraseña son incorrectos."
        };
    }

    return {
        success: true,
        usuario: {
            id_usuario: usuario.id_usuario,
            id_tipousuario: usuario.id_tipousuario,
            id_empleado: usuario.id_empleado,
            logeo: usuario.logeo,
            estado: usuario.estado
        }
    };
};

module.exports = {
    autenticarUsuario
};