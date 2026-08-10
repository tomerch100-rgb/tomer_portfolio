import api from "./api";

export const executeTrade = async (data) => {
    try {
        const response = await api.post('/transactions/trade', data);
        return response.data;
    } catch (error) {
        console.error("Trade execution failed:", error);
        throw error;
    }
};

export const executeCashTransaction = async (data) => {
    try {
        const response = await api.post('/transactions/cash', data);
        return response.data;
    } catch (error) {
        console.error("Cash transaction failed:", error);
        throw error;
    }
};

// Kept for backward compatibility if used elsewhere, although executeTrade replaces them
export const addStock = async (data) => {
    return executeTrade({ ...data, type: "BUY" });
};

export const sellStock = async (data) => {
    return executeTrade({ ...data, type: "SELL" });
};
