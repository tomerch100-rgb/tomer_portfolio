import api from "./api";

/**
 * Generate a Telegram connection token and deep-link bot URL
 * @returns {Promise<{ telegram_url: string }>}
 */
export const generateTelegramToken = async () => {
    try {
        const response = await api.post('/api/link/telegram/generate-telegram-token');
        return response.data;
    } catch (error) {
        console.error("שגיאה ביצירת קישור לטלגרם:", error);
        throw error;
    }
};

/**
 * Fetch authenticated user profile data including telegram_id
 * @returns {Promise<{ user_id: number, username: string, email: string, telegram_id: string | null }>}
 */
export const fetchUserProfile = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data;
    } catch (error) {
        console.error("שגיאה בטעינת פרופיל משתמש:", error);
        throw error;
    }
};

/**
 * Trigger an immediate test alert to the user's linked Telegram chat
 * @returns {Promise<{ status: string, message: string }>}
 */
export const sendTestTelegramAlert = async () => {
    try {
        const response = await api.post('/api/telegram/test-alert');
        return response.data;
    } catch (error) {
        console.error("שגיאה בשליחת התראת בדיקה לטלגרם:", error);
        throw error;
    }
};
