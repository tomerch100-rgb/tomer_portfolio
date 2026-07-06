import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { addTolist, showList, getStockDetails } from "../service/watchlistService";
import useFetchData from "../hooks/useFetchData";
import { Search, Plus, TrendingUp, TrendingDown, DollarSign, Activity, BarChart2, Loader2, Star } from "lucide-react";

function Watchlist() {
    const { ticker } = useParams();
    const navigate = useNavigate();

    // 1. משיכת רשימת המעקב בצורה נקייה - בלי useState כפול!
    const { data: watchlistData = [], isLoading: isListLoading, refetch } = useFetchData(showList);

    // 2. משיכת נתוני המניה הספציפית בעזרת ה-Hook (מותנה בכך שיש ticker)
    const { data: stockDetails, isLoading: isDetailsLoading, error: detailsError } =
        useFetchData(() => ticker ? getStockDetails(ticker) : null, [ticker]);

    const [searchTicker, setSearchTicker] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [addFeedback, setAddFeedback] = useState("");

    // ניווט אוטומטי למניה הראשונה ברשימה אם המשתמש לא בחר מניה ספציפית
    useEffect(() => {
        if (!ticker && watchlistData.length > 0) {
            navigate(`/watchlist/${watchlistData[0]}`);
        }
    }, [ticker, watchlistData, navigate]);

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (!searchTicker.trim()) return;

        setIsAdding(true);
        setAddFeedback("");
        const targetTicker = searchTicker.trim().toUpperCase();

        try {
            const res = await addTolist(targetTicker);
            if (res === "success") {
                setAddFeedback("המניה נוספה בהצלחה!");
                setSearchTicker("");
                refetch(); // מרענן את הרשימה מהשרת אוטומטית
                navigate(`/watchlist/${targetTicker}`);
            } else {
                setAddFeedback(res || "שגיאה בהוספת מניה");
            }
        } catch (err) {
            setAddFeedback("שגיאה בחיבור לשרת");
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 text-zinc-100" dir="rtl">
            <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">

                {/* SideBar / Watchlist List */}
                <div className="w-full md:w-80 flex-shrink-0 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 flex flex-col gap-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-white">
                            <Star className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                            רשימת מעקב
                        </h2>
                        <p className="text-xs text-zinc-400">עקוב אחר המניות המועדפות עליך</p>
                    </div>

                    {/* Add Stock Form */}
                    <form onSubmit={handleAddStock} className="space-y-2">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTicker}
                                onChange={(e) => setSearchTicker(e.target.value)}
                                placeholder="הכנס סימול (למשל TSLA)"
                                className="w-full pl-4 pr-10 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200 text-sm font-semibold uppercase"
                            />
                            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                                <Search className="w-4 h-4" />
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={isAdding}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            הוסף מניה
                        </button>
                        {addFeedback && <p className="text-xs text-center font-medium text-emerald-400 mt-1">{addFeedback}</p>}
                    </form>

                    {/* Watchlist Items */}
                    <div className="flex-grow overflow-y-auto space-y-2 max-h-[350px] pr-1">
                        {isListLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                            </div>
                        ) : watchlistData.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-8">אין מניות ברשימת המעקב</p>
                        ) : (
                            watchlistData.map((item) => {
                                const isActive = ticker === item;
                                return (
                                    <Link
                                        key={item}
                                        to={`/watchlist/${item}`}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${isActive
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                                                : "bg-zinc-950/20 border-zinc-800/40 hover:bg-zinc-900/60 text-zinc-300"
                                            }`}
                                    >
                                        <span className="font-mono tracking-wider">{item}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/30 font-medium">צפה</span>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Details Area */}
                <div className="flex-grow bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-8 flex flex-col justify-between">
                    {isDetailsLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                            <p className="text-sm text-zinc-400">טוען נתונים פיננסיים חיים...</p>
                        </div>
                    ) : detailsError || (stockDetails && stockDetails.error) ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                                <span className="text-rose-500 text-xl font-bold">!</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">לא ניתן להציג את נתוני המניה</h3>
                            <p className="text-sm text-zinc-400 max-w-sm">{detailsError || stockDetails?.error}</p>
                        </div>
                    ) : stockDetails ? (
                        <div className="space-y-8">
                            {/* Stock Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-extrabold tracking-wider text-white font-mono">{stockDetails.ticker}</h1>
                                        {stockDetails.recommendation && stockDetails.recommendation !== "N/A" && (
                                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                                                המלצה: {stockDetails.recommendation}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-400 mt-1">נתונים בזמן אמת מ-Yahoo Finance</p>
                                </div>

                                <div className="text-left font-mono">
                                    <div className="text-3xl font-bold text-white">
                                        ${stockDetails.current_price?.toFixed(2) || "N/A"}
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-semibold justify-end mt-1 ${stockDetails.change >= 0 ? "text-emerald-400" : "text-rose-400"
                                        }`}>
                                        {stockDetails.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        <span>{stockDetails.change >= 0 ? "+" : ""}{stockDetails.change?.toFixed(2)}</span>
                                        <span>({stockDetails.change_percent >= 0 ? "+" : ""}{stockDetails.change_percent?.toFixed(2)}%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-1.5 shadow-inner">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                        מחיר אחרון
                                    </div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        ${stockDetails.current_price?.toLocaleString() || "N/A"}
                                    </div>
                                </div>

                                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-1.5 shadow-inner">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        שווי שוק (Market Cap)
                                    </div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        {stockDetails.market_cap ? `$${(stockDetails.market_cap / 1e9).toFixed(2)}B` : "N/A"}
                                    </div>
                                </div>

                                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-1.5 shadow-inner">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                                        <BarChart2 className="w-4 h-4 text-emerald-500" />
                                        מכפיל רווח (P/E Ratio)
                                    </div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        {stockDetails.pe_ratio && stockDetails.pe_ratio !== "N/A" ? stockDetails.pe_ratio.toFixed(2) : "N/A"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                            <Star className="w-12 h-12 text-zinc-600 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">בחר מניה מהרשימה</h3>
                            <p className="text-sm text-zinc-400">בחר מניה מהתפריט הימני או הוסף מניה חדשה על מנת לצפות בביצועים החיים.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default Watchlist;