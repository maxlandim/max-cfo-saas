from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import PayrollProvision, User
from app.api.deps import get_tenant_session, get_current_user
import datetime

router = APIRouter()

@router.post("/provision")
def add_payroll_provision(
    employee_id: str,
    base_salary: int,
    reference_month: str, # 'YYYY-MM'
    db: Session = Depends(get_tenant_session),
    current_user: User = Depends(get_current_user)
):
    """
    Calcula e salva a provisão de RH (Férias, 13º e FGTS) com base no salário.
    Isso é vital para o fluxo de caixa preditivo do CFO.
    """
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a Administradores")
        
    # Férias = Salário / 12 + 1/3
    vacation = int((base_salary / 12) * 1.3333)
    # 13º = Salário / 12
    thirteenth = int(base_salary / 12)
    # FGTS = Salário * 8%
    fgts = int(base_salary * 0.08)
    
    provision = PayrollProvision(
        employee_id=employee_id,
        reference_month=reference_month,
        vacation_provision=vacation,
        thirteenth_provision=thirteenth,
        fgts_provision=fgts
    )
    db.add(provision)
    db.commit()
    db.refresh(provision)
    return provision
