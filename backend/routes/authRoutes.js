const express = require("express");

const {
    login,
    obtenerSesion
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.get("/session", obtenerSesion);

module.exports = router;