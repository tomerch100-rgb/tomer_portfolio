import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

CATEGORY_MAP = {
    "feature": "💡 הצעה לפיצ'ר חדש (Feature Request)",
    "bug": "🐛 דיווח על תקלה / באג (Bug Report)",
    "ui": "🎨 שיפור עיצוב וחוויית משתמש (UI/UX)",
    "performance": "⚡ ביצועים ומהירות (Performance)",
    "general": "⭐ משוב כללי ושביעות רצון (General Feedback)",
}

TARGET_FEEDBACK_EMAIL = "tomerch100@gmail.com"


def format_feedback_html(feedback: dict) -> str:
    category_label = CATEGORY_MAP.get(feedback.get("category", ""), feedback.get("category", "כללי"))
    rating_val = feedback.get("rating")
    rating_str = f"{'★' * rating_val}{'☆' * (5 - rating_val)} ({rating_val}/5)" if rating_val else "לא צוין"
    page_str = feedback.get("page") or "כללי / לא צוין"
    user_name = feedback.get("user_name") or "אנונימי / משתמש מחובר"
    user_email = feedback.get("user_email") or "לא צוין"
    subject = feedback.get("subject", "משוב חדש מ-TomerVest")
    message = feedback.get("message", "").replace("\n", "<br>")
    submitted_at = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    return f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #f4f4f5;
                margin: 0;
                padding: 20px;
            }}
            .card {{
                max-width: 600px;
                margin: 0 auto;
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }}
            .header {{
                background: linear-gradient(135deg, #059669, #0d9488);
                padding: 24px;
                text-align: center;
                color: white;
            }}
            .header h1 {{
                margin: 0;
                font-size: 22px;
                font-weight: 800;
            }}
            .content {{
                padding: 24px;
            }}
            .badge {{
                display: inline-block;
                padding: 6px 14px;
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 16px;
            }}
            .info-grid {{
                margin-bottom: 20px;
                background: #27272a;
                border-radius: 12px;
                padding: 16px;
            }}
            .info-row {{
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #3f3f46;
                font-size: 14px;
            }}
            .info-row:last-child {{
                border-bottom: none;
            }}
            .info-label {{
                color: #a1a1aa;
                font-weight: 600;
            }}
            .info-value {{
                color: #fafafa;
                font-weight: bold;
            }}
            .message-box {{
                background: #09090b;
                border: 1px solid #3f3f46;
                border-radius: 12px;
                padding: 18px;
                margin-top: 16px;
                font-size: 15px;
                line-height: 1.6;
                color: #f4f4f5;
            }}
            .footer {{
                text-align: center;
                padding: 16px;
                font-size: 12px;
                color: #71717a;
                border-top: 1px solid #27272a;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>📬 התקבל משוב חדש מ-TomerVest!</h1>
            </div>
            <div class="content">
                <div class="badge">{category_label}</div>
                <h2 style="margin-top:0; color:#ffffff; font-size:18px;">{subject}</h2>

                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">דירוג שביעות רצון:</span>
                        <span class="info-value" style="color:#fbbf24;">{rating_str}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">עמוד / פיצ'ר:</span>
                        <span class="info-value">{page_str}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">שולח:</span>
                        <span class="info-value">{user_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">אימייל לחזרה:</span>
                        <span class="info-value" style="color:#38bdf8;">{user_email}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">זמן שליחה:</span>
                        <span class="info-value">{submitted_at}</span>
                    </div>
                </div>

                <div style="font-weight:600; color:#a1a1aa; margin-top:16px;">פירוט המשוב:</div>
                <div class="message-box">
                    {message}
                </div>
            </div>
            <div class="footer">
                נשלח אוטומטית ממערכת המשוב של TomerVest Portfolio App
            </div>
        </div>
    </body>
    </html>
    """


async def send_feedback_notification(
    feedback: dict, target_email: str = TARGET_FEEDBACK_EMAIL
) -> bool:
    """
    Sends feedback notification to the target email address (tomerch100@gmail.com).
    Supports SMTP via environment variables and logs the feedback clearly.
    """
    subject = f"📬 TomerVest Feedback: {feedback.get('subject', 'New Feedback')}"
    html_content = format_feedback_html(feedback)

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER") or os.getenv("EMAIL_HOST_USER")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_HOST_PASSWORD")

    email_sent = False

    if smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = target_email

            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_html)

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, [target_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, [target_email], msg.as_string())

            logger.info(f"✅ Feedback email successfully sent to {target_email}")
            email_sent = True
        except Exception as e:
            logger.warning(
                f"⚠️ SMTP send failed ({e}). Please ensure your Gmail App Password is correct."
            )
    else:
        logger.info(
            f"ℹ️ SMTP_USER / SMTP_PASSWORD not set in .env. Feedback logged locally for {target_email}:\n{feedback}"
        )

    # גיבוי: שליחת התראה לטלגרם במידה ומוגדר מנהל ב-TELEGRAM_ADMIN_CHAT_ID
    admin_chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID")
    if admin_chat_id:
        try:
            from app.services.telegram.telegram_service import bot

            if bot:
                telegram_text = (
                    f"📬 *התקבל משוב חדש ב-TomerVest!*\n\n"
                    f"📌 *קטגוריה:* {feedback.get('category', 'כללי')}\n"
                    f"⭐ *דירוג:* {feedback.get('rating', 'לא צוין')}/5\n"
                    f"📄 *עמוד:* {feedback.get('page', 'כללי')}\n"
                    f"👤 *מאת:* {feedback.get('user_name', 'אנונימי')} ({feedback.get('user_email', 'ללא אימייל')})\n"
                    f"📝 *כותרת:* {feedback.get('subject')}\n\n"
                    f"💬 *תוכן המשוב:*\n{feedback.get('message')}"
                )
                await bot.send_message(
                    chat_id=int(admin_chat_id),
                    text=telegram_text,
                    parse_mode="Markdown",
                )
                logger.info(f"✅ Feedback also sent via Telegram to admin {admin_chat_id}")
        except Exception as tg_err:
            logger.debug(f"Telegram admin alert skipped: {tg_err}")

    return email_sent
