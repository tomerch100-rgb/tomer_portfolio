import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';
import { useWebSocketEvent } from '../hooks/useWebSocket';
import { BellRing, Sparkles, Target, ShieldAlert, X } from 'lucide-react';

function ProtectedLayout() {
    const { isAuthenticated, isVerifying } = useSelector((state) => state.auth);
    const [globalToast, setGlobalToast] = useState(null);

    // 🔔 1. Global Listener: Watchlist Price Alerts (Target reached)
    useWebSocketEvent("ALERT_TRIGGERED", (event) => {
        const payload = event?.payload || event;
        const ticker = (payload?.ticker || payload?.symbol)?.toUpperCase();
        if (!ticker) return;

        setGlobalToast({
            type: "WATCHLIST",
            ticker,
            title: `התראת יעד: ${ticker}`,
            message: payload?.message || `מניית ${ticker} הגיעה למחיר היעד ($${Number(payload?.price || 0).toFixed(2)})!`,
            icon: "bell"
        });

        setTimeout(() => setGlobalToast(null), 8000);
    });

    // 🎯 2. Global Listener: Portfolio Take Profit & Stop Loss Alerts
    useWebSocketEvent("PORTFOLIO_ALERT_TRIGGERED", (event) => {
        const payload = event?.payload || event;
        const ticker = (payload?.ticker || payload?.symbol)?.toUpperCase();
        const alertType = payload?.alert_type; // 'TAKE_PROFIT' | 'STOP_LOSS'
        if (!ticker) return;

        const isTp = alertType === "TAKE_PROFIT";
        setGlobalToast({
            type: "PORTFOLIO",
            ticker,
            title: isTp ? `🎯 Take Profit: ${ticker}` : `🛑 Stop Loss: ${ticker}`,
            message: payload?.message || `פוזיציית ${ticker} חצתה את רף ההתראה שהוגדר.`,
            icon: isTp ? "tp" : "sl"
        });

        setTimeout(() => setGlobalToast(null), 9000);
    });

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 relative">
            
            {/* Global Floating Toast Alert */}
            {globalToast && (
                <div 
                    className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#121214]/95 border border-emerald-500/40 text-white px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 max-w-md"
                    dir="rtl"
                >
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                        globalToast.icon === "tp" 
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                            : globalToast.icon === "sl" 
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" 
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}>
                        {globalToast.icon === "tp" && <Target className="w-5 h-5" />}
                        {globalToast.icon === "sl" && <ShieldAlert className="w-5 h-5" />}
                        {globalToast.icon === "bell" && <BellRing className="w-5 h-5 animate-bounce" />}
                    </div>

                    <div className="flex-1 min-w-0 text-right">
                        <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                            {globalToast.title}
                            <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-700">
                                LIVE
                            </span>
                        </h4>
                        <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">{globalToast.message}</p>
                    </div>

                    <button
                        onClick={() => setGlobalToast(null)}
                        className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default ProtectedLayout;