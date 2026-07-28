import api from "./api";

export const addStock = async (data) => {
    try {
        const response = await api.post('/orders/add_stock', data);
        return response.data
    } catch (error) {
        console.error("  הוספת מנייה לא הצליחה", error);
        throw error;
    }
};


export const sellStock = async (data) => {
    try {
        const response = await api.post('/orders/sell_stock', data);
        return response.data
    } catch (error) {
        console.error(" הפעולה של מכירת מנייה לא הצליח", error);
        throw error;
    }
};


