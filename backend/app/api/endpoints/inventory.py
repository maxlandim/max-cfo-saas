from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Product
from app.api.deps import get_tenant_session
import datetime

router = APIRouter()

@router.get("/")
def get_inventory(db: Session = Depends(get_tenant_session)):
    """
    Lista todos os produtos do estoque no Workspace atual.
    """
    return db.query(Product).all()

@router.post("/")
def create_product(
    name: str,
    sku: str,
    quantity: int = 0,
    reorder_point: int = 5,
    db: Session = Depends(get_tenant_session)
):
    """
    Cadastra um novo produto no estoque corporativo.
    """
    product = Product(
        name=name,
        sku=sku,
        quantity=quantity,
        reorder_point=reorder_point
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/alerts")
def get_inventory_alerts(db: Session = Depends(get_tenant_session)):
    """
    Retorna os produtos que atingiram o ponto de recompra crítico.
    """
    alerts = db.query(Product).filter(Product.quantity <= Product.reorder_point).all()
    return {"alerts": alerts, "count": len(alerts)}
