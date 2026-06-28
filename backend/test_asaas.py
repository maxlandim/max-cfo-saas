import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()
asaas_key = os.environ.get("ASAAS_API_KEY")

async def test_asaas_flow():
    if not asaas_key:
        print("Chave do ASAAS não encontrada.")
        return

    headers = {
        "access_token": asaas_key,
        "Content-Type": "application/json"
    }

    print("1. Criando um Cliente Real no Asaas...")
    customer_payload = {
        "name": "Cliente Teste MAX CFO",
        "cpfCnpj": "06990590000123", # CNPJ Genérico válido
        "email": "cliente.teste@maxcfo.com.br",
        "mobilePhone": "11999998888"
    }

    async with httpx.AsyncClient() as client:
        customer_res = await client.post(
            "https://sandbox.asaas.com/api/v3/customers", 
            json=customer_payload, 
            headers=headers
        )
        
        if customer_res.status_code != 200:
            print("Erro ao criar cliente:", customer_res.json())
            return
            
        customer_id = customer_res.json()["id"]
        print(f"SUCESSO! Cliente criado! ID: {customer_id}")

        print("\n2. Emitindo a primeira cobrança (R$ 1.500,00)...")
        charge_payload = {
            "customer": customer_id,
            "billingType": "BOLETO",
            "value": 1500.00,
            "dueDate": "2026-12-31",
            "description": "Serviços de Consultoria CFO"
        }
        
        charge_res = await client.post(
            "https://sandbox.asaas.com/api/v3/payments", 
            json=charge_payload, 
            headers=headers
        )
        
        if charge_res.status_code != 200:
            print("Erro ao criar cobrança:", charge_res.json())
            return
            
        charge_data = charge_res.json()
        print(f"SUCESSO! Cobrança gerada! ID: {charge_data['id']}")
        print(f"LINK OFICIAL DO BOLETO: {charge_data['invoiceUrl']}")

if __name__ == "__main__":
    asyncio.run(test_asaas_flow())
