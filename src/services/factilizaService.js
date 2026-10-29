import { API_URL } from "../config/api";
import { obtenerTokenSesion } from "./authSession";

export const consultarDocumento = async (tipo, numero) => {
    const token = obtenerTokenSesion();
    if (!token) {
        throw new Error("Inicia sesión para consultar documentos.");
    }

    const response = await fetch(`${API_URL}/consultas/${tipo}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
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
