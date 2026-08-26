import { useNavigate } from "react-router-dom";
import { TrendingUp, Shield, BarChart3, Star, ArrowLeft } from "lucide-react";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-400" dir="rtl">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Tomer<span className="text-emerald-500">Vest</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-3 sm:px-5 py-2 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              התחברות
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-3.5 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-950/20 cursor-pointer"
            >
              הרשמה חינם
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
        <div className="flex-1 space-y-6 sm:space-y-8 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
            <span>חדש: מעקב מניות והתראות בזמן אמת</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            נהל את תיק ההשקעות שלך <br />
            <span className="bg-gradient-to-l from-emerald-400 to-teal-500 bg-clip-text text-transparent">כמו מקצוען.</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl">
            TomerVest מאפשרת לך לעקוב אחר המניות שלך, לנהל פקודות מסחר וליצור רשימות מעקב מותאמות אישית בממשק מהיר, מודרני ומאובטח.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
            <button
              onClick={() => navigate("/login")}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base rounded-xl transition-all duration-200 shadow-xl shadow-emerald-950/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>התחל עכשיו</span>
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-sm sm:text-base rounded-xl transition-all duration-200 border border-zinc-700/50 cursor-pointer"
            >
              פתח חשבון חדש
            </button>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="flex-1 w-full max-w-lg">
          <div className="relative bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
            <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-zinc-800 pb-3 sm:pb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80"></div>
              </div>
              <span className="text-xs text-zinc-500 font-mono" dir="ltr">TomerVest Portfolio.exe</span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="p-3.5 sm:p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-white text-xs sm:text-sm">Apple Inc. (AAPL)</h3>
                  <p className="text-[11px] text-zinc-500">10 מניות</p>
                </div>
                <div className="text-left font-mono" dir="ltr">
                  <p className="text-emerald-400 font-semibold text-xs sm:text-sm">+$142.50</p>
                  <p className="text-[11px] text-emerald-500">+1.8%</p>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-white text-xs sm:text-sm">NVIDIA Corp. (NVDA)</h3>
                  <p className="text-[11px] text-zinc-500">15 מניות</p>
                </div>
                <div className="text-left font-mono" dir="ltr">
                  <p className="text-emerald-400 font-semibold text-xs sm:text-sm">+$384.20</p>
                  <p className="text-[11px] text-emerald-500">+3.4%</p>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-white text-xs sm:text-sm">Tesla Inc. (TSLA)</h3>
                  <p className="text-[11px] text-zinc-500">5 מניות</p>
                </div>
                <div className="text-left font-mono" dir="ltr">
                  <p className="text-rose-400 font-semibold text-xs sm:text-sm">-$24.10</p>
                  <p className="text-[11px] text-rose-500">-0.5%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-zinc-900/30 border-y border-zinc-900 py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center space-y-8 sm:space-y-12">
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">כל הכלים שאתה צריך להצלחה</h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-xs sm:text-sm">פלטפורמה חכמה שתוכננה לעזור לך לעקוב, לנתח ולייעל את התיק הפיננסי שלך בצורה הטובה ביותר.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl text-right space-y-3 sm:space-y-4 hover:border-emerald-500/30 transition-all duration-300 shadow-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">מעקב תיקים מקיף</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                ראה את כל ההחזקות, הערך הכולל של התיק, והתשואות היומיות והמצטברות שלך במקום אחד נוח.
              </p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl text-right space-y-3 sm:space-y-4 hover:border-emerald-500/30 transition-all duration-300 shadow-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">ניהול פקודות מסחר</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                נהל ועקוב אחר פקודות הקנייה והמכירה שלך. תעד את ההיסטוריה שלך בצורה שקופה ומסודרת.
              </p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl text-right space-y-3 sm:space-y-4 hover:border-emerald-500/30 transition-all duration-300 shadow-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">רשימת מעקב (Watchlist)</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                הוסף מניות מועדפות, קבל נתונים פיננסיים מתקדמים בזמן אמת והתראות מחיר ישירות לטלגרם.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 TomerVest. כל הזכויות שמורות.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-400 transition-colors">תנאי שימוש</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">מדיניות פרטיות</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">יצירת קשר</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
