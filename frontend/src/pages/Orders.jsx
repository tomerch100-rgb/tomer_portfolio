import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { executeTrade, executeCashTransaction } from "../services/ordersService";
import { getTransactionsSummary, displayPortfolio } from "../services/dashbordService";
import {
    DollarSign,
    Wallet,
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
    ArrowDownToLine,
    ArrowUpFromLine,
    FileSpreadsheet,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Layers,
    Maximize2
} from "lucide-react";
import ImportPortfolioModal from "../components/ImportPortfolioModal";
import StockSearchAutocomplete from "../components/StockSearchAutocomplete";

function Orders() {
    const {
        register: registerTrade,
        handleSubmit: handleTradeSubmit,
        formState: { errors: tradeErrors },
        reset: resetTrade,
        watch: watchTrade,
        setValue: setValueTrade,
        clearErrors: clearTradeErrors
    } = useForm({
        defaultValues: {
            ticker: "",
            shares: "",
            price: ""
        }
    });

    const {
        register: registerCash,
        handleSubmit: handleCashSubmit,
        formState: { errors: cashErrors },
        reset: resetCash
    } = useForm();

    const [orderType, setOrderType] = useState("BUY");
    const [cashType, setCashType] = useState("DEPOSIT");

    const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);
    const [isSubmittingCash, setIsSubmittingCash] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [summary, setSummary] = useState({ available_cash: 0, total_account_value: 0 });
    const [portfolioPositions, setPortfolioPositions] = useState([]);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    const watchTicker = watchTrade("ticker", "");
    const watchShares = watchTrade("shares", 0);
    const watchPrice = watchTrade("price", 0);

    // Fetch cash balances & live portfolio holdings
    const fetchAccountData = async () => {
        try {
            const [summaryData, portfolioData] = await Promise.allSettled([
                getTransactionsSummary(),
                displayPortfolio()
            ]);

            if (summaryData.status === "fulfilled") {
                setSummary(summaryData.value || { available_cash: 0, total_account_value: 0 });
            }

            if (portfolioData.status === "fulfilled" && Array.isArray(portfolioData.value)) {
                // Filter only positions with positive shares
                const validPositions = portfolioData.value.filter((p) => Number(p.shares) > 0);
                setPortfolioPositions(validPositions);
            }
        } catch (error) {
            console.error("Failed to load account data", error);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        fetchAccountData();
    }, []);

    // Current selected stock position in portfolio (for SELL validation)
    const selectedPosition = portfolioPositions.find(
        (p) => p.ticker?.toUpperCase() === watchTicker?.toUpperCase()
    );

    const availableShares = selectedPosition ? Number(selectedPosition.shares) : 0;

    // Handle Order Type Switch (BUY <-> SELL)
    const handleOrderTypeChange = (newType) => {
        if (newType === orderType) return;
        setOrderType(newType);
        clearTradeErrors();

        if (newType === "SELL") {
            // Auto-select first stock in portfolio if available
            if (portfolioPositions.length > 0) {
                const first = portfolioPositions[0];
                setValueTrade("ticker", first.ticker);
                if (first.current_price || first.avg_price) {
                    setValueTrade("price", Number(first.current_price || first.avg_price));
                }
            } else {
                setValueTrade("ticker", "");
            }
        } else {
            // Reset to empty for BUY mode
            setValueTrade("ticker", "");
            setValueTrade("shares", "");
            setValueTrade("price", "");
        }
    };

    // When user changes dropdown in SELL mode
    const handleSellTickerSelect = (e) => {
        const selectedSym = e.target.value;
        setValueTrade("ticker", selectedSym);
        const pos = portfolioPositions.find((p) => p.ticker?.toUpperCase() === selectedSym.toUpperCase());
        if (pos) {
            if (pos.current_price || pos.avg_price) {
                setValueTrade("price", Number(pos.current_price || pos.avg_price));
            }
        }
    };

    // Quick Action Helper: Fill Max Available Shares
    const handleSetMaxShares = () => {
        if (availableShares > 0) {
            setValueTrade("shares", availableShares, { shouldValidate: true });
        }
    };

    const totalCost = (Number(watchShares) || 0) * (Number(watchPrice) || 0);

    // Validation Flags
    const isBuyDisabled = orderType === "BUY" && totalCost > (summary.available_cash || 0);
    const isSellExceeded = orderType === "SELL" && (Number(watchShares) > availableShares || availableShares === 0);
    const isSellDisabled = orderType === "SELL" && (portfolioPositions.length === 0 || isSellExceeded);

    const onTradeSubmit = async (data) => {
        setIsSubmittingTrade(true);
        const formattedData = {
            ...data,
            ticker: data.ticker.toUpperCase(),
            type: orderType
        };

        try {
            await executeTrade(formattedData);
            alert(`פקודת ${orderType === "BUY" ? "קנייה" : "מכירה"} בוצעה בהצלחה!`);
            resetTrade();
            await fetchAccountData();
        } catch (error) {
            alert(error.response?.data?.detail || "Trade execution failed.");
        } finally {
            setIsSubmittingTrade(false);
        }
    };

    const onCashSubmit = async (data) => {
        setIsSubmittingCash(true);
        const formattedData = {
            ...data,
            type: cashType
        };

        try {
            await executeCashTransaction(formattedData);
            alert(`פעולת ${cashType === "DEPOSIT" ? "הפקדה" : "משיכה"} בוצעה בהצלחה!`);
            resetCash();
            await fetchAccountData();
        } catch (error) {
            alert(error.response?.data?.detail || "Cash transaction failed.");
        } finally {
            setIsSubmittingCash(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 w-full space-y-6" dir="rtl">
            
            {/* Header Toolbar with Balances & Import Action Button */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch md:items-center justify-between bg-[#121214] border border-emerald-500/30 p-4 sm:p-6 rounded-3xl shadow-xl shadow-emerald-900/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none hidden sm:block">
                    <Wallet size={120} className="text-emerald-500" />
                </div>
                
                <div className="z-10">
                    <h2 className="text-zinc-400 font-semibold tracking-wide uppercase text-xs sm:text-sm mb-1">
                        מזומן זמין למסחר
                    </h2>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-400 font-mono" dir="ltr">
                        <span>{isLoadingSummary ? "..." : formatCurrency(summary.available_cash)}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 z-10 w-full md:w-auto">
                    <div className="bg-zinc-900/80 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-zinc-800 w-full sm:w-auto text-center sm:text-right">
                        <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-0.5">שווי חשבון כולל</h3>
                        <p className="text-lg sm:text-xl font-bold text-white font-mono" dir="ltr">
                            {isLoadingSummary ? "..." : formatCurrency(summary.total_account_value)}
                        </p>
                    </div>

                    {/* AI Excel / CSV Import Trigger Button */}
                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="group relative flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 hover:border-emerald-400/60 transition-all active:scale-95 w-full sm:w-auto overflow-hidden cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200 group-hover:scale-110 transition-transform flex-shrink-0" />
                        <span>ייבא מניות מאקסל</span>
                        <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold bg-black/30 text-emerald-200 px-2 py-0.5 rounded-full border border-white/10" dir="ltr">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" /> AI
                        </span>
                    </button>
                </div>
            </div>

            {/* Import Portfolio Modal */}
            <ImportPortfolioModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchAccountData();
                }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Stock Trading Form */}
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between gap-3 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <ArrowRightLeft className="text-blue-500 w-5 h-5" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">מסחר במניות</h3>
                            </div>

                            {/* Holdings Counter Badge in Sell Mode */}
                            {orderType === "SELL" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400">
                                    <Layers className="w-3.5 h-3.5 text-rose-400" />
                                    <span>{portfolioPositions.length} מניות בתיק</span>
                                </span>
                            )}
                        </div>

                        {/* Order Type Toggle (BUY vs SELL) */}
                        <div className="flex gap-3 sm:gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => handleOrderTypeChange("BUY")}
                                className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ease-in-out focus:outline-none cursor-pointer ${
                                    orderType === "BUY"
                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-500"
                                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                            >
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <TrendingUp className="w-4 h-4" /> קנייה (Buy)
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleOrderTypeChange("SELL")}
                                className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ease-in-out focus:outline-none cursor-pointer ${
                                    orderType === "SELL"
                                        ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-500"
                                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                            >
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <TrendingDown className="w-4 h-4" /> מכירה (Sell)
                                </span>
                            </button>
                        </div>

                        <form onSubmit={handleTradeSubmit(onTradeSubmit)} className="space-y-4 sm:space-y-5">
                            {/* Dynamic Stock Input (Free-text for BUY, Dropdown for SELL) */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs sm:text-sm font-medium text-zinc-400">
                                        {orderType === "BUY" ? "סימול מניה (Ticker)" : "בחר מניה למכירה מהתיק"}
                                    </label>
                                    {orderType === "SELL" && selectedPosition && (
                                        <span className="text-xs font-mono text-emerald-400 font-semibold">
                                            זמין: {availableShares} מניות
                                        </span>
                                    )}
                                </div>

                                {orderType === "BUY" ? (
                                    <>
                                        <input
                                            type="hidden"
                                            {...registerTrade("ticker", { required: "נא להזין סימול מניה" })}
                                        />
                                        <StockSearchAutocomplete
                                            value={watchTicker}
                                            onChange={(val) => {
                                                setValueTrade("ticker", val.toUpperCase(), { shouldValidate: true });
                                            }}
                                            onSelect={(stock) => {
                                                setValueTrade("ticker", stock.symbol.toUpperCase(), { shouldValidate: true });
                                                clearTradeErrors("ticker");
                                            }}
                                            placeholder="הזן סימול או שם חברה (למשל: Apple, AAPL, NVDA)..."
                                            inputClassName="bg-zinc-900/50 border-zinc-800 focus:border-emerald-500 uppercase font-mono text-sm"
                                        />
                                    </>
                                ) : portfolioPositions.length > 0 ? (
                                    <select
                                        {...registerTrade("ticker", { required: "נא לבחור מניה מהתיק" })}
                                        onChange={handleSellTickerSelect}
                                        value={watchTicker}
                                        className="w-full px-4 py-2.5 sm:py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-rose-500 font-mono text-sm cursor-pointer transition-colors"
                                        dir="rtl"
                                    >
                                        <option value="" disabled>
                                            -- בחר מניה מהתיק --
                                        </option>
                                        {portfolioPositions.map((pos) => (
                                            <option key={pos.ticker} value={pos.ticker}>
                                                {pos.ticker} (זמין: {pos.shares} מניות)
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span>אין מניות זמינות למכירה בתיק ההשקעות שלך.</span>
                                    </div>
                                )}

                                {tradeErrors.ticker && (
                                    <p className="text-xs text-rose-500">{tradeErrors.ticker.message}</p>
                                )}
                            </div>

                            {/* Quantity (Shares) & Price Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs sm:text-sm font-medium text-zinc-400">
                                            כמות מניות
                                        </label>
                                        {orderType === "SELL" && availableShares > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleSetMaxShares}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                            >
                                                <Maximize2 className="w-3 h-3" />
                                                <span>מכור הכל ({availableShares})</span>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        {...registerTrade("shares", {
                                            required: "שדה חובה",
                                            valueAsNumber: true,
                                            min: { value: 0.0001, message: "הכמות חייבת להיות גדולה מ-0" },
                                            ...(orderType === "SELL" && availableShares > 0
                                                ? {
                                                      max: {
                                                          value: availableShares,
                                                          message: `הכמות חורגת מהיתרה הזמינה בתיק (${availableShares})`
                                                      }
                                                  }
                                                : {})
                                        })}
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        disabled={orderType === "SELL" && portfolioPositions.length === 0}
                                        className="w-full px-4 py-2.5 sm:py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                        dir="ltr"
                                    />
                                    {tradeErrors.shares && (
                                        <p className="text-xs text-rose-500">{tradeErrors.shares.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs sm:text-sm font-medium text-zinc-400">מחיר מניה ($)</label>
                                    <input
                                        {...registerTrade("price", {
                                            required: "שדה חובה",
                                            valueAsNumber: true,
                                            min: { value: 0.01, message: "המחיר חייב להיות חיובי" }
                                        })}
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        disabled={orderType === "SELL" && portfolioPositions.length === 0}
                                        className="w-full px-4 py-2.5 sm:py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                        dir="ltr"
                                    />
                                    {tradeErrors.price && (
                                        <p className="text-xs text-rose-500">{tradeErrors.price.message}</p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Summary Cost / Value */}
                            <div className="flex justify-between items-center py-2.5 border-t border-zinc-800/50 mt-4">
                                <span className="text-zinc-400 text-xs sm:text-sm">
                                    {orderType === "BUY" ? "סך עלות משוערת:" : "סך תקבול משוער ממכירה:"}
                                </span>
                                <span
                                    className={`font-mono font-bold text-sm sm:text-base ${
                                        isBuyDisabled || isSellExceeded ? "text-rose-400" : "text-white"
                                    }`}
                                    dir="ltr"
                                >
                                    {formatCurrency(totalCost)}
                                </span>
                            </div>
                            
                            {/* Insufficient Cash Warning for BUY */}
                            {isBuyDisabled && (
                                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                                    ⚠️ יתרת המזומן ({formatCurrency(summary.available_cash)}) אינה מספיקה לביצוע פקודת קנייה זו.
                                </p>
                            )}

                            {/* Over-holding Warning for SELL */}
                            {isSellExceeded && availableShares > 0 && (
                                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                                    ⚠️ הכמות שהוזנה ({watchShares}) עולה על מספר המניות הזמינות בתיק ({availableShares}).
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmittingTrade || isBuyDisabled || isSellDisabled}
                                className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                                    isSubmittingTrade || isBuyDisabled || isSellDisabled
                                        ? "opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400"
                                        : orderType === "BUY"
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                                        : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/30"
                                }`}
                            >
                                {isSubmittingTrade
                                    ? "מבצע פקודה..."
                                    : `בצע פקודת ${orderType === "BUY" ? "קנייה" : "מכירה"}`}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Cash Management Form */}
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <DollarSign className="text-amber-500 w-5 h-5" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-white">ניהול מזומן</h3>
                        </div>

                        <div className="flex gap-3 sm:gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => setCashType("DEPOSIT")}
                                className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ease-in-out focus:outline-none cursor-pointer ${
                                    cashType === "DEPOSIT"
                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-500"
                                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                            >
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <ArrowDownToLine className="w-4 h-4" /> הפקדה (Deposit)
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCashType("WITHDRAW")}
                                className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ease-in-out focus:outline-none cursor-pointer ${
                                    cashType === "WITHDRAW"
                                        ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-500"
                                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                            >
                                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <ArrowUpFromLine className="w-4 h-4" /> משיכה (Withdraw)
                                </span>
                            </button>
                        </div>

                        <form onSubmit={handleCashSubmit(onCashSubmit)} className="space-y-4 sm:space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-400">סכום במזומן ($)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                                    <input
                                        {...registerCash("cash_amount", {
                                            required: "נא להזין סכום",
                                            valueAsNumber: true,
                                            min: { value: 0.01, message: "הסכום חייב להיות גדול מ-0" }
                                        })}
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono text-sm"
                                        dir="ltr"
                                    />
                                </div>
                                {cashErrors.cash_amount && (
                                    <p className="text-xs text-rose-500">{cashErrors.cash_amount.message}</p>
                                )}
                            </div>

                            <div className="pt-4 sm:pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmittingCash}
                                    className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                                        isSubmittingCash
                                            ? "opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400"
                                            : cashType === "DEPOSIT"
                                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                                            : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/30"
                                    }`}
                                >
                                    {isSubmittingCash
                                        ? "מעבד פעולה..."
                                        : `בצע ${cashType === "DEPOSIT" ? "הפקדת" : "משיכת"} מזומן`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Orders;