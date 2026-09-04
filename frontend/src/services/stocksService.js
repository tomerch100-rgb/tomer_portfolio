import api from "./api";

/**
 * Searches for stocks by ticker symbol or company name using the backend /stocks/search endpoint.
 * @param {string} query - The search query (e.g. 'AAPL' or 'Apple')
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array<{symbol: string, name: string, exchange: string, is_active: boolean}>>}
 */
export async function searchStocks(query, limit = 8) {
    if (!query || typeof query !== "string" || !query.trim()) {
        return [];
    }

    try {
        const response = await api.get("/stocks/search", {
            params: {
                q: query.trim(),
                limit,
            },
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Error searching stocks:", error);
        return [];
    }
}

/**
 * Gets details of a single stock by its ticker symbol.
 * @param {string} symbol - Ticker symbol (e.g. 'AAPL')
 */
export async function getStockBySymbol(symbol) {
    if (!symbol) return null;
    try {
        const response = await api.get(`/stocks/${symbol.trim().toUpperCase()}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching stock ${symbol}:`, error);
        return null;
    }
}

/**
 * Triggers backend SEC stocks synchronization.
 */
export async function syncStocksFromSEC() {
    const response = await api.post("/stocks/sync");
    return response.data;
}
