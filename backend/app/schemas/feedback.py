from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    category: str = Field(
        default="general",
        description="סוג המשוב (feature, bug, ui, performance, general)",
    )
    rating: int | None = Field(
        default=None,
        ge=1,
        le=5,
        description="דירוג שביעות רצון (1 עד 5 כוכבים)",
    )
    page: str | None = Field(
        default=None,
        description="העמוד או התכונה הרלוונטית",
    )
    subject: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="כותרת המשוב",
    )
    message: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="תוכן המשוב המפורט",
    )
    user_email: str | None = Field(
        default=None,
        description="אימייל לחזרה (אופציונלי)",
    )
    user_name: str | None = Field(
        default=None,
        description="שם המשתמש (אופציונלי)",
    )


class FeedbackResponse(BaseModel):
    status: str = "success"
    message: str
    target_email: str = "tomerch100@gmail.com"
