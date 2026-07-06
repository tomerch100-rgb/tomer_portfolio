import api from './api';

const login = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        return response.data
    } catch (error) {
        console.error("  שגיאה בהתחברות:", error);
        throw error;
    }
};


export default login
