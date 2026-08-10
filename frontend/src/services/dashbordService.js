import api from "./api";

export const getTransactionsSummary = async () => {
    try {
        const response = await api.get('/transactions/summary');
        return response.data;
    } catch (error) {
        console.error("שגיאה בהבאת נתוני מזומן:", error);
        throw error;
    }
};

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


export const updatePositionAnalysis = async (ticker, risk_level, take_profit, stop_loss) => {
    try {
        const response = await api.patch('/display/update_position', {
            ticker,
            risk_level,
            take_profit,
            stop_loss
        });
        return response.data;
    } catch (error) {
        console.error("שגיאה בעדכון הפוזיציה:", error);
        throw error;
    }
};

export const getPortfolioHistory = async () => {
    try {
        const response = await api.get('/charts/portfolio_history');
        return response.data;
    } catch (error) {
        console.error("שגיאה בהבאת נתונים:", error);
        throw error;
    }
};
