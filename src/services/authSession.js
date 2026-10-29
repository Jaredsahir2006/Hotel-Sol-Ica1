import { API_URL } from "../config/api";

const CLAVE_SESION = "hotel-sol-ica:sesion";
const CLAVE_USUARIO = "usuario";

const leerSesion = (almacenamiento) => {
    try {
        const valor = almacenamiento.getItem(CLAVE_SESION);
        return valor ? JSON.parse(valor) : null;
    } catch {
        return null;
    }
};

export const obtenerSesion = () => {
    const sesion = leerSesion(sessionStorage) || leerSesion(localStorage);

    if (
        !sesion ||
        typeof sesion.token !== "string" ||
        !Number.isFinite(sesion.expiraEn) ||
        sesion.expiraEn <= Date.now() ||
        !sesion.usuario
    ) {
        cerrarSesion();
        return null;
    }

    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    return sesion;
};

export const guardarSesion = (resultado, recordar = false) => {
    if (
        !resultado?.token ||
        !resultado?.usuario ||
        !Number.isFinite(resultado.expiraEn) ||
        resultado.expiraEn <= Date.now()
    ) {
        throw new Error("El servidor no devolvió una sesión válida.");
    }

    const sesion = {
        token: resultado.token,
        expiraEn: resultado.expiraEn,
        usuario: resultado.usuario,
        roles: resultado.roles || [],
        modulos: resultado.modulos || []
    };

    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));

    if (recordar) {
        localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    } else {
        localStorage.removeItem(CLAVE_SESION);
        localStorage.removeItem(CLAVE_USUARIO);
    }

    return sesion;
};

export const cerrarSesion = () => {
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_USUARIO);
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_USUARIO);
};

export const obtenerTokenSesion = () => obtenerSesion()?.token || null;

export const verificarSesionRemota = async () => {
    const sesion = obtenerSesion();
    if (!sesion) {
        return null;
    }

    const response = await fetch(`${API_URL}/auth/session`, {
        headers: {
            Authorization: `Bearer ${sesion.token}`
        }
    });

    let resultado;
    try {
        resultado = await response.json();
    } catch {
        throw new Error("El servidor devolvió una respuesta de sesión inválida.");
    }

    if (!response.ok || !resultado?.success) {
        throw new Error(resultado?.message || "La sesión no pudo verificarse.");
    }

    const recordar = Boolean(localStorage.getItem(CLAVE_SESION));
    return guardarSesion(
        {
            ...sesion,
            ...resultado
        },
        recordar
    );
};
