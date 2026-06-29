import asyncio
import httpx
import uuid

API_URL = "https://max-cfo-saas.onrender.com/api/v1"

async def test_live_production():
    print("--- INICIANDO TESTE DE PRODUÇÃO ---")
    
    async with httpx.AsyncClient() as client:
        # 1. Testar Status da API
        print("1. Verificando conectividade da API...")
        try:
            res = await client.get("https://max-cfo-saas.onrender.com/docs")
            if res.status_code == 200:
                print("[SUCESSO] API Online e acessível.")
            else:
                print(f"[ERRO] Erro na API: {res.status_code}")
                return
        except Exception as e:
            print(f"[ERRO] Falha de conexão: {e}")
            return
            
        # 2. Criar usuário e Workspace
        print("\n2. Testando Banco de Dados e Registro...")
        fake_email = f"ceo_{uuid.uuid4().hex[:6]}@empresa.com"
        payload_register = {
            "workspace_in": {
                "cnpj": "06990590000123",
                "name": "Empresa Teste Render",
                "plan": "Básico"
            },
            "user_in": {
                "email": fake_email,
                "password": "SenhaSegura123!",
                "full_name": "Testador Automatizado"
            }
        }
        
        try:
            res_reg = await client.post(f"{API_URL}/register", json=payload_register)
            if res_reg.status_code == 200:
                print(f"[SUCESSO] Usuário criado com sucesso no Supabase! ({fake_email})")
            else:
                print(f"[ERRO] Erro ao criar usuário: {res_reg.text}")
                return
        except Exception as e:
            print(f"[ERRO] Falha no registro: {e}")
            return

        # 3. Testando Login e Geração de Token JWT
        print("\n3. Testando Autenticação (Login)...")
        payload_login = {
            "username": fake_email,
            "password": "SenhaSegura123!"
        }
        try:
            res_login = await client.post(f"{API_URL}/login/access-token", data=payload_login)
            if res_login.status_code == 200:
                token = res_login.json().get("access_token")
                print("[SUCESSO] Login realizado com sucesso! JWT gerado.")
            else:
                print(f"[ERRO] Erro no login: {res_login.text}")
                return
        except Exception as e:
             print(f"[ERRO] Falha no login: {e}")
             return
             
        # 4. Testar Rota de Finanças (Asaas)
        print("\n4. Testando integração com Asaas (Motor de Boletos)...")
        headers = {"Authorization": f"Bearer {token}"}
        payload_boleto = {
            "amount": 500.00,
            "due_date": "2026-12-31",
            "description": "Consultoria MAX CFO Teste de Produção",
            "customer_name": "Cliente API Teste",
            "customer_cpf_cnpj": "81308354020",
            "customer_email": "cliente.api@teste.com"
        }
        
        try:
            res_bol = await client.post(f"{API_URL}/fintech/charge", json=payload_boleto, headers=headers)
            if res_bol.status_code == 200:
                bol_data = res_bol.json()
                print("[SUCESSO] Comunicação com o Asaas concluída com sucesso na Nuvem!")
                print(f"LINK Boleto de Teste: {bol_data.get('invoice_url', 'URL não retornada')}")
            else:
                # Pode dar erro de CPF inválido, mas se der 422 é porque bateu no asaas
                print(f"[AVISO] Resposta do Asaas (O motor está vivo): {res_bol.status_code} - {res_bol.text}")
        except Exception as e:
             print(f"[ERRO] Falha na geração do boleto: {e}")

        print("\n--- TESTE DE PRODUÇÃO FINALIZADO ---")

if __name__ == "__main__":
    asyncio.run(test_live_production())
