from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.schemas.user import TokenPayload
from app.db.session import get_db, get_tenant_db
from app.db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise credentials_exception
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return current_user

def get_tenant_session(
    current_user: User = Depends(get_current_active_user)
) -> Generator:
    """
    Returns a Database Session scoped to the user's workspace (RLS).
    """
    for db in get_tenant_db(str(current_user.workspace_id)):
        yield db

def get_current_active_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Example of Role-Based Access Control (RBAC).
    """
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=400, detail="O usuário não tem privilégios suficientes"
        )
    return current_user
