import { API_URL } from "../config/api";

export const iniciarSesion = async (
    logeo,
    clave
) => {

    try {

        const response = await fetch(
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

        const data = await response.json();

        return {
            success: response.ok,
            ...data
        };

    } catch (error) {

        console.error(
            "Error de conexión:",
            error
        );

        return {
            success: false,
            message:
                "No se pudo conectar con el servidor."
        };
    }
};