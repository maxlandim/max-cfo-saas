from fastapi import APIRouter, Depends, Request
from app.api.deps import get_tenant_session
from sqlalchemy.orm import Session
from app.db.models import BankStatement, BankAccount, PaymentCharge, PaymentLink, ReceivableAnticipation
from app.core.config import settings
import datetime

router = APIRouter()

@router.post("/generate-boleto")
async def generate_boleto(amount: int, due_date: str = None, os_id: str = None, db: Session = Depends(get_tenant_session)):
    """
    Integração real com Asaas API para Boleto/Pix.
    """
    import os
    import httpx
    
    if not due_date:
        due_date = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
        
    asaas_key = os.environ.get("ASAAS_API_KEY")
    
    # 1. Salva a intenção de cobrança localmente
    charge = PaymentCharge(
        service_order_id=os_id,
        charge_type="BOLETO",
        amount=amount,
        due_date=datetime.datetime.strptime(due_date, "%Y-%m-%d") if isinstance(due_date, str) else due_date
    )
    db.add(charge)
    db.commit()
    db.refresh(charge)
    
    # 2. Chama a API Real se a chave estiver configurada
    if asaas_key:
        asaas_url = "https://sandbox.asaas.com/api/v3/payments"
        headers = {
            "access_token": asaas_key,
            "Content-Type": "application/json"
        }
        payload = {
            "customer": "cus_000000000000", # Fake customer ID para o Sandbox
            "billingType": "BOLETO",
            "value": amount / 100.0,
            "dueDate": due_date,
            "description": f"Fatura MAX CFO - OS {os_id or charge.id}",
            "externalReference": str(charge.id)
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(asaas_url, headers=headers, json=payload)
            if response.status_code in [200, 201]:
                asaas_data = response.json()
                charge.gateway_id = asaas_data.get("id")
                charge.status = "AWAITING_PAYMENT"
                db.commit()
                return {
                    "status": "success", 
                    "charge_id": str(charge.id),
                    "boleto_url": asaas_data.get("invoiceUrl")
                }
            else:
                charge.status = "ERROR"
                db.commit()
                return {"status": "error", "message": "Falha na comunicação com Gateway"}
                
    # Fallback (Mock) se não tiver chave
    return {
        "status": "success_mock", 
        "charge_id": str(charge.id),
        "boleto_url": f"https://bank.com/boleto/{charge.id}"
    }

@router.post("/payment-links")
def create_payment_link(name: str, description: str, amount: int, db: Session = Depends(get_tenant_session)):
    """
    Gera um link de checkout (Cartão de Crédito/Pix) genérico para envio a clientes.
    """
    link = PaymentLink(
        name=name,
        description=description,
        amount=amount,
        checkout_url=f"https://pay.maxcfo.com/{name.replace(' ', '-').lower()}"
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

@router.post("/anticipate")
def anticipate_receivable(charge_id: str, db: Session = Depends(get_tenant_session)):
    """
    Simula a antecipação de recebíveis (adiantamento de faturas a vencer).
    A plataforma cobra um 'fee' de 3%.
    """
    charge = db.query(PaymentCharge).filter(PaymentCharge.id == charge_id).first()
    if not charge:
        return {"error": "Cobrança não encontrada"}
        
    discount = int(charge.amount * 0.03) # 3% fee
    net_amount = charge.amount - discount
    
    anticipation = ReceivableAnticipation(
        payment_charge_id=charge.id,
        original_amount=charge.amount,
        discount_fee=discount,
        net_amount=net_amount
    )
    db.add(anticipation)
    db.commit()
    db.refresh(anticipation)
    return anticipation

@router.post("/webhook")
async def open_finance_webhook(request: Request, db: Session = Depends(get_tenant_session)):
    """
    Receives webhooks from Open Finance Hubs (e.g., Belvo, Pluggy) or Banks (e.g., Asaas).
    """
    payload = await request.json()
    
    # In a real scenario, we would verify the webhook signature here.
    
    event_type = payload.get("event")
    if event_type == "TRANSACTION_CREATED":
        data = payload.get("data", {})
        integration_id = data.get("account_id")
        
        # Find the linked bank account
        account = db.query(BankAccount).filter(BankAccount.integration_id == integration_id).first()
        
        if account:
            # Register the statement
            statement = BankStatement(
                account_id=account.id,
                amount=data.get("amount", 0), # Negative for debit
                description=data.get("description", "Auto-imported"),
                date=datetime.datetime.utcnow(),
                external_id=data.get("transaction_id")
            )
            db.add(statement)
            db.commit()
            return {"status": "success", "message": "Statement recorded"}
            
    return {"status": "ignored"}

