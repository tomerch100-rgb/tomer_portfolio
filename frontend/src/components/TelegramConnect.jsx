import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    Send,
    CheckCircle2,
    Loader2,
    AlertCircle,
    RefreshCw,
    ExternalLink,
    BellRing,
    Sparkles,
    Radio
} from "lucide-react";
import {
    generateTelegramToken,
    fetchUserProfile,
    sendTestTelegramAlert
} from "../services/telegramService";
import { loginSuccess } from "../store/authSlice";
import { useWebSocketEvent, useWebSocket } from "../hooks/useWebSocket";

/**
 * TelegramConnect Component
 * Handles dynamic Telegram linking state, bot token generation, test alerts,
 * and instant multi-tab WebSocket synchronization on TELEGRAM_CONNECTED event.
 */
function TelegramConnect({ user: propUser, className = "", compact = false }) {
    const dispatch = useDispatch();
    const reduxUser = useSelector((state) => state.auth.user);
    const user = propUser || reduxUser;

    const { isConnected: isWsActive } = useWebSocket();

    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isTestingAlert, setIsTestingAlert] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [linkSuccessMsg, setLinkSuccessMsg] = useState("");
    const [directTelegramUrl, setDirectTelegramUrl] = useState("");
    const [justConnectedViaWs, setJustConnectedViaWs] = useState(false);

    const isConnected = Boolean(user?.telegram_id);

    // WebSocket Event Listener: TELEGRAM_CONNECTED
    // Instant zero-refresh sync across all open tabs!
    useWebSocketEvent("TELEGRAM_CONNECTED", (event) => {
        console.log("⚡ [WS Event Received] TELEGRAM_CONNECTED:", event);
        const payload = event?.payload || {};
        const telegramId = payload.telegram_id;

        if (telegramId) {
            // 1. Immediately update Redux global store so all components and tabs sync
            const updatedUser = {
                ...user,
                telegram_id: telegramId,
                telegram_connect_token: null
            };
            dispatch(loginSuccess(updatedUser));

            // 2. Clear any pending loader/fallback link state
            setIsLoading(false);
            setDirectTelegramUrl("");
            setErrorMsg("");

            // 3. Trigger visual celebration & success notification
            setLinkSuccessMsg("חשבון הטלגרם חובר בהצלחה! 🚀");
            setJustConnectedViaWs(true);

            // Auto-clear celebration pulse after 8 seconds
            setTimeout(() => {
                setJustConnectedViaWs(false);
            }, 8000);
        }
    });

    // Generate token and open Telegram Bot link with popup-blocker resilience
    const handleConnectTelegram = async () => {
        setIsLoading(true);
        setErrorMsg("");
        setLinkSuccessMsg("");
        setDirectTelegramUrl("");

        // Pre-open window to prevent browser popup blockers during async operations
        let popupWindow = null;
        try {
            popupWindow = window.open("about:blank", "_blank");
        } catch (e) {
            console.warn("Popup pre-open failed:", e);
        }

        try {
            const data = await generateTelegramToken();
            const url = typeof data === "string" ? data : data?.telegram_url;

            if (url && typeof url === "string" && url.startsWith("http")) {
                setDirectTelegramUrl(url);
                setLinkSuccessMsg("קישור ההתחברות נוצר! אשר את הבוט בטלגרם להשלמת החיבור.");

                if (popupWindow && !popupWindow.closed) {
                    popupWindow.location.href = url;
                } else {
                    window.open(url, "_blank", "noopener,noreferrer");
                }
            } else {
                if (popupWindow) popupWindow.close();
                setErrorMsg("לא התקבל קישור תקין מהשרת");
            }
        } catch (err) {
            if (popupWindow) popupWindow.close();
            const detail = err.response?.data?.detail;
            if (err.response?.status === 401) {
                setErrorMsg("משתמש אינו מחובר. נא להתחבר מחדש למערכת.");
            } else {
                setErrorMsg(
                    typeof detail === "string"
                        ? detail
                        : "שגיאה ביצירת קישור לטלגרם. נסה שוב."
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Re-verify user authentication state from backend as manual fallback
    const handleRefreshStatus = useCallback(async () => {
        setIsRefreshing(true);
        setErrorMsg("");
        try {
            const updatedProfile = await fetchUserProfile();
            if (updatedProfile) {
                dispatch(loginSuccess(updatedProfile));
                if (updatedProfile.telegram_id) {
                    setLinkSuccessMsg("החשבון קושר בהצלחה לטלגרם! 🎉");
                    setDirectTelegramUrl("");
                }
            }
        } catch (err) {
            console.error("שגיאה ברענון סטטוס משתמש:", err);
            setErrorMsg("שגיאה ברענון נתוני המשתמש מול השרת");
        } finally {
            setIsRefreshing(false);
        }
    }, [dispatch]);

    // Send an immediate test alert to Telegram
    const handleTestAlert = async () => {
        setIsTestingAlert(true);
        setErrorMsg("");
        setLinkSuccessMsg("");
        try {
            const res = await sendTestTelegramAlert();
            setLinkSuccessMsg(res.message || "הודעת בדיקה נשלחה לטלגרם!");
        } catch (err) {
            const detail = err.response?.data?.detail;
            setErrorMsg(
                typeof detail === "string"
                    ? detail
                    : "שגיאה בשליחת הודעת הבדיקה לטלגרם"
            );
        } finally {
            setIsTestingAlert(false);
        }
    };

    // Fallback: Check status when returning focus to window (if not yet connected)
    useEffect(() => {
        const onWindowFocus = () => {
            if (!isConnected) {
                handleRefreshStatus();
            }
        };

        window.addEventListener("focus", onWindowFocus);
        return () => {
            window.removeEventListener("focus", onWindowFocus);
        };
    }, [isConnected, handleRefreshStatus]);

    // --- State 1: Connected ---
    if (isConnected) {
        if (compact) {
            return (
                <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium shadow-sm transition-all duration-300 ${
                        justConnectedViaWs ? "ring-2 ring-emerald-400 scale-105" : ""
                    } ${className}`}
                    title={`מזהה טלגרם: ${user.telegram_id}`}
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>מחובר לטלגרם ✅</span>
                    {justConnectedViaWs && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                    )}
                </div>
            );
        }

        return (
            <div
                className={`p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-3xl shadow-lg flex flex-col gap-3 transition-all duration-500 ${
                    justConnectedViaWs
                        ? "ring-2 ring-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                        : ""
                } ${className}`}
                dir="rtl"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">
                                    מחובר לטלגרם ✅
                                </span>
                                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    פעיל בזמן אמת
                                </span>
                                {isWsActive && (
                                    <span
                                        className="text-[10px] text-zinc-400 flex items-center gap-1 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800"
                                        title="סנכרון רציף פועל ברקע"
                                    >
                                        <Radio className="w-3 h-3 text-emerald-400" />
                                        Live WS
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                התראות המחיר יישלחו לחשבונך בטלגרם באופן מיידי
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleTestAlert}
                            disabled={isTestingAlert}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-md whitespace-nowrap"
                        >
                            {isTestingAlert ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <BellRing className="w-3.5 h-3.5" />
                            )}
                            <span>שלח הודעת בדיקה 🔔</span>
                        </button>

                        <button
                            onClick={handleRefreshStatus}
                            disabled={isRefreshing}
                            title="בדוק סטטוס חיבור"
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer flex-shrink-0 border border-zinc-800"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${
                                    isRefreshing ? "animate-spin text-emerald-400" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {linkSuccessMsg && (
                    <div className="text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 p-2.5 rounded-xl animate-fadeIn flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="font-semibold">{linkSuccessMsg}</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/40 p-2 rounded-xl animate-fadeIn flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}
            </div>
        );
    }

    // --- State 2: Disconnected ---
    if (compact) {
        return (
            <div className="inline-flex items-center gap-2">
                <button
                    onClick={handleConnectTelegram}
                    disabled={isLoading}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#229ED9] hover:bg-[#1E88E5] active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Send className="w-3.5 h-3.5 -rotate-45" />
                    )}
                    <span>חבר את חשבון הטלגרם ✈️</span>
                </button>
            </div>
        );
    }

    return (
        <div
            className={`p-5 bg-gradient-to-r from-[#17212b]/80 via-[#131d27]/90 to-[#0e1621]/95 border border-sky-500/30 rounded-3xl shadow-xl flex flex-col gap-3.5 ${className}`}
            dir="rtl"
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9] flex-shrink-0 shadow-inner">
                        <Send className="w-5 h-5 -rotate-45" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            התראות מחיר ישירות לטלגרם
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            חבר את חשבונך כדי לקבל התראות בזמן אמת ברגע שמניה חוצה את מחיר היעד
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleConnectTelegram}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#229ED9] hover:bg-[#1b8ec3] active:scale-[0.98] text-white text-xs font-bold shadow-[0_0_15px_rgba(34,158,217,0.35)] hover:shadow-[0_0_20px_rgba(34,158,217,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>יוצר קישור...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 -rotate-45" />
                                <span>חבר את חשבון הטלגרם ✈️</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshing}
                        title="רענן ובדוק אם החיבור הושלם"
                        className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${
                                isRefreshing ? "animate-spin text-sky-400" : ""
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Direct Fallback Link */}
            {directTelegramUrl && (
                <div className="flex items-center justify-between gap-3 p-3 bg-sky-950/40 border border-sky-500/40 rounded-xl text-xs text-sky-200 animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                        <span>הקישור נוצר! לחץ כדי לפתוח את הבוט בטלגרם:</span>
                    </div>
                    <a
                        href={directTelegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#229ED9] hover:bg-[#1b8ec3] text-white font-bold rounded-lg transition-all shadow-sm flex-shrink-0"
                    >
                        <span>פתח בטלגרם</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            )}

            {/* Success Message */}
            {linkSuccessMsg && (
                <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-xl animate-fadeIn flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{linkSuccessMsg}</span>
                </div>
            )}

            {/* Error Message */}
            {errorMsg && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 p-2.5 rounded-xl animate-fadeIn">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}
        </div>
    );
}

export default TelegramConnect;
