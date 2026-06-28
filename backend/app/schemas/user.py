from typing import Optional
from pydantic import BaseModel, EmailStr, UUID4

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    workspace_id: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "Operador"

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: UUID4
    workspace_id: UUID4
    is_active: bool

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass
