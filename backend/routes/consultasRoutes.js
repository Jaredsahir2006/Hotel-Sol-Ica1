const express = require("express");

const {
    consultarDocumento
} = require("../controllers/consultasController");

const router = express.Router();
const ventanasPorIp = new Map();
const LIMITE_CONSULTAS = 20;
const VENTANA_MS = 60 * 1000;

router.use((req, res, next) => {
    const ahora = Date.now();
    const ip = req.ip;
    const ventana = ventanasPorIp.get(ip);

    res.set("Cache-Control", "no-store");

    if (!ventana || ahora - ventana.inicio >= VENTANA_MS) {
        ventanasPorIp.set(ip, { inicio: ahora, consultas: 1 });
        return next();
    }

    if (ventana.consultas >= LIMITE_CONSULTAS) {
        return res.status(429).json({
            success: false,
            message: "Se alcanzó el límite temporal de consultas. Inténtalo nuevamente en un minuto."
        });
    }

    ventana.consultas += 1;
    return next();
});

router.post("/:tipo", consultarDocumento);

module.exports = router;
