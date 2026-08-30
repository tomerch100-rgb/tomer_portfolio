from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)
