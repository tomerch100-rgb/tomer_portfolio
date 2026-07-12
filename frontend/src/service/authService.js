import api from './api';

export const login = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        return response.data
    } catch (error) {
        console.error("  שגיאה בהתחברות:", error);
        throw error;
    }
};





export const registerCheck = async (credentials) => {
    try {
        const response = await api.post('/auth/register', credentials);
        return response.data

    } catch (error) {
        console.error("שגיאה :", error);
        throw error;
    }
};

