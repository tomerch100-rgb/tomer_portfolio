import api from './api';

const registerCheck = async (credentials) => {
    try {
        const response = await api.post('/auth/register', credentials);
        return response.data

    } catch (error) {
        console.error("שגיאה :", error);
        throw error;
    }
};

export default registerCheck
