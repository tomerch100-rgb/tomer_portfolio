import axios from "axios";

const api = axios.create({
    baseURL: 'http://localhost:8000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to attach Authorization header if token exists in storage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;