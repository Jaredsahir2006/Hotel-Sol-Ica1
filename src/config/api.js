const configuredApiUrl = (process.env.REACT_APP_API_URL || "").trim();
const defaultApiUrl =
    process.env.NODE_ENV === "development"
        ? "http://localhost:5000/api"
        : "/api";

export const API_URL = (
    configuredApiUrl || defaultApiUrl
).replace(/\/+$/, "");
