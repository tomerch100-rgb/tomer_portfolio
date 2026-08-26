import React, { useMemo, useState, useEffect } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel
} from '@tanstack/react-table';
import { displayPortfolio, updatePositionAnalysis } from '../services/dashbordService';
import useFetchData from '../hooks/useFetchData';
import { useWebSocketEvent } from '../hooks/useWebSocket';
import {
  Loader2,
  AlertCircle,
  Save,
  Check,
  Target,
  ShieldAlert,
  BellRing,
  CheckCircle2,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "$0.00";
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const formatPercent = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0.00%";
    return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
};

// Editable Cell Component with Active TP/SL Badges & State Reset
const EditableCell = ({ getValue, row, column, table }) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setValue(initialValue || '');
    }, [initialValue]);

    const onBlur = async () => {
        if (value === initialValue) return;
        setIsSaving(true);
        try {
            const updates = {
                risk_level: row.original.risk_level,
                take_profit: row.original.take_profit,
                stop_loss: row.original.stop_loss,
                [column.id]: value === '' ? null : value
            };

            await updatePositionAnalysis(
                row.original.ticker,
                updates.risk_level,
                updates.take_profit ? Number(updates.take_profit) : null,
                updates.stop_loss ? Number(updates.stop_loss) : null
            );

            // Update local row state and reset triggered flags if TP/SL modified
            const additionalUpdates = {};
            if (column.id === 'take_profit') {
                additionalUpdates.tp_triggered = false;
            }
            if (column.id === 'stop_loss') {
                additionalUpdates.sl_triggered = false;
            }

            table.options.meta?.updateData(row.index, column.id, value === '' ? null : value, additionalUpdates);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Failed to update position:", error);
            setValue(initialValue || ''); // revert
        } finally {
            setIsSaving(false);
        }
    };

    if (column.id === 'risk_level') {
        return (
            <div className="flex items-center gap-2">
                <select
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onBlur={onBlur}
                    className="bg-zinc-800 text-white text-xs p-1 rounded border border-zinc-700 outline-none w-24"
                >
                    <option value="">בחר...</option>
                    <option value="נמוך">נמוך</option>
                    <option value="בינוני">בינוני</option>
                    <option value="גבוה">גבוה</option>
                </select>
                {isSaving && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
                {saved && <Check className="w-3 h-3 text-emerald-400" />}
            </div>
        );
    }

    const isTp = column.id === 'take_profit';
    const isSl = column.id === 'stop_loss';
    const isTpTriggered = Boolean(row.original.tp_triggered);
    const isSlTriggered = Boolean(row.original.sl_triggered);
    const hasValue = value !== '' && value !== null && value !== undefined;

    return (
        <div className="flex items-center gap-1.5">
            <div className="relative flex items-center">
                <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onBlur={onBlur}
                    placeholder="0.00"
                    className={`bg-zinc-800/90 text-white text-xs py-1 px-2 rounded-lg border outline-none w-20 text-left font-mono transition-all ${
                        isTp && isTpTriggered
                            ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                            : isSl && isSlTriggered
                            ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
                            : "border-zinc-700/80 focus:border-emerald-500/70"
                    }`}
                    dir="ltr"
                />
            </div>

            {/* Indicator Badges for Active/Fired Triggers */}
            {isTp && hasValue && (
                isTpTriggered ? (
                    <span
                        title="התראת יעד הרווח הופעלה ונשלחה לטלגרם! לחץ לעדכון מחיר יעד חדש"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap cursor-help"
                    >
                        <span>נשלח</span>
                        <Target className="w-2.5 h-2.5" />
                    </span>
                ) : (
                    <span
                        title="התראת יעד רווח (TP) פעילה ברקע"
                        className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"
                    />
                )
            )}

            {isSl && hasValue && (
                isSlTriggered ? (
                    <span
                        title="התראת הגבלת ההפסד הופעלה ונשלחה לטלגרם! לחץ לעדכון מחיר חדש"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap cursor-help"
                    >
                        <span>נשלח</span>
                        <ShieldAlert className="w-2.5 h-2.5" />
                    </span>
                ) : (
                    <span
                        title="התראת הגבלת הפסד (SL) פעילה ברקע"
                        className="w-2 h-2 rounded-full bg-rose-400 animate-pulse flex-shrink-0"
                    />
                )
            )}

            {isSaving && <Loader2 className="w-3 h-3 animate-spin text-zinc-400 flex-shrink-0" />}
            {saved && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
        </div>
    );
};


function DeepPortfolioAnalysis() {
    const { data: portfolioDisplay, isLoading, error, refetch } = useFetchData(displayPortfolio);
    const [data, setData] = useState(() => []);
    const [livePortfolioToast, setLivePortfolioToast] = useState(null);

    useEffect(() => {
        if (portfolioDisplay) {
            setData(portfolioDisplay);
        }
    }, [portfolioDisplay]);

    // WebSocket Listener: Live PORTFOLIO_ALERT_TRIGGERED Events (Take Profit / Stop Loss)
    useWebSocketEvent("PORTFOLIO_ALERT_TRIGGERED", (event) => {
        const payload = event?.payload || event;
        const targetTicker = payload?.ticker;
        const alertType = payload?.alert_type; // 'TAKE_PROFIT' | 'STOP_LOSS'

        if (targetTicker) {
            const upperTicker = targetTicker.toUpperCase();
            
            // 1. Immediately update table state to show fired/triggered badge
            setData((prevData) =>
                prevData.map((row) => {
                    if (row.ticker?.toUpperCase() === upperTicker) {
                        return {
                            ...row,
                            tp_triggered: alertType === "TAKE_PROFIT" ? true : row.tp_triggered,
                            sl_triggered: alertType === "STOP_LOSS" ? true : row.sl_triggered,
                            current_price: payload.current_price || row.current_price,
                        };
                    }
                    return row;
                })
            );

            // 2. Show live banner toast on page
            setLivePortfolioToast({
                ticker: upperTicker,
                alertType,
                currentPrice: payload.current_price,
                thresholdPrice: payload.threshold_price,
                pLAmount: payload.p_l_amount,
                pLPercent: payload.p_l_percent,
                message: payload.message || `פוזיציית ${upperTicker} חצתה את רף ההתראה!`
            });

            // Auto-clear toast after 10 seconds
            setTimeout(() => {
                setLivePortfolioToast(null);
            }, 10000);
        }
    });

    // WebSocket Listener: Live Price Updates for Portfolio Holdings
    useWebSocketEvent("PRICE_UPDATE", (event) => {
        const symbol = event?.symbol || event?.ticker;
        const price = event?.price;
        if (!symbol || price === undefined) return;

        const upperSym = symbol.toUpperCase();
        setData((prevData) =>
            prevData.map((row) => {
                if (row.ticker?.toUpperCase() === upperSym) {
                    const newPrice = Number(price);
                    const shares = Number(row.shares) || 0;
                    const avgPrice = Number(row.avg_price) || 0;
                    const newWorth = newPrice * shares;
                    const newPL = newWorth - (shares * avgPrice);
                    const newPLPercent = (shares * avgPrice) > 0 ? (newPL / (shares * avgPrice)) * 100 : 0;

                    return {
                        ...row,
                        current_price: newPrice,
                        stock_currnet_worth: newWorth,
                        "p/l": newPL,
                        precent_ch: newPLPercent
                    };
                }
                return row;
            })
        );
    });

    const { totalCostBasis, totalCurrentWorth, unrealizedPL, unrealizedPLPercent } = useMemo(() => {
        let cost = 0;
        let worth = 0;
        data.forEach(item => {
            cost += (item.shares * item.avg_price) || 0;
            worth += (item.stock_currnet_worth) || 0;
        });
        const pl = worth - cost;
        const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
        return { totalCostBasis: cost, totalCurrentWorth: worth, unrealizedPL: pl, unrealizedPLPercent: plPercent };
    }, [data]);

    const totalPortfolioValue = totalCurrentWorth;

    const columns = useMemo(() => [
        {
            accessorKey: 'ticker',
            header: 'שם החברה',
            cell: info => <span className="font-bold text-white font-mono">{info.getValue()}</span>,
        },
        {
            accessorKey: 'sector',
            header: 'סקטור',
            cell: info => <span className="text-zinc-300">{info.getValue() || 'N/A'}</span>,
        },
        {
            accessorKey: 'market_cap',
            header: 'שווי שוק',
            cell: info => <span className="text-zinc-300">{info.getValue() ? formatCurrency(info.getValue()) : 'N/A'}</span>,
        },
        {
            accessorKey: 'shares',
            header: 'כמות מניות',
            cell: info => <span className="text-zinc-300 font-mono">{Number(info.getValue()).toLocaleString()}</span>,
        },
        {
            accessorKey: 'avg_price',
            header: 'מחיר קנייה',
            cell: info => <span className="text-zinc-300 font-mono">{formatCurrency(info.getValue())}</span>,
        },
        {
            id: 'original_size',
            header: 'גודל פוזיציה מקורי',
            cell: ({ row }) => {
                const size = row.original.shares * row.original.avg_price;
                return <span className="text-zinc-300 font-mono">{formatCurrency(size)}</span>;
            },
        },
        {
            accessorKey: 'current_price',
            header: 'מחיר נוכחי',
            cell: info => <span className="text-zinc-300 font-mono">{formatCurrency(info.getValue())}</span>,
        },
        {
            accessorKey: 'stock_currnet_worth',
            header: 'שווי נוכחי',
            cell: info => <span className="font-medium text-white font-mono">{formatCurrency(info.getValue())}</span>,
        },
        {
            accessorKey: 'p/l',
            header: 'רווח/הפסד $',
            cell: info => {
                const val = info.getValue();
                return (
                    <span className={`font-medium font-mono ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {formatCurrency(val)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'day_precent',
            header: 'שינוי יומי %',
            cell: info => {
                const val = info.getValue();
                return (
                    <span className={`font-medium font-mono ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {formatPercent(val)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'precent_ch',
            header: 'רווח/הפסד %',
            cell: info => {
                const val = info.getValue();
                return (
                    <span className={`font-medium font-mono ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {formatPercent(val)}
                    </span>
                );
            },
        },
        {
            id: 'weight',
            header: 'משקל בתיק %',
            cell: ({ row }) => {
                if (totalPortfolioValue === 0) return '0.00%';
                const weight = (row.original.stock_currnet_worth / totalPortfolioValue) * 100;
                return <span className="text-zinc-300 font-mono">{weight.toFixed(2)}%</span>;
            },
        },
        {
            accessorKey: 'initial_entry_date',
            header: 'תאריך כניסה',
            cell: info => {
                const val = info.getValue();
                return <span className="text-zinc-300">{val ? new Date(val).toLocaleDateString('he-IL') : 'N/A'}</span>;
            }
        },
        {
            accessorKey: 'risk_level',
            header: 'דרגת סיכון',
            cell: EditableCell,
        },
        {
            accessorKey: 'take_profit',
            header: 'יעד רווח (TP)',
            cell: EditableCell,
        },
        {
            accessorKey: 'stop_loss',
            header: 'הגבלת הפסד (SL)',
            cell: EditableCell,
        },
        {
            accessorKey: 'next_earnings_date',
            header: 'תאריך דיווח',
            cell: info => {
                const val = info.getValue();
                return <span className="text-zinc-400">{val ? new Date(val).toLocaleDateString('he-IL') : 'N/A'}</span>;
            }
        },
    ], [totalPortfolioValue]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        meta: {
            updateData: (rowIndex, columnId, value, additionalUpdates = {}) => {
                setData(old =>
                    old.map((row, index) => {
                        if (index === rowIndex) {
                            return { ...old[rowIndex], [columnId]: value, ...additionalUpdates };
                        }
                        return row;
                    })
                );
            },
        },
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="text-zinc-400 font-medium">טוען ניתוח תיק לעומק...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <p className="text-zinc-400 font-medium">שגיאה בטעינת נתונים</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 w-full space-y-6" dir="rtl">
            {/* Live Portfolio Alert Toast Banner */}
            {livePortfolioToast && (
                <div
                    className={`p-4 rounded-2xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce transition-all duration-300 ${
                        livePortfolioToast.alertType === "TAKE_PROFIT"
                            ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                            : "bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.25)]"
                    }`}
                >
                    <div className="flex items-center gap-3.5">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                livePortfolioToast.alertType === "TAKE_PROFIT"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            }`}
                        >
                            {livePortfolioToast.alertType === "TAKE_PROFIT" ? (
                                <Target className="w-5 h-5 animate-pulse" />
                            ) : (
                                <ShieldAlert className="w-5 h-5 animate-pulse" />
                            )}
                        </div>
                        <div>
                            <div className="text-xs font-mono font-bold flex flex-wrap items-center gap-2">
                                <span className="text-white text-xs sm:text-sm">
                                    {livePortfolioToast.alertType === "TAKE_PROFIT"
                                        ? "🎯 התראת יעד רווח (Take Profit) הופעלה!"
                                        : "🛑 התראת הגבלת הפסד (Stop Loss) הופעלה!"}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        livePortfolioToast.alertType === "TAKE_PROFIT"
                                            ? "bg-emerald-500/30 text-emerald-300"
                                            : "bg-rose-500/30 text-rose-300"
                                    }`}
                                >
                                    {livePortfolioToast.ticker}
                                </span>
                            </div>
                            <p className="text-xs mt-1 opacity-90" dir="rtl">
                                {livePortfolioToast.message} (מחיר נוכחי: <span dir="ltr">${Number(livePortfolioToast.currentPrice).toFixed(2)}</span>)
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setLivePortfolioToast(null)}
                        className={`self-end sm:self-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            livePortfolioToast.alertType === "TAKE_PROFIT"
                                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200"
                                : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200"
                        }`}
                    >
                        סגור
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/60 pb-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 flex flex-wrap items-center gap-2">
                        <span>ניתוח תיק לעומק</span>
                        <span className="text-xs font-mono font-normal bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            התראות TP/SL בזמן אמת
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-xs sm:text-sm max-w-3xl">
                        הגדר מחירי Take Profit ו-Stop Loss לכל פוזיציה בתיק – המערכת סורקת את השוק ברקע ושולחת התראות בזמן אמת לטלגרם ולדפדפן ברגע שהמחיר מגיע ליעד!
                    </p>
                </div>
            </div>
            
            {/* KPI Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 sm:p-5 md:p-6 backdrop-blur-xl flex flex-col justify-center">
                    <span className="text-zinc-400 text-xs sm:text-sm mb-1.5">רווח / הפסד לא ממומש</span>
                    <div className="flex items-baseline gap-2" dir="ltr">
                        <span className={`text-xl sm:text-2xl md:text-3xl font-bold font-mono ${unrealizedPL > 0 ? 'text-emerald-400' : unrealizedPL < 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                            {unrealizedPL > 0 ? '+' : ''}{formatCurrency(unrealizedPL)}
                        </span>
                        <span className={`text-xs sm:text-sm font-medium font-mono ${unrealizedPLPercent > 0 ? 'text-emerald-400/80' : unrealizedPLPercent < 0 ? 'text-rose-400/80' : 'text-zinc-500'}`}>
                            ({unrealizedPLPercent > 0 ? '+' : ''}{unrealizedPLPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 sm:p-5 md:p-6 backdrop-blur-xl flex flex-col justify-center">
                    <span className="text-zinc-400 text-xs sm:text-sm mb-1.5">עלות השקעה כוללת</span>
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-mono" dir="ltr">{formatCurrency(totalCostBasis)}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 sm:p-5 md:p-6 backdrop-blur-xl flex flex-col justify-center sm:col-span-2 lg:col-span-1">
                    <span className="text-zinc-400 text-xs sm:text-sm mb-1.5">שווי שוק נוכחי</span>
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-mono" dir="ltr">{formatCurrency(totalCurrentWorth)}</span>
                </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse min-w-[720px]">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="border-b border-zinc-800/80 bg-zinc-950/40 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40 text-xs sm:text-sm">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-zinc-800/20 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {table.getRowModel().rows.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-12 text-zinc-500 text-xs sm:text-sm">
                                        אין פוזיציות בתיק להצגה.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DeepPortfolioAnalysis;
