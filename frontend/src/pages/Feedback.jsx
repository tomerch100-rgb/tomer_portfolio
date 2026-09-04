import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
    MessageSquare,
    Lightbulb,
    Bug,
    Sparkles,
    Zap,
    Star,
    Send,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Mail,
    User,
    Compass,
    ArrowRight,
    HeartHandshake,
} from "lucide-react";
import { submitFeedback } from "../services/feedbackService";

const FEEDBACK_CATEGORIES = [
    {
        id: "feature",
        label: "הצעה לפיצ'ר חדש",
        icon: Lightbulb,
        color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/40",
        activeBg: "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
        desc: "רעיון לכלי, מדד או יכולת חדשה",
    },
    {
        id: "bug",
        label: "דיווח על תקלה / באג",
        icon: Bug,
        color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/40",
        activeBg: "bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]",
        desc: "משהו לא עובד או לא מוצג כראוי",
    },
    {
        id: "ui",
        label: "עיצוב וחוויית משתמש",
        icon: Sparkles,
        color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/40",
        activeBg: "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
        desc: "נוחות שימוש, נראות וממשק",
    },
    {
        id: "performance",
        label: "מהירות וביצועים",
        icon: Zap,
        color: "from-blue-500/20 to-cyan-500/10 text-cyan-400 border-cyan-500/40",
        activeBg: "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
        desc: "זמני טעינה, מהירות תגובה ויציבות",
    },
    {
        id: "general",
        label: "משוב כללי ושביעות רצון",
        icon: HeartHandshake,
        color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/40",
        activeBg: "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
        desc: "חוות דעת כללית או מילה טובה",
    },
];

const PAGES_LIST = [
    { value: "כללי", label: "כללי / כל האתר" },
    { value: "דאשבורד", label: "דאשבורד וסיכום תיק" },
    { value: "מחקר AI", label: "מחקר מניות ב-AI 🤖" },
    { value: "ניתוח תיק לעומק", label: "ניתוח תיק לעומק וסיכונים" },
    { value: "ביצועים ואנליזה", label: "ביצועים ואנליזה" },
    { value: "פקודות מסחר", label: "פקודות מסחר (קנייה/מכירה)" },
    { value: "היסטוריית פעולות", label: "היסטוריית פעולות וטרנזקציות" },
    { value: "רשימת מעקב", label: "רשימת מעקב והתראות מחיר" },
    { value: "גרפים", label: "גרפי מסחר TradingView" },
    { value: "יבוא אקסל", label: "יבוא תיק מקובץ אקסל" },
    { value: "בוט טלגרם", label: "חיבור והתראות טלגרם" },
];

const RATING_LABELS = {
    1: "לא מרוצה 😞",
    2: "טעון שיפור ⚠️",
    3: "סביר / בסדר 👍",
    4: "טוב מאוד ✨",
    5: "מצוין ומדהים! 🔥",
};

