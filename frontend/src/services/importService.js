import api from "./api";

/**
 * Uploads a spreadsheet (.xlsx, .xls, .csv) to the backend for AI-powered
 * column mapping and preview row extraction.
 * 
 * @param {File} file - Uploaded spreadsheet file object
 * @returns {Promise<{
 *   filename: string,
 *   columns: string[],
 *   suggested_mapping: Record<string, string|null>,
 *   confidence: number,
 *   notes?: string,
 *   preview_rows: Record<string, any>[],
 *   total_rows: number,
 *   session_token?: string,
 *   warnings: string[]
 * }>}
 */
export const previewPortfolioImport = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post("/api/portfolio/import/preview", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data;
    } catch (error) {
        console.error("Portfolio import preview failed:", error);
        const detail = error.response?.data?.detail || "שגיאה בניתוח הקובץ. אנא ודא שהקובץ תקין ונסה שוב.";
        throw new Error(detail);
    }
};

/**
 * Submits the user-confirmed column mapping and session token to execute
 * the atomic bulk upsert into the portfolio database.
 * 
 * @param {Record<string, string|null>} mapping - User-confirmed mapping (header -> target)
 * @param {string|null} sessionToken - Cached import session token from preview step
 * @param {boolean} overwriteExisting - Whether to overwrite existing positions
 * @param {Array|null} rows - Optional raw rows payload if session token is not used
 * @returns {Promise<{
 *   success: boolean,
 *   total_processed: number,
 *   imported_count: number,
 *   updated_count: number,
 *   failed_count: number,
 *   errors: string[],
 *   items: Array<{
 *     ticker: string,
 *     shares: number,
 *     avg_price: number,
 *     sector?: string,
 *     take_profit?: number,
 *     stop_loss?: number,
 *     status: 'created' | 'updated' | 'failed',
 *     message?: string
 *   }>
 * }>}
 */
export const confirmPortfolioImport = async (
    mapping,
    sessionToken = null,
    overwriteExisting = true,
    rows = null
) => {
    try {
        const payload = {
            mapping,
            session_token: sessionToken,
            overwrite_existing: overwriteExisting,
            rows: rows,
        };

        const response = await api.post("/api/portfolio/import/confirm", payload);
        return response.data;
    } catch (error) {
        console.error("Portfolio import confirmation failed:", error);
        const detail = error.response?.data?.detail || "שגיאה בייבוא הנתונים למסד הנתונים. אנא נסה שוב.";
        throw new Error(detail);
    }
};
