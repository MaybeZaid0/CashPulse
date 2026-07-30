from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str

class UserInDB(UserBase):
    id: str
    passwordHash: str
    createdAt: datetime

class UserOut(UserBase):
    id: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
