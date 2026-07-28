import api from "./api";

export const displayPortfolio = async () => {
    try {
        const response = await api.get('/display/show_portfolio');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};

export const portfolio_summary = async () => {
    try {
        const response = await api.get('/display/portfolio_summary');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};

export const transaction_log = async () => {
    try {
        const response = await api.get('/display/transaction_log');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};



