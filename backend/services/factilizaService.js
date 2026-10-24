const FACTILIZA_URL = "https://api.factiliza.com/v1";

const consultar = async (ruta, numero) => {
    const token = process.env.FACTILIZA_TOKEN;
    if (!token) {
        const error = new Error("Falta configurar FACTILIZA_TOKEN.");
        error.code = "TOKEN_MISSING";
        error.publicMessage = "El servicio de consulta aún no está configurado.";
        throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${FACTILIZA_URL}/${ruta}/info/${numero}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            signal: controller.signal
        });

        let resultado;
        try {
            resultado = await response.json();
        } catch {
            const error = new Error("Factiliza devolvió una respuesta inválida.");
            error.code = "UPSTREAM_REJECTED";
            error.publicMessage = "Factiliza devolvió una respuesta que no se pudo interpretar.";
            throw error;
        }

        if (!response.ok || resultado.success === false || !resultado.data) {
            const error = new Error(
                resultado.message || `Factiliza respondió con HTTP ${response.status}.`
            );
            error.code = "UPSTREAM_REJECTED";
            error.publicMessage = resultado.message || "Factiliza no encontró datos para ese documento.";
            throw error;
        }

        return resultado.data;
    } catch (error) {
        if (error.name === "AbortError") {
            const timeoutError = new Error("La consulta a Factiliza agotó el tiempo de espera.");
            timeoutError.code = "TIMEOUT";
            timeoutError.publicMessage = "La consulta tardó demasiado. Inténtalo nuevamente.";
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const consultarDni = (dni) => consultar("dni", dni);
const consultarRuc = (ruc) => consultar("ruc", ruc);

module.exports = {
    consultarDni,
    consultarRuc
};
