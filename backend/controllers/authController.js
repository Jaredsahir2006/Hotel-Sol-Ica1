const {
    autenticarUsuario
} = require("../services/authService");

const login = async (req, res) => {

    try {

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

module.exports = {
    login
};