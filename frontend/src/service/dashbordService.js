import api from "./api";


export const disiplyPortfolio = async () => {
    try {
        const response = await api.get('/disiply/show_portfolio');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};


