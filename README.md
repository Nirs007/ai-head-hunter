# 🎯 AI Head Hunter - מערכת גיוס חכמה

מערכת לחיפוש מועמדים מתאימים ממאגר קורות חיים באמצעות Claude AI.

---

## 📋 דרישות מוקדמות

- Python 3.10+
- Node.js 18+
- מפתח API של Anthropic (Claude)

---

## 🚀 התקנה והרצה

### שלב 1 - Backend (Python)

פתח CMD/PowerShell ורוץ:

```bash
cd C:\Users\ניר\cv-matcher\backend

# התקן ספריות
pip install -r requirements.txt

# הגדר את מפתח ה-API
set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# הרץ את השרת
uvicorn main:app --reload --port 8000
```

### שלב 2 - Frontend (React)

פתח CMD/PowerShell נוסף:

```bash
cd C:\Users\ניר\cv-matcher\frontend

# התקן ספריות (פעם ראשונה בלבד)
npm install

# הרץ את הממשק
npm run dev
```

### שלב 3 - פתח דפדפן

עבור לכתובת: **http://localhost:3000**

---

## 📖 שימוש

### ייבוא מהיר (מומלץ לצאת מנקודה)
1. לחץ על "ייבוא מ-Excel"
2. גרור את קובץ `AI_CV_Database_Summary.xlsx` לאזור הייבוא
3. לחץ "ייבא מועמדים" - הנתונים יוכנסו לבסיס הנתונים

### סריקת תיקייה (לנתונים טריים)
1. לחץ על "סריקת תיקייה"
2. ודא שהנתיב נכון: `G:\האחסון שלי\connectech\גיוס\connectech civi\ConnecTech (9)\ConnecTech`
3. לחץ "התחל סריקה" - המערכת תנתח כל קורות חיים חדש (כפולים ידולגו)
4. **שים לב:** סריקה משתמשת ב-Claude API - כל קובץ = קריאת API אחת

### חיפוש מועמדים
1. מלא את טופס "דרישות משרה":
   - **תפקיד** - שם המשרה
   - **ניסיון מינימלי** - שנים
   - **טכנולוגיות נדרשות** - הוסף עם Enter או פסיק
   - **טכנולוגיות רצויות** - יתרון (לא חובה)
   - **ניסיון ניהולי** - סמן אם נדרש
2. הגדר כמה תוצאות ואחוז התאמה מינימלי
3. לחץ "חפש מועמדים"

### קריאת התוצאות
כל כרטיס מועמד מציג:
- **אחוז התאמה** - ירוק (80%+) / צהוב (60-80%) / אדום (<60%)
- **המלצה** - משפט סיכום
- **טכנולוגיות** - ירוק = תואמות, אדום = חסרות
- **יתרונות / חסרונות**
- **ניסיון ניהולי**
- **היסטוריית תפקידים** (לחץ להרחבה)

---

## 🔑 מפתח API

קבל מפתח Claude מ: https://console.anthropic.com/

לשמירת המפתח לתמיד, הוסף לקובץ `.env` בתיקיית backend:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

---

## 📁 מבנה הפרויקט

```
cv-matcher/
├── backend/
│   ├── main.py          # שרת FastAPI
│   ├── cv_scanner.py    # חילוץ טקסט מ-PDF/DOCX
│   ├── cv_processor.py  # ניתוח CV עם Claude
│   ├── job_matcher.py   # חיפוש התאמה עם Claude
│   ├── database.py      # SQLite - שמירת מועמדים
│   └── candidates.db    # בסיס הנתונים (נוצר אוטומטית)
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── ImportPanel.jsx   # ייבוא מ-Excel
            ├── ScanPanel.jsx     # סריקת תיקייה
            ├── JobForm.jsx       # טופס דרישות משרה
            └── CandidateCard.jsx # כרטיס מועמד
```
