import { useState, useEffect, useMemo } from "react";
import { Plus, Loader2, TrendingUp, TrendingDown, Bell, DollarSign, AlertCircle, Check } from "lucide-react";
import { addWatchlistItem, getLatestStockPrice } from "../../services/watchlistService";

/**
 * SmartWatchlistAddForm
 * Allows adding a stock with an optional target price and automatic direction calculation.
 */
function SmartWatchlistAddForm({ onSuccess, className = "" }) {
    const [ticker, setTicker] = useState("");
    const [targetPrice, setTargetPrice] = useState("");
    const [currentPrice, setCurrentPrice] = useState(null);
    const [isCheckingPrice, setIsCheckingPrice] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    // Debounced check for live price when ticker is entered
    useEffect(() => {
        const cleanTicker = ticker.trim().toUpperCase();
        if (cleanTicker.length < 1) {
            setCurrentPrice(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingPrice(true);
            try {
                const data = await getLatestStockPrice(cleanTicker);
                if (data && data.lastPrice) {
                    setCurrentPrice(Number(data.lastPrice));
                } else {
                    setCurrentPrice(null);
                }
            } catch (err) {
                setCurrentPrice(null);
            } finally {
                setIsCheckingPrice(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [ticker]);

    // Calculate alert direction automatically
    const alertDirection = useMemo(() => {
        const numTarget = parseFloat(targetPrice);
        if (isNaN(numTarget) || numTarget <= 0 || currentPrice === null || currentPrice <= 0) {
            return null;
        }
        return numTarget > currentPrice ? "UP" : "DOWN";
    }, [targetPrice, currentPrice]);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanTicker = ticker.trim().toUpperCase();
        if (!cleanTicker) {
            setFeedback({ type: "error", message: "נא להזין סימול מניה" });
            return;
        }

        const numTarget = targetPrice ? parseFloat(targetPrice) : null;
        if (targetPrice && (isNaN(numTarget) || numTarget <= 0)) {
            setFeedback({ type: "error", message: "נא להזין מחיר יעד חיובי ותקין" });
            return;
        }

        setIsSubmitting(true);
        setFeedback({ type: "", message: "" });

        try {
            const payload = {
                ticker: cleanTicker,
                target_price: numTarget,
                alert_direction: alertDirection
            };

            const response = await addWatchlistItem(payload);

            if (response === "success" || response?.message === "success" || typeof response === "object") {
                setFeedback({ type: "success", message: `מניית ${cleanTicker} נוספה בהצלחה לרשימת המעקב!` });
                setTicker("");
                setTargetPrice("");
                setCurrentPrice(null);
                if (onSuccess) {
                    onSuccess(cleanTicker);
                }
            } else {
                setFeedback({ type: "error", message: typeof response === "string" ? response : "שגיאה בהוספת מניה" });
            }
        } catch (err) {
            const errorDetail = err.response?.data?.detail || "שגיאה בחיבור לשרת בהוספת המניה";
            setFeedback({ type: "error", message: errorDetail });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-lg flex flex-col gap-3.5 ${className}`} dir="rtl">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    הוספת מניה חדשה
                </span>
                {currentPrice !== null && (
                    <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-lg border border-zinc-700/50">
                        מחיר שוק: <span className="text-emerald-400">${currentPrice.toFixed(2)}</span>
                    </span>
                )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Ticker Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        placeholder="סימול (לדוגמה NVDA)"
                        maxLength={10}
                        required
                        className="w-full pl-3 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all text-xs font-bold uppercase font-mono text-right"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                        {isCheckingPrice ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        ) : (
                            <DollarSign className="w-3.5 h-3.5" />
                        )}
                    </span>
                </div>

                {/* Target Price Input */}
                <div className="relative">
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder="מחיר יעד להתראה ($)"
                        className="w-full pl-3 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all text-xs font-mono text-right"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                        <Bell className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>

            {/* Dynamic Auto-Direction Badge */}
            {targetPrice && (
                <div className="text-xs transition-all animate-fadeIn">
                    {alertDirection ? (
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-medium ${
                                alertDirection === "UP"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            }`}
                        >
                            {alertDirection === "UP" ? (
                                <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                            ) : (
                                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span>
                                {alertDirection === "UP"
                                    ? `התראה בעלייה ל-${Number(targetPrice).toFixed(2)}$`
                                    : `התראה בירידה ל-${Number(targetPrice).toFixed(2)}$`}
                            </span>
                            {currentPrice && (
                                <span className="text-[11px] text-zinc-400 mr-auto font-mono">
                                    ({(( (parseFloat(targetPrice) - currentPrice) / currentPrice ) * 100).toFixed(1)}%)
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="text-[11px] text-zinc-500 px-1">
                            הזן סימול קיים לחישוב כיוון ההתראה אוטומטית מול מחיר השוק
                        </div>
                    )}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || !ticker.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מוסיף מניה...</span>
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4" />
                        <span>הוסף לרשימת המעקב</span>
                    </>
                )}
            </button>

            {/* Feedback Message */}
            {feedback.message && (
                <div
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium ${
                        feedback.type === "success"
                            ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50"
                            : "bg-rose-950/40 text-rose-300 border border-rose-800/50"
                    }`}
                >
                    {feedback.type === "success" ? (
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}
        </form>
    );
}

export default SmartWatchlistAddForm;
