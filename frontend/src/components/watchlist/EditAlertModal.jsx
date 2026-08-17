import { useState, useMemo, useEffect } from "react";
import { X, Bell, BellRing, BellOff, Loader2, TrendingUp, TrendingDown, Trash2, Check, AlertCircle, DollarSign } from "lucide-react";
import { updateWatchlistAlert } from "../../services/watchlistService";

/**
 * EditAlertModal
 * Modal to view, edit, or clear price alerts for a watchlist item with auto-direction and auto-reset.
 */
function EditAlertModal({ isOpen, onClose, item, onAlertUpdated }) {
    if (!isOpen || !item) return null;

    const ticker = item.ticker || "";
    const currentPrice = Number(item.current_price) || 0;
    const initialTarget = item.target_price !== null && item.target_price !== undefined ? String(item.target_price) : "";
    const isCurrentlyTriggered = Boolean(item.alert_triggered);
    const hasExistingAlert = item.target_price !== null && item.target_price !== undefined;

    const [targetPriceInput, setTargetPriceInput] = useState(initialTarget);
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Sync input when selected item changes
    useEffect(() => {
        setTargetPriceInput(initialTarget);
        setErrorMsg("");
        setSuccessMsg("");
    }, [item]);

    // Recalculate alert direction dynamically against current price
    const newAlertDirection = useMemo(() => {
        const numTarget = parseFloat(targetPriceInput);
        if (isNaN(numTarget) || numTarget <= 0 || !currentPrice) {
            return null;
        }
        return numTarget > currentPrice ? "UP" : "DOWN";
    }, [targetPriceInput, currentPrice]);

    // Percentage difference
    const percentDiff = useMemo(() => {
        const numTarget = parseFloat(targetPriceInput);
        if (isNaN(numTarget) || !currentPrice) return null;
        return (((numTarget - currentPrice) / currentPrice) * 100).toFixed(2);
    }, [targetPriceInput, currentPrice]);

    // Save or update alert
    const handleSaveAlert = async (e) => {
        e.preventDefault();
        const numTarget = parseFloat(targetPriceInput);
        if (isNaN(numTarget) || numTarget <= 0) {
            setErrorMsg("נא להזין מחיר יעד תקין וגבוה מ-0");
            return;
        }

        setIsSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const payload = {
                target_price: numTarget,
                alert_direction: newAlertDirection
            };

            await updateWatchlistAlert(ticker, payload);
            setSuccessMsg("ההתראה עודכנה והופעלה מחדש בהצלחה!");
            
            if (onAlertUpdated) {
                onAlertUpdated(ticker, {
                    target_price: numTarget,
                    alert_direction: newAlertDirection,
                    alert_triggered: false
                });
            }

            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "שגיאה בעדכון ההתראה בשרת");
        } finally {
            setIsSaving(false);
        }
    };

    // Clear alert completely
    const handleClearAlert = async () => {
        setIsClearing(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            await updateWatchlistAlert(ticker, { target_price: null, alert_direction: null });
            setSuccessMsg("ההתראה בוטלה בהצלחה!");

            if (onAlertUpdated) {
                onAlertUpdated(ticker, {
                    target_price: null,
                    alert_direction: null,
                    alert_triggered: false
                });
            }

            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "שגיאה בביטול ההתראה");
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" dir="rtl">
            <div 
                className="bg-[#121214] border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            {isCurrentlyTriggered ? (
                                <BellOff className="w-5 h-5" />
                            ) : hasExistingAlert ? (
                                <BellRing className="w-5 h-5" />
                            ) : (
                                <Bell className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                הגדרת התראה עבור <span className="font-mono text-emerald-400">{ticker}</span>
                            </h3>
                            <p className="text-xs text-zinc-400">התראות מיידיות לטלגרם ברגע שהמחיר נחצה</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stock Price Snapshot */}
                <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">מחיר שוק עדכני</span>
                        <span className="text-xl font-bold font-mono text-white">
                            ${currentPrice > 0 ? currentPrice.toFixed(2) : "N/A"}
                        </span>
                    </div>

                    {/* Current Alert Status Badge */}
                    <div>
                        {isCurrentlyTriggered ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs">
                                <BellOff className="w-3.5 h-3.5 text-zinc-400" />
                                <span>הופעלה ונשלחה לטלגרם</span>
                            </div>
                        ) : hasExistingAlert ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                                <BellRing className="w-3.5 h-3.5" />
                                <span>התראה פעילה: ${Number(item.target_price).toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="text-xs text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded-lg">
                                אין התראה פעילה
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSaveAlert} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-2">
                            מחיר יעד חדש להתראה ($)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={targetPriceInput}
                                onChange={(e) => setTargetPriceInput(e.target.value)}
                                placeholder="לדוגמה: 175.50"
                                required
                                className="w-full pl-4 pr-10 py-3 bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-zinc-100 font-mono text-base focus:outline-none transition-all text-right"
                            />
                            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                                <DollarSign className="w-4 h-4" />
                            </span>
                        </div>
                    </div>

                    {/* Auto-Direction Live Display */}
                    {newAlertDirection && (
                        <div className="animate-fadeIn">
                            <div
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold ${
                                    newAlertDirection === "UP"
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {newAlertDirection === "UP" ? (
                                        <TrendingUp className="w-4 h-4" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4" />
                                    )}
                                    <span>
                                        {newAlertDirection === "UP" ? "התראה בעליית מחיר (UP)" : "התראה בירידת מחיר (DOWN)"}
                                    </span>
                                </div>
                                <span className="font-mono text-xs">
                                    {percentDiff > 0 ? `+${percentDiff}%` : `${percentDiff}%`}
                                </span>
                            </div>
                        </div>
                    )}

                    {isCurrentlyTriggered && (
                        <p className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-xl">
                            💡 שמירת מחיר יעד חדש תאפס את ההתראה ותחזיר אותה למצב פעיל בזמן אמת.
                        </p>
                    )}

                    {/* Feedback Messages */}
                    {errorMsg && (
                        <div className="flex items-center gap-2 p-2.5 bg-rose-950/30 border border-rose-800/40 text-rose-400 text-xs rounded-xl">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs rounded-xl">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSaving || isClearing || !targetPriceInput}
                            className="flex-grow py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>שומר התראה...</span>
                                </>
                            ) : (
                                <>
                                    <BellRing className="w-4 h-4" />
                                    <span>שמור והפעל התראה</span>
                                </>
                            )}
                        </button>

                        {hasExistingAlert && (
                            <button
                                type="button"
                                onClick={handleClearAlert}
                                disabled={isSaving || isClearing}
                                className="px-4 py-3 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-800/50 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="בטל התראה קיימת"
                            >
                                {isClearing ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                <span>בטל התראה</span>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditAlertModal;
