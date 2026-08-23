import { useState, useRef, useMemo } from "react";
import {
    UploadCloud,
    FileSpreadsheet,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    X,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Database,
    HelpCircle,
    Info,
    RefreshCw,
    TrendingUp,
    Check
} from "lucide-react";
import { previewPortfolioImport, confirmPortfolioImport } from "../services/importService";

const TARGET_FIELDS = [
    { value: "ticker", label: "סמל מניה (Ticker) *", required: true, desc: "סימול המניה בבורסה (למשל AAPL, NVDA)" },
    { value: "shares", label: "כמות מניות (Shares) *", required: true, desc: "מספר היחידות / מניות המוחזקות" },
    { value: "avg_price", label: "מחיר קנייה ממוצע (Avg Price) *", required: true, desc: "מחיר ממוצע או עלות רכישה ליחידה" },
    { value: "sector", label: "מגזר / סקטור (Sector)", required: false, desc: "ענף פעילות (במידה וחסר, יושלם אוטומטית)" },
    { value: "take_profit", label: "יעד רווח (Take Profit)", required: false, desc: "מחיר יעד למימוש רווח" },
    { value: "stop_loss", label: "סטופ לוס (Stop Loss)", required: false, desc: "מחיר יעד להגבלת הפסד" },
    { value: "", label: "— התעלם מעמודה זו —", required: false, desc: "לא ייובא למערכת" }
];

