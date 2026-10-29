import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import {
    cerrarSesion,
    obtenerSesion,
    verificarSesionRemota
} from "./services/authSession";

const RutaProtegida = ({ children }) => {
    const [verificando, setVerificando] = useState(true);
    const [sesionValida, setSesionValida] = useState(false);

    useEffect(() => {
        let activa = true;

        verificarSesionRemota()
            .then((sesion) => {
                if (activa) {
                    setSesionValida(Boolean(sesion));
                }
            })
            .catch((error) => {
                console.error("No se pudo verificar la sesión:", error);
                cerrarSesion();
                if (activa) {
                    setSesionValida(false);
                }
            })
            .finally(() => {
                if (activa) {
                    setVerificando(false);
                }
            });

        return () => {
            activa = false;
        };
    }, []);

    if (verificando) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100">
                <p role="status" className="text-sm text-slate-600">
                    Verificando sesión...
                </p>
            </main>
        );
    }

    return sesionValida ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <RutaProtegida>
                            <Dashboard />
                        </RutaProtegida>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;