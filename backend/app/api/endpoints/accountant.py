from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Transaction, User
from app.api.deps import get_tenant_session, get_current_user

router = APIRouter()

def require_accountant_role(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Contador"]:
        raise HTTPException(status_code=403, detail="Acesso exclusivo para Contadores ou Administradores")
    return current_user

@router.get("/dre")
def get_consolidated_dre(
    db: Session = Depends(get_tenant_session),
    user: User = Depends(require_accountant_role)
):
    """
    Gera um DRE (Demonstrativo de Resultados do Exercício) simplificado consolidado (View-Only).
    """
    # Sum all revenues
    receitas = db.query(func.sum(Transaction.amount)).filter(Transaction.type == 'RECEITA').scalar() or 0
    
    # Sum all expenses
    despesas = db.query(func.sum(Transaction.amount)).filter(Transaction.type == 'DESPESA').scalar() or 0
    
    lucro_bruto = receitas - despesas
    
    # In a real scenario, this would be broken down by category (Impostos, Folha, etc.)
    return {
        "workspace_id": user.workspace_id,
        "receitas_totais": receitas,
        "despesas_totais": despesas,
        "lucro_bruto": lucro_bruto,
        "margem": round((lucro_bruto / receitas * 100), 2) if receitas > 0 else 0
    }
