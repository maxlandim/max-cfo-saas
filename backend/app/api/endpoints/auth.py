from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Workspace
from app.schemas.user import Token, UserCreate
from app.schemas.workspace import WorkspaceCreate
from app.core import security
from app.core.config import settings

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, user.workspace_id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=Token)
def register_new_workspace_and_user(
    workspace_in: WorkspaceCreate,
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Onboarding: Create new workspace and admin user
    """
    # Check if CNPJ exists
    if db.query(Workspace).filter(Workspace.cnpj == workspace_in.cnpj).first():
        raise HTTPException(
            status_code=400,
            detail="Já existe uma conta associada a este CNPJ.",
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=400,
            detail="Este e-mail já está em uso.",
        )
        
    # Create Workspace
    db_workspace = Workspace(
        cnpj=workspace_in.cnpj,
        name=workspace_in.name,
        plan=workspace_in.plan or "Básico"
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    # Create Admin User
    db_user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="Admin",
        workspace_id=db_workspace.id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Auto-login after registration
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            db_user.id, db_workspace.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
