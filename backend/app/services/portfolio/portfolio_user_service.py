from app.core import security
from app.crud import crud_user
from sqlalchemy.orm import Session


def get_me(db: Session, user_id: int):
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        return None
    return {"user_id": user.user_id, "username": user.username, "email": user.email, "telegram_id": user.telegram_id}


def register_user(db: Session, username, password, email):
    if crud_user.get_user_by_username(db, username):
        return "Username already exists. Please choose a different username."
    else:
        password_hash = security.hash_password(password)
        crud_user.create_user(db, username, email, password_hash)
        return "User registered successfully."


def login_user(db: Session, username, password):
    user = crud_user.get_user_by_username(db, username)
    if user is None:
        return None
    if security.verify_password(user.password_hash, password):
        return user.user_id
    return None
