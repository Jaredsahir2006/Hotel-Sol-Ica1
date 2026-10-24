import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./views/Login";
import Dashboard from "./views/Dashboard";

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
                    element={<Dashboard />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;