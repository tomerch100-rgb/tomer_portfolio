import axios from "axios";

/**
 * Detects whether the frontend is currently running in a local environment.
 * Checks for localhost, 127.0.0.1, IPv6 ::1, local network IP ranges (192.168.x.x, 10.x.x.x), or .local domains.
 */
export const isLocalEnvironment = () => {
    if (typeof window === "undefined") {
        return import.meta.env.DEV;
    }
    const { hostname } = window.location;
    return (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.endsWith(".local")
    );
};

/**
 * Returns the dynamic API Base URL according to the current runtime environment:
 * - Localhost / Local IP: http://localhost:8000
 * - Production (Vercel / Cloud): https://tomer-portfolio-6x64.onrender.com (or VITE_API_URL if defined)
 */
export const getApiBaseUrl = () => {
    if (isLocalEnvironment()) {
        return "http://localhost:8000";
    }
    return import.meta.env.VITE_API_URL || "https://tomer-portfolio-6x64.onrender.com";
};

/**
 * Returns the dynamic WebSocket Base URL according to the current runtime environment:
 * - Localhost / Local IP: ws://localhost:8000/ws
 * - Production (Vercel / Cloud): wss://tomer-portfolio-6x64.onrender.com/ws (or VITE_WS_URL if defined)
 */
export const getWsBaseUrl = () => {
    if (isLocalEnvironment()) {
        return "ws://localhost:8000/ws";
    }
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    const apiUrl = import.meta.env.VITE_API_URL || "https://tomer-portfolio-6x64.onrender.com";
    const wsProtocolUrl = apiUrl
        .trim()
        .replace(/^http:\/\//i, "ws://")
        .replace(/^https:\/\//i, "wss://")
        .replace(/\/+$/, "");
    return wsProtocolUrl.endsWith("/ws") ? wsProtocolUrl : `${wsProtocolUrl}/ws`;
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWsBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor to attach Authorization header if token exists in storage & ensure correct baseURL
api.interceptors.request.use(
    (config) => {
        if (!config.baseURL || config.baseURL === "") {
            config.baseURL = getApiBaseUrl();
        }
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const API = api;
export default api;