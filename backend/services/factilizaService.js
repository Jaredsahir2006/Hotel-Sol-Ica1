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

        const responseText = await response.text();
        if (response.status === 401) {
            const error = new Error("Factiliza rechazó la autorización (HTTP 401).");
            error.code = "AUTH_REJECTED";
            error.publicMessage = "Factiliza rechazó la autorización (HTTP 401). Verifica que el backend esté usando el mismo token API que probaste en Factiliza.";
            throw error;
        }

        let resultado;
        try {
            resultado = JSON.parse(responseText);
        } catch {
            const contentType = response.headers.get("content-type") || "no informado";
            const error = new Error(
                `Factiliza respondió HTTP ${response.status} con Content-Type ${contentType}, no JSON.`
            );
            error.code = "UPSTREAM_REJECTED";
            error.publicMessage = `Factiliza respondió HTTP ${response.status} con Content-Type ${contentType}, no JSON.`;
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
