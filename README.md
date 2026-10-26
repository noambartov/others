# others

אתר סטטי של כלים לתורת המוזיקה (עברית, RTL). אין build: פותחים את `index.html` בדפדפן.

| קובץ | מה הוא עושה |
| --- | --- |
| `index.html` | דף קישורים לכלים |
| `music_theory_exercise_tool.html` | תרגול אונליין עם השמעה |
| `music_theory_worksheets_generator.html` | מחולל דפי תרגול להדפסה ול-PDF |
| `music_theory_algorythm.html` | מחשבון מרווחים, סולמות ואקורדים |
| `theory-core.js` | הלוגיקה המשותפת לכל הדפים: צלילים, קטלוג המבנים, בנייה מצליל נתון, זיהוי מרווחים, סימני מפתח וציור החמשה |

## בדיקות

```
node tests/theory-core.test.js
```

צורות התווים (מפתחות, סימני היתק, ראשי תווים) לקוחות מהגופן Bravura, ברישיון SIL Open Font License.
