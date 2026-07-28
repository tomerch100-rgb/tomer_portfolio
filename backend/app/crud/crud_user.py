from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User

class CRUDUser:
    def get_user_by_username(self, db: Session, username: str) -> User:
        return db.scalars(select(User).where(User.username == username)).first()

    def get_user_by_id(self, db: Session, user_id: int) -> User:
        return db.get(User, user_id)

    def create_user(self, db: Session, username: str, email: str, password_hash: str) -> User:
        db_user = User(username=username, email=email, password_hash=password_hash)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
