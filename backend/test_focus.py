import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()
focus_key = os.environ.get("FOCUS_NFE_API_KEY")

async def test_focus_flow():
    if not focus_key:
        print("Chave da FOCUS NFE não encontrada.")
        return

    # A Focus NFe usa HTTP Basic Auth onde a chave de API é o username e a senha é vazia
    auth = (focus_key, "")

    print("1. Conectando na API Fiscal da Focus NFe (Sandbox)...")
    
    async with httpx.AsyncClient() as client:
        # Apenas consultando o status da empresa cadastrada para testar o token
        response = await client.get(
            "https://api.focusnfe.com.br/v2/empresas", 
            auth=auth
        )
        
        if response.status_code == 200:
            print("SUCESSO! Conexão autenticada e estabelecida com a SEFAZ via Focus NFe.")
            empresas = response.json()
            print(f"Empresas vinculadas ao Token: {len(empresas)}")
        else:
            print(f"A API respondeu com status {response.status_code}: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_focus_flow())
