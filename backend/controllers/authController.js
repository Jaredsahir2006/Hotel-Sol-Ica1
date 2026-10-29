const {
    autenticarUsuario
} = require("../services/authService");
const { verificarTokenSesion } = require("../utils/sessionToken");

const login = async (req, res) => {

    try {
        res.set("Cache-Control", "no-store");

        const { logeo, clave } = req.body;

        // Validación
        if (!logeo || !logeo.trim()) {
            return res.status(400).json({
                success: false,
                message: "El usuario es obligatorio."
            });
        }

        if (!clave || !clave.trim()) {
            return res.status(400).json({
                success: false,
                message: "La contraseña es obligatoria."
            });
        }

        const resultado = await autenticarUsuario(
            logeo.trim(),
            clave
        );

        if (!resultado.success) {
            return res.status(401).json(resultado);
        }

        return res.status(200).json(resultado);

    } catch (error) {

        console.error(
            "Error en login:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Ocurrió un error al procesar el inicio de sesión."
        });
    }
};

const obtenerSesion = (req, res) => {
    res.set("Cache-Control", "no-store");
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Se requiere una sesión activa."
        });
    }

    try {
        const sesion = verificarTokenSesion(token);
        return res.status(200).json({
            success: true,
            usuario: sesion.usuario,
            roles: sesion.roles,
            modulos: sesion.modulos,
            expiraEn: sesion.exp * 1000
        });
    } catch {
        return res.status(401).json({
            success: false,
            message: "La sesión no es válida o ha expirado."
        });
    }
};

module.exports = {
    login,
    obtenerSesion
};