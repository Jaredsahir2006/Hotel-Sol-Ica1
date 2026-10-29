const crypto = require("crypto");

const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("La variable SESSION_SECRET es obligatoria en producción.");
}

if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== "test") {
    console.warn("SESSION_SECRET no está configurada; las sesiones vencerán al reiniciar el backend.");
}

const codificar = (valor) =>
    Buffer.from(JSON.stringify(valor)).toString("base64url");

const firmar = (contenido) =>
    crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(contenido)
        .digest("base64url");

const crearTokenSesion = (sesion) => {
    const ahora = Math.floor(Date.now() / 1000);
    const payload = {
        ...sesion,
        iat: ahora,
        exp: ahora + SESSION_DURATION_SECONDS
    };
    const contenido = codificar(payload);

    return {
        token: `${contenido}.${firmar(contenido)}`,
        expiraEn: payload.exp * 1000
    };
};

const verificarTokenSesion = (token) => {
    if (typeof token !== "string") {
        throw new Error("Token de sesión inválido.");
    }

    const partes = token.split(".");
    if (partes.length !== 2) {
        throw new Error("Token de sesión inválido.");
    }

    const [contenido, firma] = partes;
    const firmaEsperada = firmar(contenido);
    const firmaBuffer = Buffer.from(firma);
    const firmaEsperadaBuffer = Buffer.from(firmaEsperada);

    if (
        firmaBuffer.length !== firmaEsperadaBuffer.length ||
        !crypto.timingSafeEqual(firmaBuffer, firmaEsperadaBuffer)
    ) {
        throw new Error("Firma de sesión inválida.");
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(contenido, "base64url").toString("utf8"));
    } catch {
        throw new Error("Contenido de sesión inválido.");
    }

    if (!Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
        throw new Error("La sesión ha expirado.");
    }

    return payload;
};

module.exports = {
    SESSION_DURATION_SECONDS,
    crearTokenSesion,
    verificarTokenSesion
};
