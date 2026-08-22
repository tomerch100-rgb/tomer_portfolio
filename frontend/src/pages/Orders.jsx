import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { executeTrade, executeCashTransaction } from "../services/ordersService";
import { getTransactionsSummary } from "../services/dashbordService";
import { DollarSign, Wallet, ArrowRightLeft, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, Sparkles } from "lucide-react";
import ImportPortfolioModal from "../components/ImportPortfolioModal";

function Orders() {
    const { register: registerTrade, handleSubmit: handleTradeSubmit, formState: { errors: tradeErrors }, reset: resetTrade, watch: watchTrade } = useForm();
    const { register: registerCash, handleSubmit: handleCashSubmit, formState: { errors: cashErrors }, reset: resetCash } = useForm();
    
    const [orderType, setOrderType] = useState("BUY");
    const [cashType, setCashType] = useState("DEPOSIT");
    
    const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);
    const [isSubmittingCash, setIsSubmittingCash] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    const [summary, setSummary] = useState({ available_cash: 0, total_account_value: 0 });
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    const fetchSummary = async () => {
        try {
            const data = await getTransactionsSummary();
            setSummary(data);
        } catch (error) {
            console.error("Failed to load summary", error);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const watchShares = watchTrade("shares", 0);
    const watchPrice = watchTrade("price", 0);
    const totalCost = (Number(watchShares) || 0) * (Number(watchPrice) || 0);

    const isBuyDisabled = orderType === "BUY" && totalCost > summary.available_cash;

    const onTradeSubmit = async (data) => {
        setIsSubmittingTrade(true);
        const formattedData = {
            ...data,
            ticker: data.ticker.toUpperCase(),
            type: orderType
        };

        try {
            await executeTrade(formattedData);
            alert("Trade executed successfully!");
            resetTrade();
            fetchSummary();
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
            alert("Cash transaction successful!");
            resetCash();
            fetchSummary();
        } catch (error) {
            alert(error.response?.data?.detail || "Cash transaction failed.");
        } finally {
            setIsSubmittingCash(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 font-sans space-y-8">
            
            {/* Header Toolbar with Balances & Import Action Button */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-[#121214] border border-emerald-500/30 p-6 rounded-3xl shadow-xl shadow-emerald-900/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Wallet size={120} className="text-emerald-500" />
                </div>
                
                <div className="z-10">
                    <h2 className="text-zinc-400 font-semibold tracking-wide uppercase text-sm mb-1">Available Cash</h2>
                    <div className="flex items-center gap-3 text-4xl font-bold text-emerald-400">
                        <DollarSign className="w-8 h-8" />
                        {isLoadingSummary ? "..." : formatCurrency(summary.available_cash)}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full md:w-auto">
                    <div className="bg-zinc-900/80 px-6 py-4 rounded-2xl border border-zinc-800 w-full sm:w-auto text-center sm:text-right">
                        <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Total Account Value</h3>
                        <p className="text-xl font-bold text-white">{isLoadingSummary ? "..." : formatCurrency(summary.total_account_value)}</p>
                    </div>

                    {/* AI Excel / CSV Import Trigger Button */}
                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="group relative flex items-center justify-center gap-2.5 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 hover:border-emerald-400/60 transition-all active:scale-95 w-full sm:w-auto overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <FileSpreadsheet className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
                        <span>ייבא מניות מאקסל</span>
                        <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold bg-black/30 text-emerald-200 px-2 py-0.5 rounded-full border border-white/10">
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
                    fetchSummary();
                }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stock Trading Form */}
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <ArrowRightLeft className="text-blue-500 w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Stock Trading</h3>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <button
                            type="button"
                            onClick={() => setOrderType("BUY")}
                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out focus:outline-none ${orderType === "BUY"
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-500"
                                    : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Buy
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOrderType("SELL")}
                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out focus:outline-none ${orderType === "SELL"
                                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-500"
                                    : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <TrendingDown className="w-4 h-4" /> Sell
                            </span>
                        </button>
                    </div>

                    <form onSubmit={handleTradeSubmit(onTradeSubmit)} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-zinc-400">Stock Ticker</label>
                            <input
                                {...registerTrade("ticker", { required: "Ticker is required" })}
                                type="text"
                                placeholder="e.g. AAPL"
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 uppercase"
                            />
                            {tradeErrors.ticker && <p className="text-xs text-rose-500">{tradeErrors.ticker.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-400">Shares</label>
                                <input
                                    {...registerTrade("shares", { required: "Required", valueAsNumber: true, min: 0.0001 })}
                                    type="number" step="any" placeholder="0.00"
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-400">Price</label>
                                <input
                                    {...registerTrade("price", { required: "Required", valueAsNumber: true, min: 0.01 })}
                                    type="number" step="any" placeholder="0.00"
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-t border-zinc-800/50 mt-4">
                            <span className="text-zinc-400 text-sm">Estimated Total</span>
                            <span className={`font-mono font-bold ${isBuyDisabled ? 'text-rose-400' : 'text-white'}`}>
                                {formatCurrency(totalCost)}
                            </span>
                        </div>
                        
                        {isBuyDisabled && (
                            <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                ⚠️ Insufficient available cash for this order.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmittingTrade || isBuyDisabled}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all ${
                                isSubmittingTrade || isBuyDisabled ? "opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400" 
                                : orderType === "BUY" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-rose-600 hover:bg-rose-500 text-white"
                            }`}
                        >
                            {isSubmittingTrade ? "Processing..." : `Execute ${orderType}`}
                        </button>
                    </form>
                </div>

                {/* Cash Management Form */}
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <DollarSign className="text-amber-500 w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Cash Management</h3>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <button
                            type="button"
                            onClick={() => setCashType("DEPOSIT")}
                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out focus:outline-none ${cashType === "DEPOSIT"
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-500"
                                    : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <ArrowDownToLine className="w-4 h-4" /> Deposit
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCashType("WITHDRAW")}
                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out focus:outline-none ${cashType === "WITHDRAW"
                                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-500"
                                    : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <ArrowUpFromLine className="w-4 h-4" /> Withdraw
                            </span>
                        </button>
                    </div>

                    <form onSubmit={handleCashSubmit(onCashSubmit)} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-zinc-400">Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                                <input
                                    {...registerCash("cash_amount", { required: "Amount is required", valueAsNumber: true, min: 0.01 })}
                                    type="number" step="any" placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            {cashErrors.cash_amount && <p className="text-xs text-rose-500">{cashErrors.cash_amount.message}</p>}
                        </div>

                        <div className="pt-4 mt-8">
                            <button
                                type="submit"
                                disabled={isSubmittingCash}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all ${
                                    isSubmittingCash ? "opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400" 
                                    : cashType === "DEPOSIT" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-rose-600 hover:bg-rose-500 text-white"
                                }`}
                            >
                                {isSubmittingCash ? "Processing..." : `${cashType} Cash`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Orders;