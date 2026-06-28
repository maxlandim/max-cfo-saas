from fastapi import APIRouter
from app.api.endpoints import auth, chat, transactions, fintech, enterprise, accountant, analytics, inventory, sales, hr, billing

api_router = APIRouter()
api_router.include_router(auth.router, tags=["login"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(fintech.router, prefix="/fintech", tags=["fintech"])
api_router.include_router(enterprise.router, prefix="/enterprise", tags=["enterprise"])
api_router.include_router(accountant.router, prefix="/accountant", tags=["accountant"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(hr.router, prefix="/hr", tags=["hr"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
