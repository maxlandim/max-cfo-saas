from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.models import ServiceOrder, Commission, User
from app.api.deps import get_tenant_session, get_current_user

router = APIRouter()

@router.get("/os")
def list_service_orders(db: Session = Depends(get_tenant_session)):
    """
    Lista as Ordens de Serviço (OS) do Workspace.
    """
    return db.query(ServiceOrder).all()

@router.post("/os")
def create_service_order(
    client_name: str,
    description: str,
    total_amount: int,
    db: Session = Depends(get_tenant_session)
):
    """
    Cria uma nova Ordem de Serviço / Orçamento.
    """
    os = ServiceOrder(
        client_name=client_name,
        description=description,
        total_amount=total_amount
    )
    db.add(os)
    db.commit()
    db.refresh(os)
    return os

@router.post("/os/{os_id}/commission")
def add_commission(
    os_id: str,
    user_id: str,
    percentage: int,
    db: Session = Depends(get_tenant_session),
    current_user: User = Depends(get_current_user)
):
    """
    Acopla uma comissão a uma OS. Somente Admin pode fazer isso.
    """
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a Administradores")
        
    os = db.query(ServiceOrder).filter(ServiceOrder.id == os_id).first()
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
        
    amount = int(os.total_amount * (percentage / 100.0))
    
    commission = Commission(
        user_id=user_id,
        service_order_id=os.id,
        percentage=percentage,
        amount=amount
    )
    db.add(commission)
    db.commit()
    db.refresh(commission)
    return commission
