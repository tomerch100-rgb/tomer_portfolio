from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.email_service import send_feedback_notification, TARGET_FEEDBACK_EMAIL
from app.core.security import safe, verify_token

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_200_OK)
async def submit_feedback(
    feedback: FeedbackCreate,
    request: Request,
    box: HTTPAuthorizationCredentials | None = Depends(safe),
    db: Session = Depends(get_db),
):
    """
    קבלת משוב מהמשתמש ושליחתו אל tomerch100@gmail.com.
    """
    feedback_data = feedback.model_dump()

    # אם המשתמש מחובר, נשלים פרטים חסרים במידה ולא מולאו
    token = request.cookies.get("my_access_token")
    if not token and box and box.credentials:
        token = box.credentials

    if token:
        try:
            payload = verify_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    user = db.scalars(select(User).where(User.user_id == int(user_id))).first()
                    if user:
                        if not feedback_data.get("user_name"):
                            feedback_data["user_name"] = user.username
                        if not feedback_data.get("user_email"):
                            feedback_data["user_email"] = user.email
        except Exception:
            pass

    await send_feedback_notification(feedback_data, target_email=TARGET_FEEDBACK_EMAIL)

    return FeedbackResponse(
        status="success",
        message="המשוב שלך נשלח בהצלחה וייבדק בהקדם. תודה רבה על עזרתך לשיפור המערכת!",
        target_email=TARGET_FEEDBACK_EMAIL,
    )
