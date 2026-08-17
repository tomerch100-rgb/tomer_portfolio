import api from "./api";

/**
 * Add a stock to the user's watchlist with optional target price and direction
 * @param {Object|string} params - { ticker, target_price, alert_direction } or ticker string
 */
export const addWatchlistItem = async (params) => {
    try {
        const payload = typeof params === "string" 
            ? { ticker: params.toUpperCase(), target_price: null, alert_direction: null }
            : {
                ticker: params.ticker.toUpperCase(),
                target_price: params.target_price ? Number(params.target_price) : null,
                alert_direction: params.alert_direction || null
            };
        const response = await api.post('/watchlist/add_watchlist', payload);
        return response.data;
    } catch (error) {
        console.error("לא מצליח להוסיף לרשימה:", error);
        throw error;
    }
};

// Backward compatibility alias
export const addTolist = addWatchlistItem;

/**
 * Fetch the user's watchlist with live prices and alert statuses
 */
export const showList = async () => {
    try {
        const response = await api.get('/watchlist/show_watchlist');
        return response.data;
    } catch (error) {
        console.error("שגיאה בהבאת נתוני רשימת מעקב:", error);
        throw error;
    }
};

/**
 * Update the price alert configuration for a specific stock
 * @param {string} ticker 
 * @param {{ target_price: number|null, alert_direction: string|null }} alertData 
 */
export const updateWatchlistAlert = async (ticker, alertData) => {
    try {
        const payload = {
            target_price: alertData.target_price !== null && alertData.target_price !== undefined && alertData.target_price !== ""
                ? Number(alertData.target_price) 
                : null,
            alert_direction: alertData.alert_direction || null
        };
        const response = await api.put(`/watchlist/update_alert/${ticker.toUpperCase()}`, payload);
        return response.data;
    } catch (error) {
        console.error(`שגיאה בעדכון התראה עבור ${ticker}:`, error);
        throw error;
    }
};

/**
 * Fetch latest live price snapshot for a ticker via REST API
 * @param {string} ticker 
 */
export const getLatestStockPrice = async (ticker) => {
    try {
        const response = await api.get(`/watchlist/test-alpaca/${ticker.toUpperCase()}`);
        if (response.data && response.data.success) {
            return {
                lastPrice: response.data.lastPrice,
                previousClose: response.data.previousClose
            };
        }
        return null;
    } catch (error) {
        console.error(`שגיאה בבדיקת מחיר עבור ${ticker}:`, error);
        return null;
    }
};

/**
 * Fetch deep fundamental analysis data for a stock
 * @param {string} ticker 
 */
export const getStockDetails = async (ticker) => {
    try {
        const response = await api.get(`/analysis/stock_details?spec_stock=${ticker.toUpperCase()}`);
        return response.data;
    } catch (error) {
        console.error("שגיאה בהבאת פרטי מניה:", error);
        throw error;
    }
};
