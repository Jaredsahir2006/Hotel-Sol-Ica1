import { API_URL } from "../config/api";

export const iniciarSesion = async (
    logeo,
    clave
) => {
    let response;

    try {
        response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    logeo,
                    clave
                })
            }
        );
    } catch (error) {
        console.error(
            "Error de conexión:",
            error
        );

        return {
            success: false,
            message:
                "No se pudo conectar con el servidor. Verifica que el backend esté disponible y que REACT_APP_API_URL esté configurada para este entorno."
        };
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        console.error(
            "Respuesta inválida del servidor:",
            error
        );

        return {
            success: false,
            message: "El servidor devolvió una respuesta inválida."
        };
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return {
            success: false,
            message: "El servidor devolvió una respuesta inválida."
        };
    }

    return {
        ...data,
        success: response.ok
    };
};