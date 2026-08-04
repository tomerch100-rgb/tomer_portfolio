import React, { useMemo, useState, useEffect } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel
} from '@tanstack/react-table';
import { displayPortfolio, updatePositionAnalysis } from '../services/dashbordService';
import useFetchData from '../hooks/useFetchData';
import { Loader2, AlertCircle, Save, Check } from 'lucide-react';

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

// Editable Cell Component
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
            table.options.meta?.updateData(row.index, column.id, value);
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

    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={onBlur}
                className="bg-zinc-800 text-white text-xs p-1 rounded border border-zinc-700 outline-none w-20 text-left"
                dir="ltr"
            />
            {isSaving && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
            {saved && <Check className="w-3 h-3 text-emerald-400" />}
        </div>
    );
};


function DeepPortfolioAnalysis() {
    const { data: portfolioDisplay, isLoading, error } = useFetchData(displayPortfolio);
    const [data, setData] = useState(() => []);

    useEffect(() => {
        if (portfolioDisplay) {
            setData(portfolioDisplay);
        }
    }, [portfolioDisplay]);

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

    // Use totalCurrentWorth from the KPI calculations instead of recalculating
    const totalPortfolioValue = totalCurrentWorth;

    const columns = useMemo(() => [
        {
            accessorKey: 'ticker',
            header: 'שם החברה',
            cell: info => <span className="font-bold text-white">{info.getValue()}</span>,
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
            cell: info => <span className="text-zinc-300">{Number(info.getValue()).toLocaleString()}</span>,
        },
        {
            accessorKey: 'avg_price',
            header: 'מחיר קנייה',
            cell: info => <span className="text-zinc-300">{formatCurrency(info.getValue())}</span>,
        },
        {
            id: 'original_size',
            header: 'גודל פוזיציה מקורי',
            cell: ({ row }) => {
                const size = row.original.shares * row.original.avg_price;
                return <span className="text-zinc-300">{formatCurrency(size)}</span>;
            },
        },
        {
            accessorKey: 'current_price',
            header: 'מחיר נוכחי',
            cell: info => <span className="text-zinc-300">{formatCurrency(info.getValue())}</span>,
        },
        {
            accessorKey: 'stock_currnet_worth',
            header: 'שווי נוכחי',
            cell: info => <span className="font-medium text-white">{formatCurrency(info.getValue())}</span>,
        },
        {
            accessorKey: 'p/l',
            header: 'רווח/הפסד $',
            cell: info => {
                const val = info.getValue();
                return (
                    <span className={`font-medium ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
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
                    <span className={`font-medium ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
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
                    <span className={`font-medium ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
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
                return <span className="text-zinc-300">{weight.toFixed(2)}%</span>;
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
            header: 'יעד רווח',
            cell: EditableCell,
        },
        {
            accessorKey: 'stop_loss',
            header: 'הגבלת הפסד',
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
            updateData: (rowIndex, columnId, value) => {
                setData(old =>
                    old.map((row, index) => {
                        if (index === rowIndex) {
                            return { ...old[rowIndex], [columnId]: value };
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
        <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">ניתוח תיק לעומק</h1>
                    <p className="text-zinc-400 text-sm">ניהול מתקדם, יעדי רווח והגבלת הפסד לכל הפוזיציות הפעילות.</p>
                </div>
            </div>
            
            {/* KPI Summary Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 backdrop-blur-xl flex flex-col justify-center">
                    <span className="text-zinc-400 text-sm mb-1">רווח / הפסד לא ממומש</span>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${unrealizedPL > 0 ? 'text-emerald-400' : unrealizedPL < 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                            {unrealizedPL > 0 ? '+' : ''}{formatCurrency(unrealizedPL)}
                        </span>
                        <span className={`text-sm font-medium ${unrealizedPLPercent > 0 ? 'text-emerald-400/80' : unrealizedPLPercent < 0 ? 'text-rose-400/80' : 'text-zinc-500'}`}>
                            ({unrealizedPLPercent > 0 ? '+' : ''}{unrealizedPLPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 backdrop-blur-xl flex flex-col justify-center">
                    <span className="text-zinc-400 text-sm mb-1">עלות השקעה כוללת</span>
                    <span className="text-2xl font-bold text-white">{formatCurrency(totalCostBasis)}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 backdrop-blur-xl flex flex-col justify-center">
                    <span className="text-zinc-400 text-sm mb-1">שווי שוק נוכחי</span>
                    <span className="text-2xl font-bold text-white">{formatCurrency(totalCurrentWorth)}</span>
                </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto w-full pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <table className="w-full text-sm text-right min-w-[2200px]">
                        <thead className="text-xs text-zinc-400 bg-zinc-900/80 uppercase border-b border-zinc-800/80">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header, index) => (
                                        <th 
                                            key={header.id} 
                                            className={`px-4 py-4 font-medium whitespace-nowrap cursor-pointer hover:text-zinc-300 transition-colors ${index === 0 ? 'sticky right-0 bg-zinc-900/95 border-l border-zinc-800/80 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.5)]' : ''}`}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-2">
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {{
                                                    asc: ' 🔼',
                                                    desc: ' 🔽',
                                                }[header.column.getIsSorted()] ?? null}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr 
                                    key={row.id}
                                    className="border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell, index) => (
                                        <td 
                                            key={cell.id} 
                                            className={`px-4 py-3 whitespace-nowrap ${index === 0 ? 'sticky right-0 bg-zinc-900/90 backdrop-blur-md border-l border-zinc-800/80 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.3)]' : ''}`}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-zinc-500">
                                        אין פוזיציות פעילות בתיק כרגע.
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
