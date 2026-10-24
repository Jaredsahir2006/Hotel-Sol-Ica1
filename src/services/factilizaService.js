import { API_URL } from "../config/api";

export const consultarDocumento = async (tipo, numero) => {
    const response = await fetch(`${API_URL}/consultas/${tipo}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ numero })
    });

    let resultado;
    try {
        resultado = await response.json();
    } catch {
        throw new Error("El servidor devolvió una respuesta inválida.");
    }

    if (!response.ok || !resultado.success) {
        throw new Error(resultado.message || "No se pudo consultar el documento.");
    }

    return resultado.data;
};
