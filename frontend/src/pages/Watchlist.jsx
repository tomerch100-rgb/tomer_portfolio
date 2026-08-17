import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showList, getStockDetails } from "../services/watchlistService";
import useFetchData from "../hooks/useFetchData";
import TelegramConnect from "../components/TelegramConnect";
import SmartWatchlistAddForm from "../components/watchlist/SmartWatchlistAddForm";
import WatchlistTable from "../components/watchlist/WatchlistTable";
import EditAlertModal from "../components/watchlist/EditAlertModal";
import {
    Star, ShieldCheck, Target, TrendingUp, TrendingDown,
    BarChart2, Activity, PieChart, Layers, DollarSign, Bell
} from "lucide-react";

function Watchlist() {
    const { ticker } = useParams();
    const navigate = useNavigate();

    // Fetch watchlist items with enriched live prices and alert statuses
    const { data: rawWatchlistData = [], isLoading: isListLoading, refetch } = useFetchData(showList);
    
    // Local state for optimistic updates
    const [watchlistItems, setWatchlistItems] = useState([]);

    useEffect(() => {
        if (Array.isArray(rawWatchlistData)) {
            setWatchlistItems(rawWatchlistData);
        }
    }, [rawWatchlistData]);

    // Fetch stock fundamental details for selected ticker
    const { data: stockDetails, isLoading: isDetailsLoading, error: detailsError } =
        useFetchData(() => (ticker ? getStockDetails(ticker) : null), [ticker]);

    // Modal state
    const [selectedAlertItem, setSelectedAlertItem] = useState(null);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

    // Auto-navigate to first stock if no ticker selected in URL
    useEffect(() => {
        if (!ticker && watchlistItems.length > 0) {
            const firstItem = typeof watchlistItems[0] === "string" ? watchlistItems[0] : watchlistItems[0].ticker;
            navigate(`/watchlist/${firstItem}`);
        }
    }, [ticker, watchlistItems, navigate]);

    // Handle opening the Edit Alert Modal
    const handleOpenEditAlert = (item) => {
        setSelectedAlertItem(item);
        setIsAlertModalOpen(true);
    };

    // Callback when an alert is updated or cleared
    const handleAlertUpdated = (targetTicker, updatedFields) => {
        setWatchlistItems((prev) =>
            prev.map((item) => {
                const sym = typeof item === "string" ? item : item.ticker;
                if (sym.toUpperCase() === targetTicker.toUpperCase()) {
                    return {
                        ...item,
                        ...updatedFields
                    };
                }
                return item;
            })
        );
        refetch();
    };

    // Callback when a new stock is added
    const handleStockAdded = (newTicker) => {
        refetch();
        navigate(`/watchlist/${newTicker}`);
    };

    // Formatters
    const formatCurrency = (val, symbol = "$") => {
        if (val === null || val === undefined || isNaN(Number(val))) return "N/A";
        return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatLargeNumber = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "N/A";
        const num = Number(val);
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toLocaleString()}`;
    };

    const formatPercent = (val, isDecimalRatio = false) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "N/A";
        const num = Number(val);
        const pct = isDecimalRatio ? num * 100 : num;
        return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
    };

    const calc52WeekProgress = () => {
        if (!stockDetails?.fifty_two_week_low || !stockDetails?.fifty_two_week_high || !stockDetails?.current_price) return 50;
        const low = stockDetails.fifty_two_week_low;
        const high = stockDetails.fifty_two_week_high;
        const current = stockDetails.current_price;
        if (high === low) return 50;
        const pct = ((current - low) / (high - low)) * 100;
        return Math.max(0, Math.min(100, pct));
    };

    const translateRecommendation = (rec) => {
        if (!rec || rec === "N/A") return "אין דירוג";
        const map = {
            buy: "קנייה (Buy)",
            strong_buy: "קנייה חזקה (Strong Buy)",
            hold: "החזקה (Hold)",
            underperform: "ביצועי חסר (Underperform)",
            sell: "מכירה (Sell)"
        };
        return map[rec.toLowerCase()] || rec.toUpperCase();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 text-zinc-100 font-sans" dir="rtl">
            {/* Top Telegram Connect Banner */}
            <div className="mb-6">
                <TelegramConnect />
            </div>

            {/* Main Watchlist Layout */}
            <div className="flex flex-col lg:flex-row gap-8 min-h-[750px]">
                {/* Left/Sidebar Panel: Add Form & Interactive Watchlist Table */}
                <div className="w-full lg:w-[480px] flex-shrink-0 flex flex-col gap-6">
                    {/* Header */}
                    <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <Star className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                                    רשימת מעקב והתראות
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    הגדר מחירי יעד וקבל התראות לטלגרם
                                </p>
                            </div>
                        </div>

                        {/* Smart Add Form */}
                        <SmartWatchlistAddForm onSuccess={handleStockAdded} />
                    </div>

                    {/* Interactive Table View */}
                    <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            מניות במעקב ({watchlistItems.length})
                        </h3>

                        <WatchlistTable
                            items={watchlistItems}
                            selectedTicker={ticker}
                            onSelectTicker={(sym) => navigate(`/watchlist/${sym}`)}
                            onOpenEditAlert={handleOpenEditAlert}
                            isLoading={isListLoading}
                        />
                    </div>
                </div>

                {/* Right Panel: Main Fundamental Research Display */}
                <div className="flex-grow bg-[#121214] border border-zinc-800/80 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-xl">
                    {isDetailsLoading ? (
                        /* Skeleton Loader */
                        <div className="space-y-8 animate-pulse">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3">
                                    <div className="h-8 w-48 bg-zinc-800 rounded-lg" />
                                    <div className="h-4 w-32 bg-zinc-800/60 rounded" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <div className="h-8 w-28 bg-zinc-800 rounded-lg" />
                                    <div className="h-4 w-20 bg-zinc-800/60 rounded" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-24 bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
                                        <div className="h-3 w-16 bg-zinc-800 rounded" />
                                        <div className="h-6 w-24 bg-zinc-800/80 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : detailsError || (stockDetails && stockDetails.error) ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">שגיאה בטעינת נתונים פיננסיים</h3>
                            <p className="text-sm text-zinc-400 max-w-md">{detailsError || stockDetails?.error}</p>
                        </div>
                    ) : stockDetails ? (
                        <div className="space-y-8">
                            {/* Header Banner */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight font-mono">
                                            {stockDetails.ticker}
                                        </h1>
                                        <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono rounded-lg">
                                            {stockDetails.exchange || "NASDAQ"}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-semibold text-zinc-300 mt-1">
                                        {stockDetails.company_name}
                                    </h2>
                                </div>

                                {/* Price & Day Change & Quick Alert Button */}
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            const found = watchlistItems.find(
                                                (w) => (typeof w === "string" ? w : w.ticker) === stockDetails.ticker
                                            );
                                            handleOpenEditAlert(
                                                found || {
                                                    ticker: stockDetails.ticker,
                                                    current_price: stockDetails.current_price,
                                                    target_price: null,
                                                    alert_triggered: false
                                                }
                                            );
                                        }}
                                        className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                                    >
                                        <Bell className="w-4 h-4" />
                                        <span>הגדר התראה למניה זו</span>
                                    </button>

                                    <div className="text-left font-mono" dir="ltr">
                                        <div className="text-3xl lg:text-4xl font-extrabold text-white">
                                            {formatCurrency(stockDetails.current_price)}
                                        </div>
                                        <div
                                            className={`flex items-center gap-1.5 text-sm font-semibold justify-end mt-1 ${
                                                Number(stockDetails.change) >= 0 ? "text-emerald-400" : "text-rose-400"
                                            }`}
                                        >
                                            {Number(stockDetails.change) >= 0 ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                            <span>{formatCurrency(stockDetails.change)}</span>
                                            <span>({formatPercent(stockDetails.change_percent)})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 1: Valuation Metrics */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-emerald-500" />
                                    יחסי הערכת שווי (Valuation Metrics)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">שווי שוק</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {formatLargeNumber(stockDetails.market_cap)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">מכפיל רווח (P/E)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {stockDetails.pe_ratio ? Number(stockDetails.pe_ratio).toFixed(2) : "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">מכפיל עתידי (Forward P/E)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {stockDetails.forward_pe ? Number(stockDetails.forward_pe).toFixed(2) : "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">יחס PEG</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {stockDetails.peg_ratio ? Number(stockDetails.peg_ratio).toFixed(2) : "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">מכפיל הון (P/B)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {stockDetails.price_to_book ? Number(stockDetails.price_to_book).toFixed(2) : "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">מכפיל מכירות (P/S)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {stockDetails.price_to_sales ? Number(stockDetails.price_to_sales).toFixed(2) : "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">תשואת דיבידנד</span>
                                        <div className="text-lg font-bold text-emerald-400 font-mono" dir="ltr">
                                            {formatPercent(stockDetails.dividend_yield, true)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">תאריך אקס-דיבידנד</span>
                                        <div className="text-sm font-semibold text-white font-mono">
                                            {stockDetails.ex_dividend_date || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Financial Health & Profitability */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    רווחיות ואיתנות פיננסית (Profitability & Financial Health)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">סך הכנסות (Revenue)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {formatLargeNumber(stockDetails.total_revenue)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">רווח נקי (Net Income)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {formatLargeNumber(stockDetails.net_income)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">שיעור רווח נקי</span>
                                        <div className="text-lg font-bold text-emerald-400 font-mono" dir="ltr">
                                            {formatPercent(stockDetails.profit_margins, true)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">שיעור רווח תפעולי</span>
                                        <div className="text-lg font-bold text-emerald-400 font-mono" dir="ltr">
                                            {formatPercent(stockDetails.operating_margins, true)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">תשואה להון (ROE)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {formatPercent(stockDetails.return_on_equity, true)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">תשואה לנכסים (ROA)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {formatPercent(stockDetails.return_on_assets, true)}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">יחס חוב להון (D/E)</span>
                                        <div className="text-lg font-bold text-white font-mono" dir="ltr">
                                            {stockDetails.debt_to_equity ? Number(stockDetails.debt_to_equity).toFixed(2) : "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                                        <span className="text-xs text-zinc-400">דירוג אנליסטים</span>
                                        <div className="text-sm font-extrabold text-emerald-400 font-sans">
                                            {translateRecommendation(stockDetails.recommendation)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: 52-Week Range & Analyst Targets */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* 52-Week Range Bar */}
                                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        <span>טווח מסחר 52 שבועות</span>
                                        <span className="font-mono text-zinc-200" dir="ltr">
                                            {formatCurrency(stockDetails.current_price)}
                                        </span>
                                    </div>

                                    <div className="relative w-full h-3 bg-zinc-800 rounded-full overflow-hidden" dir="ltr">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 via-yellow-500 to-emerald-500 transition-all duration-500 rounded-full"
                                            style={{ width: `${calc52WeekProgress()}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs font-mono text-zinc-400" dir="ltr">
                                        <div>
                                            <span className="text-zinc-500">שפל: </span>
                                            <span className="text-zinc-300 font-bold">
                                                {formatCurrency(stockDetails.fifty_two_week_low)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">שיא: </span>
                                            <span className="text-zinc-300 font-bold">
                                                {formatCurrency(stockDetails.fifty_two_week_high)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Analyst Price Targets */}
                                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <Target className="w-4 h-4 text-emerald-500" />
                                            יעדי מחיר ממוצעים של אנליסטים (12 חודשים)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center font-mono" dir="ltr">
                                        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
                                            <div className="text-[11px] text-zinc-500">יעד נמוך</div>
                                            <div className="text-sm font-bold text-rose-400 mt-0.5">
                                                {formatCurrency(stockDetails.target_low)}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-emerald-500/30">
                                            <div className="text-[11px] text-zinc-400">יעד ממוצע</div>
                                            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
                                                {formatCurrency(stockDetails.target_mean)}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
                                            <div className="text-[11px] text-zinc-500">יעד גבוה</div>
                                            <div className="text-sm font-bold text-emerald-400 mt-0.5">
                                                {formatCurrency(stockDetails.target_high)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                            <Star className="w-12 h-12 text-zinc-600 mb-4 animate-pulse" />
                            <h3 className="text-xl font-bold text-white mb-2">בחר מניה מהרשימה</h3>
                            <p className="text-sm text-zinc-400 max-w-md">
                                בחר מניה מהרשימה או הוסף מניה חדשה לצפייה במחקר הפונדמנטלי המקיף.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Alert Modal */}
            <EditAlertModal
                isOpen={isAlertModalOpen}
                onClose={() => setIsAlertModalOpen(false)}
                item={selectedAlertItem}
                onAlertUpdated={handleAlertUpdated}
            />
        </div>
    );
}

export default Watchlist;