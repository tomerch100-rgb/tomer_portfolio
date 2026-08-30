import api from "./api";

/**
 * AI Stock Research & Insights API Service
 */

/**
 * Fetch institutional AI stock research report (Groq/Gemini/OpenRouter multi-provider cascade with Redis caching)
 * @param {string} ticker - Stock symbol (e.g. NVDA, AAPL, TSLA)
 * @param {string} language - Output language ('he' or 'en')
 * @returns {Promise<Object>} Formatted AI Research Report
 */
export const fetchAIStockResearch = async (ticker, language = "he") => {
    if (!ticker) throw new Error("Ticker symbol is required");
    try {
        const cleanTicker = ticker.trim().toUpperCase();
        const response = await api.get(`/analysis/ai_research`, {
            params: {
                ticker: cleanTicker,
                language: language
            }
        });
        return response.data;
    } catch (error) {
        console.error(`שגיאה בשליפת מחקר AI עבור ${ticker}:`, error);
        throw error;
    }
};

/**
 * Fetch detailed stock financial metrics, valuation multiples, and market quotes
 * @param {string} ticker - Stock symbol
 * @returns {Promise<Object>} Fundamental stock details
 */
export const fetchStockDetails = async (ticker) => {
    if (!ticker) throw new Error("Ticker symbol is required");
    try {
        const cleanTicker = ticker.trim().toUpperCase();
        const response = await api.get(`/analysis/stock_details`, {
            params: {
                spec_stock: cleanTicker
            }
        });
        return response.data;
    } catch (error) {
        console.error(`שגיאה בשליפת פרטי מניה עבור ${ticker}:`, error);
        throw error;
    }
};

/**
 * Fetch quick stock overview analysis string
 * @param {string} ticker - Stock symbol
 * @returns {Promise<string>} Summary analysis
 */
export const fetchStockAnalysis = async (ticker) => {
    if (!ticker) throw new Error("Ticker symbol is required");
    try {
        const cleanTicker = ticker.trim().toUpperCase();
        const response = await api.get(`/analysis/stock_analysis`, {
            params: {
                spec_stock: cleanTicker
            }
        });
        return response.data;
    } catch (error) {
        console.error(`שגיאה בשליפת ניתוח מהיר עבור ${ticker}:`, error);
        throw error;
    }
};

export default {
    fetchAIStockResearch,
    fetchStockDetails,
    fetchStockAnalysis
};
