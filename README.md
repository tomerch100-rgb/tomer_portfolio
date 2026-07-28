# 📈 Stock Portfolio & Analysis System | מערכת לניהול וניתוח תיק השקעות

מערכת אינטראקטיבית ומודרנית לניהול, מעקב וניתוח של תיקי השקעות בשוק ההון בזמן אמת.
המערכת משלבת ממשק משתמש מתקדם (React) לצד שרת ערוצים מהיר ויציב (FastAPI), ומאפשרת למשתמשים לעקוב אחר מניות, לבצע סימולציות של פקודות מסחר, לנתח ביצועים ולצפות בגרפים פיננסיים מתקדמים.

---

## 🚀 תכונות עיקריות (Features)

*   **🔐 מערכת משתמשים מלאה (Authentication):** הרשמה, התחברות ואבטחת מידע אישי.
*   **📊 לוח בקרה מרכזי (Dashboard):** תצוגה מקיפה של שווי התיק, רווח/הפסד יומי ומצטבר, וחלוקת הנכסים.
*   **📈 גרפים בזמן אמת (Charts & Analysis):** אינטגרציה עם `yfinance` לקבלת נתוני שוק מעודכנים והצגת גרפים אינטראקטיביים של מניות.
*   **📝 רשימת מעקב (Watchlist):** ניהול מניות מועדפות ומעקב צמוד אחר השינויים בהן.
*   **💼 ניהול פקודות מסחר (Orders):** ביצוע פקודות קנייה ומכירה וניהול פוזיציות בתיק.
*   **📜 היסטוריית פעולות (History):** מעקב מלא אחר היסטוריית העסקאות והאירועים בחשבון המשתמש.

---

## 🛠️ ארכיטקטורה וטכנולוגיות (Tech Stack)

### Backend (צד שרת)
*   **FastAPI:** שרת Python מהיר ויעיל מבוסס תהליכים אסינכרוניים.
*   **SQLAlchemy & Peewee:** לניהול ומיפוי מסד הנתונים (ORM).
*   **Neon PostgreSQL:** מסד נתונים מנוהל בענן בעל ביצועים גבוהים.
*   **yfinance:** ספריית קצה לקבלת נתוני מניות היסטוריים ובזמן אמת מ-Yahoo Finance.
*   **Uvicorn:** שרת ASGI להרצת האפליקציה.

### Frontend (צד לקוח)
*   **React (Vite):** פיתוח מהיר ומודרני של ממשק המשתמש.
*   **Redux Toolkit:** לניהול מצב (State Management) גלובלי בצורה יעילה ומאורגנת.
*   **Tailwind CSS:** לעיצוב רספונסיבי, חדשני ונקי.
*   **React Router Dom:** לניווט מהיר וחלק בין דפי האפליקציה (SPA).

---

## 📂 מבנה הפרויקט (Project Structure)

```text
stock_project/
├── backend/                  # צד שרת - FastAPI
│   ├── classes/             # מודלים של מסדי הנתונים (SQLAlchemy models)
│   ├── services/            # חיבורים לשירותים חיצוניים (APIs) ופונקציות עזר של הפורטפוליו
│   ├── core/                # הגדרות ליבה של הפרויקט
│   ├── db/                  # קונפיגורציית מסד הנתונים וחיבור ל-Neon Postgres
│   ├── router/              # נתיבי ה-API (Auth, Orders, Display, Charts, Watchlist)
│   ├── utils/               # פונקציות עזר וכלים לשימוש חוזר
│   └── main.py              # נקודת הכניסה והרצת שרת ה-FastAPI
│
├── frontend/                 # צד לקוח - React + Vite
│   ├── src/
│   │   ├── component/       # רכיבי UI שימושיים
│   │   ├── hooks/           # Custom React Hooks
│   │   ├── pages/           # דפי המערכת (Dashboard, Watchlist, Orders, History...)
│   │   ├── service/         # קריאות API ואינטראקציה עם השרת (Axios)
│   │   ├── store/           # הגדרות Redux Store ו-Slices
│   │   └── main.jsx         # נקודת הרצה של ה-React App
│
└── requirements.txt         # תלויות פייתון של צד השרת
```

---

## 💻 הוראות הרצה (Setup & Installation)

### דרישות קדם
*   מותקן אצלך **Python 3.10 ומעלה**
*   מותקן אצלך **Node.js (גרסה 18 ומעלה)**

### 1. הגדרת צד השרת (Backend)
ראשית, נכנסים לתיקיית הפרויקט ומגדירים סביבה וירטואלית:

```bash
# יצירת סביבה וירטואלית (מומלץ)
python -m venv .venv
source .venv/bin/activate  # ב-Windows: .venv\Scripts\activate

# התקנת התלויות הדרושות
pip install -r requirements.txt
```

להרצת השרת:
```bash
# כניסה לתיקיית השרת והרצתו
cd backend
python main.py
```
*השרת ירוץ בכתובת:* `http://127.0.0.1:8000`

---

### 2. הגדרת צד הלקוח (Frontend)
פתחו טרמינל חדש בתיקיית השורש של הפרויקט:

```bash
# מעבר לתיקיית הפרונטנד
cd frontend

# התקנת ספריות קוד חיצוניות
npm install

# הרצת שרת הפיתוח של Vite
npm run dev
```
*ממשק המשתמש ירוץ בכתובת:* `http://localhost:5173`

---

## 🔒 אבטחה והגדרות סביבה (Environment Variables)
יש ליצור קובץ `.env` בתיקיית ה-`backend` (אם אינו קיים) ולהגדיר את משתני הסביבה הדרושים לחיבור למסד הנתונים:
```env
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key
```

---

## 🤝 תרומה לפרויקט (Contributing)
נשמח לקבל הצעות לשיפורים, תיקוני באגים ובקשות לתכונות חדשות!
1. בצעו Fork לפרויקט.
2. צרו Branch חדש (`git checkout -b feature/AmazingFeature`).
3. בצעו Commit לשינויים (`git commit -m 'Add some AmazingFeature'`).
4. בצעו Push ל-Branch שפתחתם (`git push origin feature/AmazingFeature`).
5. פתחו Pull Request.
