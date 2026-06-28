import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Transaction, BankAccount
from app.api.endpoints.chat import manager
import asyncio

class CFOAIService:
    @staticmethod
    async def analyze_runway(db: Session, workspace_id: str):
        """
        Calcula o runway (tempo de vida) da empresa em meses
        baseado no saldo atual e despesas médias mensais.
        """
        # Calcular saldo total de todas as contas do workspace
        saldo_total = db.query(func.sum(BankAccount.balance)).filter(BankAccount.workspace_id == workspace_id).scalar() or 0
        
        # Obter data de 30 dias atras
        trinta_dias_atras = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        
        # Calcular media de despesas dos ultimos 30 dias
        despesas_30_dias = db.query(func.sum(Transaction.amount)).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'DESPESA',
            Transaction.date >= trinta_dias_atras
        ).scalar() or 0
        
        if despesas_30_dias == 0:
            return # Sem dados suficientes
            
        runway_meses = saldo_total / despesas_30_dias
        
        # Alerta se Runway for menor que 2 meses
        if runway_meses < 2.0:
            alerta = f"🚨 CFO IA Alerta: Seu Runway de caixa está em {round(runway_meses, 1)} meses. Atenção às despesas fixas!"
            await manager.broadcast_to_workspace(alerta, workspace_id)

    @staticmethod
    def auto_categorize_transaction(description: str) -> str:
        """
        Usa o Gemini para ler a descrição de uma despesa e classificá-la 
        em um Plano de Contas padrão corporativo.
        """
        import os
        import google.generativeai as genai
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return "OUTROS"
            
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            Você é um CFO virtual. Categorize a seguinte despesa com base em sua descrição: "{description}".
            
            Escolha APENAS UMA das seguintes categorias:
            - INFRAESTRUTURA_NUVEM
            - MARKETING_VENDAS
            - FOLHA_PAGAMENTO
            - IMPOSTOS
            - COMBUSTIVEL_LOGISTICA
            - MATERIAIS_ESCRITORIO
            - OUTROS
            
            Retorne APENAS o nome da categoria em MAIÚSCULAS, sem pontuação ou quebras de linha.
            """
            
            response = model.generate_content(prompt)
            categoria = response.text.strip().upper()
            
            categorias_validas = [
                "INFRAESTRUTURA_NUVEM", "MARKETING_VENDAS", "FOLHA_PAGAMENTO",
                "IMPOSTOS", "COMBUSTIVEL_LOGISTICA", "MATERIAIS_ESCRITORIO", "OUTROS"
            ]
            
            if categoria in categorias_validas:
                return categoria
            return "OUTROS"
        except Exception:
            return "OUTROS"
