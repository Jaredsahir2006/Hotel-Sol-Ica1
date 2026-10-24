import React from "react";
import ReactDOM from "react-dom/client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./index.css";

import App from "./App";

const CLAVE_RECUPERACION = "hotel-sol-ica:recuperacion-dom";

const esErrorDeMutacionDom = (error) =>
    error?.name === "NotFoundError" &&
    /removeChild|insertBefore/.test(
        error?.message ?? ""
    );

const recuperar = (error, info) => {

    console.error(
        "Error no controlado:",
        error,
        info
    );

    // Solo recargamos ante corrupciones del DOM por
    // terceros (traductores, extensiones). Cualquier
    // otro error debe quedar visible para depurar.
    if (!esErrorDeMutacionDom(error)) {
        return;
    }

    const veces =
        Number(
            sessionStorage.getItem(
                CLAVE_RECUPERACION
            )
        ) || 0;

    if (veces >= 1) {
        return;
    }

    sessionStorage.setItem(
        CLAVE_RECUPERACION,
        String(veces + 1)
    );

    window.location.reload();
};

const root = ReactDOM.createRoot(
    document.getElementById("root"),
    {
        onUncaughtError: recuperar
    }
);

root.render(<App />);

// LaRecovery queda limpia una vez que la app monta
// sin errores de mutación del DOM.
window.setTimeout(() => {

    sessionStorage.removeItem(
        CLAVE_RECUPERACION
    );

}, 3000);