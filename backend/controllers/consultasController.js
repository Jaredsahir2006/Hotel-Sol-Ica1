const {
    consultarDni,
    consultarRuc
} = require("../services/factilizaService");

const consultarDocumento = async (req, res) => {
    const { tipo } = req.params;
    const numero = String((req.body || {}).numero || "").trim();
    const esDni = tipo === "dni";
    const esRuc = tipo === "ruc";

    if (!esDni && !esRuc) {
        return res.status(404).json({
            success: false,
            message: "Tipo de consulta no válido."
        });
    }

    if (!(esDni ? /^\d{8}$/.test(numero) : /^\d{11}$/.test(numero))) {
        return res.status(400).json({
            success: false,
            message: esDni
                ? "El DNI debe tener 8 dígitos."
                : "El RUC debe tener 11 dígitos."
        });
    }

    try {
        const datos = esDni
            ? await consultarDni(numero)
            : await consultarRuc(numero);

        return res.status(200).json({
            success: true,
            data: datos
        });
    } catch (error) {
        console.error("Error consultando Factiliza:", error.message);

        const statusByErrorCode = {
            TOKEN_MISSING: 503,
            AUTH_REJECTED: 502,
            TIMEOUT: 504,
            UPSTREAM_REJECTED: 422
        };
        const status = statusByErrorCode[error.code] || 502;

        return res.status(status).json({
            success: false,
            message: error.publicMessage || "No se pudo completar la consulta a Factiliza."
        });
    }
};

module.exports = {
    consultarDocumento
};
