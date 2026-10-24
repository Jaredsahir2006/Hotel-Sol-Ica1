const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const consultasRoutes = require("./routes/consultasRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());

app.use(express.json());

// Ruta principal
app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "API Hotel Sol Ica funcionando correctamente."
    });

});

// Rutas de autenticación
app.use("/api/auth", authRoutes);
app.use("/api/consultas", consultasRoutes);

// Iniciar servidor
app.listen(PORT, () => {

    console.log(
        `Servidor Hotel Sol Ica ejecutándose en http://localhost:${PORT}`
    );

});