export default function Feedback() {
    const currentUser = useSelector((state) => state.auth?.user);

    const [category, setCategory] = useState("feature");
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [page, setPage] = useState("כללי");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [userName, setUserName] = useState(currentUser?.username || "");
    const [userEmail, setUserEmail] = useState(currentUser?.email || "");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            setErrorMessage("נא למלא כותרת ותוכן למשוב.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            await submitFeedback({
                category,
                rating: rating || null,
                page,
                subject: subject.trim(),
                message: message.trim(),
                user_name: userName.trim() || undefined,
                user_email: userEmail.trim() || undefined,
            });

            setIsSuccess(true);
        } catch (err) {
            console.error("Feedback submit error:", err);
            const msg =
                err.response?.data?.detail ||
                err.message ||
                "שגיאה בשליחת המשוב. אנא נסה שנית.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setIsSuccess(false);
        setSubject("");
        setMessage("");
        setRating(5);
        setCategory("feature");
        setPage("כללי");
        setErrorMessage("");
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-400 py-6 md:py-10" dir="rtl">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
                
                {/* Header Title & Description */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-semibold shadow-inner">
                        <MessageSquare className="w-4 h-4 animate-bounce" />
                        <span>מרכז המשוב והרעיונות של TomerVest</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        נשמח לשמוע את <span className="text-emerald-400">דעתך</span>! 💬
                    </h1>

                    <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        המשוב וההצעות שלך מגיעים ישירות לאימייל האישי שלי (
                        <span className="text-emerald-400 font-mono font-semibold">tomerch100@gmail.com</span>
                        ) כדי שנוכל להמשיך לשפר, לפתח ולבנות את הפלטפורמה הטובה ביותר עבורך.
                    </p>
                </div>

                {isSuccess ? (
                    /* Success State Card */
                    <div className="bg-[#121214] border border-emerald-500/40 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-emerald-950/20 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/40">
                            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                                תודה רבה על המשוב! 🎉
                            </h2>
                            <p className="text-sm text-zinc-400 max-w-md mx-auto">
                                המשוב שלך התקבל בהצלחה ונשלח לאימייל של תומר. אנו קוראים כל פנייה ומשתמשים בה לשיפור האפליקציה.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-2xl border border-zinc-700/80 transition-all cursor-pointer flex items-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" />
                                <span>שליחת משוב נוסף</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Main Feedback Form */
                    <form
                        onSubmit={handleSubmit}
                        className="bg-[#121214] border border-zinc-800/90 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 md:space-y-8"
                    >
                        {/* 1. Category Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-zinc-200">
                                1. מה סוג המשוב שתרצה לשתף?
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {FEEDBACK_CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    const isSelected = category === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`p-3.5 rounded-2xl border text-right flex flex-col justify-between gap-2 transition-all duration-200 cursor-pointer ${
                                                isSelected
                                                    ? cat.activeBg
                                                    : "bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`p-2 rounded-xl border ${cat.color} shrink-0`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                {isSelected && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-zinc-100">{cat.label}</div>
                                                <div className="text-[11px] text-zinc-500 mt-0.5">{cat.desc}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Rating & Relevant Page Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-zinc-800/80">
                            {/* Satisfaction Rating */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-zinc-200">
                                    2. איך היית מדרג את החוויה שלך?
                                </label>
                                <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl">
                                    {[1, 2, 3, 4, 5].map((star) => {
                                        const currentVal = hoverRating || rating;
                                        const isFilled = star <= currentVal;
                                        return (
                                            <button
                                                key={star}
                                                type="button"
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(star)}
                                                className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                                                aria-label={`דירוג ${star} מתוך 5`}
                                            >
                                                <Star
                                                    className={`w-6 h-6 transition-colors ${
                                                        isFilled
                                                            ? "text-amber-400 fill-amber-400"
                                                            : "text-zinc-700"
                                                    }`}
                                                />
                                            </button>
                                        );
                                    })}
                                    <span className="text-xs font-semibold text-amber-300 mr-2 font-mono">
                                        {RATING_LABELS[hoverRating || rating] || ""}
                                    </span>
                                </div>
                            </div>

                            {/* Relevant Page / Feature */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-zinc-200">
                                    3. באיזה עמוד או אזור נתקלת בזה?
                                </label>
                                <div className="relative">
                                    <select
                                        value={page}
                                        onChange={(e) => setPage(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
                                        dir="rtl"
                                    >
                                        {PAGES_LIST.map((p) => (
                                            <option key={p.value} value={p.value} className="bg-zinc-900 text-zinc-100">
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Subject & Message Details */}
                        <div className="space-y-4 pt-2 border-t border-zinc-800/80">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-zinc-200">
                                    4. כותרת קצרה למשוב <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="למשל: אפשרות להוספת התראה ב-SMS, שיפור ממשק הגרפים..."
                                    className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-bold text-zinc-200">
                                        5. פירוט המשוב <span className="text-rose-400">*</span>
                                    </label>
                                    <span className="text-[11px] text-zinc-500 font-mono">
                                        {message.length}/5000
                                    </span>
                                </div>
                                <textarea
                                    required
                                    rows={4}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="ספר לנו בהרחבה מה תרצה שנשפר, איזה באג מצאת, או איך נוכל לעשות את המערכת נוחה יותר עבורך..."
                                    className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-y"
                                />
                            </div>
                        </div>

                        {/* 4. Sender Contact Info (Optional) */}
                        <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                            <label className="block text-xs font-semibold text-zinc-400">
                                פרטי קשר לתשובה (אופציונלי):
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="relative">
                                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                                        <User className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        placeholder="שם (אופציונלי)"
                                        className="w-full pl-3 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-700"
                                    />
                                </div>

                                <div className="relative">
                                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-500">
                                        <Mail className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="email"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        placeholder="אימייל לתשובה (אופציונלי)"
                                        className="w-full pl-3 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-700"
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Error Banner */}
                        {errorMessage && (
                            <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>שולח את המשוב לאימייל...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>שליחת משוב עכשיו 🚀</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
