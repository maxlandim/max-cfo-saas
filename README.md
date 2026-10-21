# Landim Advisory

Plataforma de gestão financeira para pequenas e médias empresas: fluxo de caixa, DRE, conciliação bancária (OFX/CSV), CRM, estoque, ordens de serviço, orçamentos, comissões, RH, CNPJ, simulador tributário e da reforma (2026–2033) e um CFO com inteligência artificial.

## Como funciona

- **Site e painel:** Next.js 14 na Vercel (`src/app`). O painel (`/dashboard`) carrega os módulos de `public/` (`app.js`, `engine.js`, `modules/*.js`).
- **Login e dados:** Firebase Authentication e Firestore. Cada conta tem o documento `workspaces/{uid}`; as regras estão em `firestore.rules` e `storage.rules`.
- **Assinaturas:** Stripe Checkout. O webhook (`/api/webhook`) grava `subscriptions/{uid}`; o painel consulta `/api/subscription`, que libera o acesso por assinatura ativa, teste grátis ou e-mail de administrador.
- **CFO IA:** Google Gemini em `/api/chat`, com login obrigatório.
- **Simulador tributário:** `public/simulador-tributario.html`, aberto pelo menu do painel.
- **Servidor Python (`backend/`):** FastAPI para a próxima fase (Asaas e Focus NFe). Não é usado pela versão 1.

## Rodar no computador

```
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

Abra http://localhost:3000.

## Publicar

Veja o passo a passo em [LANCAMENTO.md](LANCAMENTO.md).
