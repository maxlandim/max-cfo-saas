from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Transaction
from app.api.deps import get_tenant_session, get_current_user
from app.services.supabase_service import StorageService
from app.services.cfo_ai_service import CFOAIService

router = APIRouter()

@router.get("/")
def get_transactions(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_tenant_session)
):
    """
    Get transactions for the current workspace.
    Row-Level Security (RLS) automatically ensures users only see their own workspace's data.
    """
    transactions = db.query(Transaction).offset(skip).limit(limit).all()
    return transactions

@router.post("/")
def create_transaction(
    # schema validation goes here
    type: str,
    description: str,
    amount: int,
    category: str = None, # Optional
    db: Session = Depends(get_tenant_session)
):
    """
    Creates a new transaction for the current workspace.
    If category is None, it uses AI to auto-categorize based on the description.
    """
    import datetime
    # We retrieve the workspace_id from the DB config if needed, or RLS sets it automatically if configured via trigger.
    # For now, we get it via a DB parameter or rely on the RLS injection.
    
    if not category:
        category = CFOAIService.auto_categorize_transaction(description)
        
    new_tx = Transaction(
        type=type,
        description=description,
        amount=amount,
        category=category,
        date=datetime.datetime.utcnow()
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx

@router.post("/{transaction_id}/upload")
async def upload_document(
    transaction_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_tenant_session),
    current_user = Depends(get_current_user)
):
    """
    Uploads a document (PDF/Receipt) to Supabase Storage and links it to the transaction.
    """
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found or access denied")
        
    try:
        public_url = await StorageService.upload_document(file, str(current_user.workspace_id))
        tx.document_url = public_url
        db.commit()
        return {"url": public_url, "transaction_id": transaction_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/ocr")
async def extract_receipt_ocr(
    file: UploadFile = File(...),
    db: Session = Depends(get_tenant_session)
):
    """
    Receives an image of a receipt/invoice and uses Gemini Vision to extract JSON data.
    """
    import os
    import google.generativeai as genai
    import json
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Mock response if no key is provided
        return {
            "amount": 15000,
            "cnpj": "12.345.678/0001-90",
            "date": "2023-10-25T14:30:00Z",
            "description": "[MOCK] Extração OCR de Nota Fiscal"
        }
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # In a real app we might upload the file to File API first, but for small images inline works
        image_data = await file.read()
        
        prompt = "Analise este cupom fiscal ou nota fiscal. Retorne APENAS um JSON válido contendo as chaves: 'amount' (valor total em centavos, inteiro), 'cnpj' (apenas números), 'date' (ISO-8601), 'description' (resumo curto da compra)."
        
        response = model.generate_content([
            {'mime_type': file.content_type, 'data': image_data},
            prompt
        ])
        
        # Clean up JSON markdown block if present
        text_resp = response.text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text_resp)
        return parsed
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR AI failed: {str(e)}")
