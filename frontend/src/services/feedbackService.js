import api from "./api";

/**
 * Submits user feedback to the backend, which delivers it to tomerch100@gmail.com
 * @param {Object} feedbackData
 * @param {string} feedbackData.category - 'feature' | 'bug' | 'ui' | 'performance' | 'general'
 * @param {number} [feedbackData.rating] - 1 to 5
 * @param {string} [feedbackData.page] - relevant page/feature
 * @param {string} feedbackData.subject - brief title
 * @param {string} feedbackData.message - detailed description
 * @param {string} [feedbackData.user_email] - sender contact email
 * @param {string} [feedbackData.user_name] - sender name
 */
export async function submitFeedback(feedbackData) {
    const response = await api.post("/feedback", feedbackData);
    return response.data;
}
