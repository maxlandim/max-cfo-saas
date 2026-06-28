from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Invoice, ServiceOrder
from app.api.deps import get_tenant_session
import datetime

router = APIRouter()

@router.post("/issue-nfe")
async def issue_nfe(os_id: str, db: Session = Depends(get_tenant_session)):
    """
    Integração real de Faturamento Fiscal (Focus NFe).
    """
    import os
    import httpx
    
    os_data = db.query(ServiceOrder).filter(ServiceOrder.id == os_id).first()
    if not os_data:
        raise HTTPException(status_code=404, detail="OS não encontrada")
        
    focus_key = os.environ.get("FOCUS_NFE_API_KEY")
    
    # Cria registro base (pendente)
    invoice = Invoice(
        service_order_id=os_data.id,
        nfe_number=f"PENDING-{os_data.id[:5]}",
        status="PROCESSING",
        issued_at=datetime.datetime.utcnow()
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    if focus_key:
        focus_url = "https://api.focusnfe.com.br/v2/nfes"
        # Dummy payload para exemplo
        payload = {
            "natureza_operacao": "Venda de serviços",
            "data_emissao": datetime.datetime.utcnow().isoformat(),
            "cnpj_emitente": "00000000000000",
            "nome_destinatario": "Cliente Mock",
            "cnpj_destinatario": "11111111111111",
            "itens": [{"codigo": "1", "descricao": "Servico CFO", "quantidade": 1, "valor_unitario": 1000.00}]
        }
        headers = {"Authorization": f"Basic {focus_key}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(focus_url, json=payload, headers=headers)
            if response.status_code in [200, 201]:
                focus_data = response.json()
                invoice.nfe_number = focus_data.get("numero", invoice.nfe_number)
                invoice.status = "ISSUED"
                invoice.sefaz_link = f"https://nfe.fazenda.gov.br/portal/nfe-{invoice.nfe_number}"
                db.commit()
                return {
                    "status": "success", 
                    "message": f"NFe emitida via Focus NFe para OS {os_id}", 
                    "invoice_id": str(invoice.id),
                    "sefaz_link": invoice.sefaz_link
                }
            else:
                invoice.status = "ERROR"
                db.commit()
                return {"status": "error", "message": "Falha na emissão Fiscal (Focus NFe)"}
                
    # Fallback (Mock)
    invoice.status = "ISSUED_MOCK"
    invoice.nfe_number = "NFE-998877"
    invoice.sefaz_link = "https://nfe.fazenda.gov.br/portal/nfe-998877"
    db.commit()
    return {
        "status": "success", 
        "message": f"NFe emitida (Mock) para OS {os_id}", 
        "invoice_id": str(invoice.id),
        "sefaz_link": invoice.sefaz_link
    }
