import { iniciarSesion } from "../services/authService";

export const validarLogin = (
    logeo,
    clave
) => {

    const errores = {};

    if (!logeo.trim()) {

        errores.logeo =
            "El usuario es obligatorio.";

    }

    if (!clave.trim()) {

        errores.clave =
            "La contraseña es obligatoria.";

    }

    if (Object.keys(errores).length > 0) {

        return {
            success: false,
            type: "validation",
            errors: errores
        };
    }

    return {
        success: true,
        type: "ready"
    };
};


export const ejecutarLogin = async (
    logeo,
    clave
) => {

    return await iniciarSesion(
        logeo,
        clave
    );
};