export default function ImportPortfolioModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping & Preview, 3: Success
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    
    // Preview state from backend
    const [previewData, setPreviewData] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    const [overwriteExisting, setOverwriteExisting] = useState(true);

    // Final import results
    const [importResult, setImportResult] = useState(null);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const resetState = () => {
        setStep(1);
        setFile(null);
        setIsDragging(false);
        setIsLoading(false);
        setErrorMessage("");
        setPreviewData(null);
        setColumnMapping({});
        setOverwriteExisting(true);
        setImportResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // --- Step 1: File Selection & Drag-and-Drop ---
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile) => {
        setErrorMessage("");
        const validExtensions = [".csv", ".xlsx", ".xls"];
        const fileName = selectedFile.name.toLowerCase();
        const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));

        if (!hasValidExt) {
            setErrorMessage("פורמט קובץ לא נתמך. אנא בחר קובץ Excel (.xlsx, .xls) או CSV.");
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setErrorMessage("גודל הקובץ חורג מהמגבלה של 10MB.");
            return;
        }

        setFile(selectedFile);
    };

    // --- Analyze with AI ---
    const handleAnalyzeFile = async () => {
        if (!file) return;
        setIsLoading(true);
        setErrorMessage("");

        try {
            const data = await previewPortfolioImport(file);
            setPreviewData(data);
            
            // Populate initial mappings from AI suggestion
            const initialMap = {};
            data.columns.forEach(col => {
                initialMap[col] = data.suggested_mapping[col] || "";
            });
            setColumnMapping(initialMap);
            setStep(2);
        } catch (err) {
            setErrorMessage(err.message || "שגיאה בניתוח הקובץ.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Step 2: Mapping Handlers & Validation ---
    const handleMappingChange = (columnName, targetField) => {
        setColumnMapping(prev => ({
            ...prev,
            [columnName]: targetField
        }));
    };

    // Check which required fields are mapped
    const mappingValidation = useMemo(() => {
        const mappedTargets = Object.values(columnMapping).filter(Boolean);
        const hasTicker = mappedTargets.includes("ticker");
        const hasShares = mappedTargets.includes("shares");
        const hasAvgPrice = mappedTargets.includes("avg_price");

        const missing = [];
        if (!hasTicker) missing.push("סמל מניה (Ticker)");
        if (!hasShares) missing.push("כמות מניות (Shares)");
        if (!hasAvgPrice) missing.push("מחיר ממוצע (Avg Price)");

        return {
            isValid: hasTicker && hasShares && hasAvgPrice,
            missing
        };
    }, [columnMapping]);

    // --- Step 2: Confirm & Import ---
    const handleConfirmImport = async () => {
        if (!mappingValidation.isValid) return;

        setIsLoading(true);
        setErrorMessage("");

        try {
            // Clean mapping: convert empty string targets to null
            const cleanMap = {};
            Object.entries(columnMapping).forEach(([col, target]) => {
                cleanMap[col] = target || null;
            });

            const result = await confirmPortfolioImport(
                cleanMap,
                previewData?.session_token,
                overwriteExisting,
                null // Pass null so backend uses full dataset from session_token
            );

            setImportResult(result);
            setStep(3);
            if (onSuccess) {
                onSuccess(result);
            }
        } catch (err) {
            setErrorMessage(err.message || "שגיאה בייבוא הנתונים.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto" dir="rtl">
            <div className="relative w-full max-w-4xl bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-zinc-100 font-sans animate-in fade-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-white tracking-wide">ייבוא תיק מניות מקובץ אקסל / CSV</h2>
                                <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    <Sparkles className="w-3 h-3" /> AI Powered
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">זיהוי ומיפוי עמודות אוטומטי באמצעות בינה מלאכותית</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stepper Header */}
                <div className="px-6 py-3 bg-zinc-900/20 border-b border-zinc-800/40 flex items-center justify-between text-xs text-zinc-400">
                    <div className={`flex items-center gap-2 ${step >= 1 ? "text-emerald-400 font-bold" : ""}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? "bg-emerald-500 text-black font-extrabold" : "bg-zinc-800 text-zinc-400"}`}>
                            1
                        </span>
                        העלאת קובץ
                    </div>
                    <div className="h-px bg-zinc-800 flex-1 mx-3" />
                    <div className={`flex items-center gap-2 ${step >= 2 ? "text-emerald-400 font-bold" : ""}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? "bg-emerald-500 text-black font-extrabold" : "bg-zinc-800 text-zinc-400"}`}>
                            2
                        </span>
                        אימות מיפוי ותצוגה מקדימה
                    </div>
                    <div className="h-px bg-zinc-800 flex-1 mx-3" />
                    <div className={`flex items-center gap-2 ${step >= 3 ? "text-emerald-400 font-bold" : ""}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? "bg-emerald-500 text-black font-extrabold" : "bg-zinc-800 text-zinc-400"}`}>
                            3
                        </span>
                        סיום ועדכון
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* ================= STEP 1: Upload ================= */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                                    isDragging
                                        ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]"
                                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50"
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                                <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 flex items-center justify-center text-emerald-400 shadow-inner">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-semibold text-zinc-200">
                                        גרור ושחרר את הקובץ כאן, או <span className="text-emerald-400 underline underline-offset-4">לחץ לבחירה</span>
                                    </p>
                                    <p className="text-xs text-zinc-500">תומך בקבצי Excel (.xlsx, .xls) ו-CSV עד גודל 10MB</p>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
                                    <Info className="w-3.5 h-3.5 text-blue-400" />
                                    תומך בייצוא מכל הבנקים ובתי ההשקעות (מיטב, הפועלים, לאומי, IB ועוד)
                                </div>
                            </div>

                            {/* Selected File Card */}
                            {file && (
                                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{file.name}</p>
                                            <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= STEP 2: Verification & Preview ================= */}
                    {step === 2 && previewData && (
                        <div className="space-y-6">
                            
                            {/* AI Insights & Confidence Badge */}
                            <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white">ניתוח מבנה הקובץ הושלם</span>
                                        <span className="text-xs text-zinc-400">({previewData.total_rows} שורות זוהו)</span>
                                    </div>
                                    {previewData.notes && (
                                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                            {previewData.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">רמת דיוק:</span>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                                        previewData.confidence >= 0.85
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                    }`}>
                                        <Sparkles className="w-3 h-3" />
                                        {Math.round(previewData.confidence * 100)}% ביטחון
                                    </div>
                                </div>
                            </div>

                            {/* Warnings */}
                            {previewData.warnings && previewData.warnings.length > 0 && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1 text-xs text-amber-300">
                                    {previewData.warnings.map((w, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span>{w}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Mapping Validation Alert if missing required */}
                            {!mappingValidation.isValid && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-xs text-rose-400 font-medium">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>שדות חובה חסרים למיפוי: {mappingValidation.missing.join(", ")}. אנא שייך את העמודות המתאימות בטבלה.</span>
                                </div>
                            )}

                            {/* Column Mapping Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-zinc-200">מיפוי עמודות הקובץ לשדות המערכת</h3>
                                    <span className="text-xs text-zinc-500">* שדות חובה</span>
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
                                    {previewData.columns.map((colName) => {
                                        // Find sample value for this column
                                        const sampleVal = previewData.preview_rows?.[0]?.[colName];
                                        const selectedTarget = columnMapping[colName] || "";

                                        return (
                                            <div key={colName} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
                                                <div className="space-y-1 min-w-[200px]">
                                                    <span className="text-sm font-semibold text-white block">{colName}</span>
                                                    {sampleVal !== undefined && sampleVal !== null && (
                                                        <span className="text-xs text-zinc-500 block truncate max-w-[260px]">
                                                            דוגמה: <span className="text-zinc-400 font-mono">{String(sampleVal)}</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    <ArrowLeft className="w-4 h-4 text-zinc-600 hidden sm:block" />
                                                    <select
                                                        value={selectedTarget}
                                                        onChange={(e) => handleMappingChange(colName, e.target.value)}
                                                        className={`w-full sm:w-64 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-zinc-900 border transition-all focus:outline-none focus:ring-1 ${
                                                            selectedTarget
                                                                ? "border-emerald-500/50 text-emerald-300 focus:ring-emerald-500"
                                                                : "border-zinc-800 text-zinc-400 focus:ring-zinc-600"
                                                        }`}
                                                    >
                                                        {TARGET_FIELDS.map((tf) => (
                                                            <option key={tf.value} value={tf.value} className="bg-zinc-900 text-zinc-200">
                                                                {tf.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5-Row Preview Table */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-200">תצוגה מקדימה (5 שורות ראשונות מהקובץ)</h3>
                                <div className="border border-zinc-800 rounded-2xl overflow-x-auto bg-zinc-900/30">
                                    <table className="w-full text-right text-xs">
                                        <thead>
                                            <tr className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 font-semibold">
                                                <th className="p-3 w-10 text-center">#</th>
                                                {previewData.columns.map((col) => (
                                                    <th key={col} className="p-3 whitespace-nowrap">
                                                        <div>{col}</div>
                                                        {columnMapping[col] && (
                                                            <div className="text-[10px] text-emerald-400 font-normal">
                                                                → {columnMapping[col]}
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                                            {previewData.preview_rows.map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-zinc-800/20">
                                                    <td className="p-3 text-center text-zinc-500 font-mono">{rIdx + 1}</td>
                                                    {previewData.columns.map((col) => (
                                                        <td key={col} className="p-3 whitespace-nowrap font-mono text-zinc-300">
                                                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Overwrite Checkbox */}
                            <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex items-center justify-between">
                                <div>
                                    <label htmlFor="overwrite-checkbox" className="text-sm font-semibold text-zinc-200 block cursor-pointer">
                                        דרוס פוזיציות קיימות בתיק
                                    </label>
                                    <p className="text-xs text-zinc-500">
                                        במידה ומסומן, מניות שכבר קיימות בתיק יעודכנו לכמויות ולמחיר הממוצע החדש.
                                    </p>
                                </div>
                                <input
                                    id="overwrite-checkbox"
                                    type="checkbox"
                                    checked={overwriteExisting}
                                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                                />
                            </div>

                        </div>
                    )}

                    {/* ================= STEP 3: Results Summary ================= */}
                    {step === 3 && importResult && (
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-900/20">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-white">ייבוא המניות הושלם בהצלחה!</h3>
                                <p className="text-sm text-zinc-400">הפוזיציות נוספו ועודכנו במסד הנתונים של התיק שלך</p>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto text-center">
                                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                                    <span className="text-xs text-zinc-500 font-medium block mb-1">סך הכל שורות</span>
                                    <span className="text-2xl font-bold text-white">{importResult.total_processed}</span>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                                    <span className="text-xs text-emerald-400 font-medium block mb-1">פוזיציות חדשות</span>
                                    <span className="text-2xl font-bold text-emerald-400">+{importResult.imported_count}</span>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                                    <span className="text-xs text-blue-400 font-medium block mb-1">פוזיציות שעודכנו</span>
                                    <span className="text-2xl font-bold text-blue-400">{importResult.updated_count}</span>
                                </div>
                            </div>

                            {/* Detailed Results List */}
                            {importResult.items && importResult.items.length > 0 && (
                                <div className="space-y-2 text-right max-w-xl mx-auto">
                                    <h4 className="text-xs font-semibold text-zinc-400">פירוט הפוזיציות שנקלטו:</h4>
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-zinc-800/40 text-xs">
                                        {importResult.items.map((item, idx) => (
                                            <div key={idx} className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white font-mono">{item.ticker}</span>
                                                    <span className="text-zinc-500">|</span>
                                                    <span className="text-zinc-400">{item.shares} יח'</span>
                                                    <span className="text-zinc-500">|</span>
                                                    <span className="text-zinc-400">${item.avg_price}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    item.status === "created"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : item.status === "updated"
                                                        ? "bg-blue-500/10 text-blue-400"
                                                        : "bg-rose-500/10 text-rose-400"
                                                }`}>
                                                    {item.status === "created" ? "נוסף" : item.status === "updated" ? "עודכן" : "נכשל"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between">
                    {step === 1 && (
                        <>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                type="button"
                                disabled={!file || isLoading}
                                onClick={handleAnalyzeFile}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                                    !file || isLoading
                                        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50"
                                        : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 active:scale-95"
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        מנתח קובץ באמצעות AI...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                        נתח קובץ עם AI
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                            >
                                <ArrowRight className="w-4 h-4" /> חזרה לבחירת קובץ
                            </button>
                            <button
                                type="button"
                                disabled={!mappingValidation.isValid || isLoading}
                                onClick={handleConfirmImport}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                                    !mappingValidation.isValid || isLoading
                                        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50"
                                        : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 active:scale-95"
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        מייבא פוזיציות לתיק...
                                    </>
                                ) : (
                                    <>
                                        <Database className="w-4 h-4" />
                                        אשר ובצע ייבוא ({previewData?.total_rows || 0} מניות)
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                            סיום וצפייה בתיק
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
