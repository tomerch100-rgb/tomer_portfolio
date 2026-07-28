import api from "./api";


export const portfolioHistoryChart = async () => {
    try {
        const response = await api.get('/charts/portfolio_history');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};



export const dailyChangeChart = async () => {
    try {
        const response = await api.get('/charts/daily_change');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};



export const portfolioPieChart = async () => {
    try {
        const response = await api.get('/charts/portfolio_pie');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};



portfolio_pie