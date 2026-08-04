import api from "./api";


export const addTolist = async (ticker) => {
    try {
        const response = await api.post(`/watchlist/add_watchlist?stock=${ticker}`);
        return response.data
    } catch (error) {
        console.error("  לא מצליח להוסיף לרשימה", error);
        throw error;
    }
};


export const showList = async () => {
    try {
        const response = await api.get('/watchlist/show_watchlist');
        return response.data
    } catch (error) {
        console.error("  שגיאה בהבאת נתונים:", error);
        throw error;
    }
};

export const getStockDetails = async (ticker) => {
    try {
        const response = await api.get(`/analysis/stock_details?spec_stock=${ticker}`);
        return response.data;
    } catch (error) {
        console.error("שגיאה בהבאת פרטי מניה:", error);
        throw error;
    }
};


