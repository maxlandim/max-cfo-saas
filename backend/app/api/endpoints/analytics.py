from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Transaction, BankAccount
from app.api.deps import get_tenant_session, get_current_user
import datetime

router = APIRouter()

@router.get("/dashboard")
def get_executive_dashboard(
    db: Session = Depends(get_tenant_session),
    current_user = Depends(get_current_user)
):
    """
    Consolida métricas-chave para o Dashboard Executivo da Diretoria.
    """
    workspace_id = current_user.workspace_id
    
    # 1. Saldo Consolidado (Open Finance)
    saldo_total = db.query(func.sum(BankAccount.balance)).filter(BankAccount.workspace_id == workspace_id).scalar() or 0
    
    # 2. Despesas do Mês Atual
    hoje = datetime.datetime.utcnow()
    primeiro_dia_mes = datetime.datetime(hoje.year, hoje.month, 1)
    
    despesas_mes = db.query(func.sum(Transaction.amount)).filter(
        Transaction.workspace_id == workspace_id,
        Transaction.type == 'DESPESA',
        Transaction.date >= primeiro_dia_mes
    ).scalar() or 0
    
    # 3. DRE Simplificado
    receitas_totais = db.query(func.sum(Transaction.amount)).filter(Transaction.type == 'RECEITA', Transaction.workspace_id == workspace_id).scalar() or 0
    lucro_bruto = receitas_totais - despesas_mes
    margem = round((lucro_bruto / receitas_totais * 100), 2) if receitas_totais > 0 else 0
    
    # 4. Runway (Tempo de Caixa)
    trinta_dias_atras = hoje - datetime.timedelta(days=30)
    despesas_30_dias = db.query(func.sum(Transaction.amount)).filter(
        Transaction.workspace_id == workspace_id,
        Transaction.type == 'DESPESA',
        Transaction.date >= trinta_dias_atras
    ).scalar() or 0
    
    runway_meses = (saldo_total / despesas_30_dias) if despesas_30_dias > 0 else 999
    
    return {
        "saldo_atual_centavos": saldo_total,
        "despesas_mes_atual": despesas_mes,
        "receitas_totais": receitas_totais,
        "lucro_bruto": lucro_bruto,
        "margem_operacional_percentual": margem,
        "runway_meses": round(runway_meses, 1)
    }
