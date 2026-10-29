const { verificarTokenSesion } = require("../utils/sessionToken");

const requireAuth = (req, res, next) => {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Se requiere una sesión activa."
        });
    }

    try {
        req.sesion = verificarTokenSesion(token);
        return next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "La sesión no es válida o ha expirado."
        });
    }
};

module.exports = requireAuth;
