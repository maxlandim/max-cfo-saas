# MAX CFO AI — Guia de lançamento comercial

Este guia lista o que falta configurar para o MAX CFO AI cobrar clientes com segurança. O código desta versão (`comercial-v1`) já está pronto; os passos abaixo são configurações nos painéis da Vercel, do Firebase e do Stripe. Tempo estimado: 1 a 2 horas.

## O que mudou nesta versão

| Antes | Agora |
|---|---|
| O status "Pro" ficava no navegador e podia ser liberado por qualquer pessoa | O acesso é verificado no servidor: assinatura ativa no Stripe, teste grátis de 7 dias ou e-mail de administrador |
| A página de planos tinha "Passe Livre" e "Modo Desenvolvedor" | Removidos. Sem pagamento, só o teste grátis |
| Login por e-mail e senha entrava em loop (voltava para o login) | Corrigido; o painel usa a sessão do Firebase |
| Os dados eram guardados com o e-mail como chave e sem regras de acesso | Guardados pelo id da conta, com regras que isolam cada cliente. Os dados antigos migram sozinhos no primeiro acesso |
| O chat de IA quebrava (faltava o contexto) e qualquer site podia usar a chave do Gemini | Corrigido, com login obrigatório e limite de perguntas por hora |
| O webhook do Stripe aceitava chamadas sem assinatura e não gravava nada | Exige a assinatura do Stripe e mantém a assinatura de cada cliente atualizada |
| Publicação exigia Node 20 (a Vercel recusa desde 01/10/2026) | Node 24 e Next.js com correções de segurança |
| Sem termos de uso nem política de privacidade | Páginas `/termos` e `/privacidade` e aceite no cadastro |
| — | Novo módulo **Simulador Tributário e Reforma** no menu do painel |
| — | Portal do cliente do Stripe: trocar cartão, mudar de plano e cancelar sem falar com você |

## 1. Enviar o código para o GitHub

O repositório `maxlandim/max-cfo-saas` está **público**. Antes de tudo, deixe-o privado: GitHub → repositório → Settings → General → Danger Zone → Change visibility → Private.

Depois, publique esta versão de um destes jeitos:

- **Pelo Claude:** conecte o GitHub nas configurações do claude.ai (Conectores) e peça para enviar o branch `comercial-v1`.
- **Pelo Antigravity:** abra a pasta do projeto, substitua os arquivos pelos do `.zip` (mantenha a pasta `.git`), e no terminal rode:
  ```
  git checkout -b comercial-v1
  git add -A
  git commit -m "Versão comercial v1"
  git push -u origin comercial-v1
  ```

A Vercel cria uma prévia do branch automaticamente. Teste nela antes de juntar com o `main`.

## 2. Vercel

1. Projeto → Settings → General → **Node.js Version: 24.x**.
2. Projeto → Settings → Environment Variables. Cadastre (modelo em `.env.example`):

| Variável | Onde conseguir |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | O endereço do site, ex.: `https://max-cfo-saas.vercel.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase → ⚙️ Configurações do projeto → Contas de serviço → Gerar nova chave privada. Cole o conteúdo do arquivo JSON |
| `ADMIN_EMAILS` | Seu e-mail (acesso total sem assinatura). Vários separados por vírgula |
| `STRIPE_SECRET_KEY` | Stripe → Desenvolvedores → Chaves de API → Chave secreta (`sk_test_…` para testar, `sk_live_…` em produção) |
| `STRIPE_WEBHOOK_SECRET` | Passo 4 abaixo (`whsec_…`) |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key |

Enquanto `FIREBASE_SERVICE_ACCOUNT` não estiver cadastrada, o painel abre para todos com o aviso "Modo de configuração". Cadastre antes de divulgar.

## 3. Firebase (console.firebase.google.com → projeto max-cfo-saas)

1. **Authentication → Método de login:** ative E-mail/senha e Google.
2. **Authentication → Configurações → Domínios autorizados:** inclua `max-cfo-saas.vercel.app` e o seu domínio próprio, se tiver.
3. **Firestore → Regras:** apague o conteúdo, cole o arquivo `firestore.rules` e clique em Publicar.
4. **Storage → Regras:** cole o arquivo `storage.rules` e publique.

Importante: publique as regras depois que a nova versão estiver no ar. Elas bloqueiam o formato antigo (dados guardados pelo e-mail para gravação).

## 4. Stripe (dashboard.stripe.com)

1. Ative a conta com os dados do CNPJ e a conta bancária para receber.
2. Desenvolvedores → Webhooks → Adicionar endpoint:
   - URL: `https://SEU-SITE/api/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copie o "Signing secret" (`whsec_…`) para `STRIPE_WEBHOOK_SECRET`.
3. Configurações → Faturamento → Portal do cliente: ative. O botão "Gerenciar assinatura" (página de planos) e "Atualizar pagamento" (painel, quando a cobrança falha) levam o cliente para lá, onde ele troca o cartão, muda de plano ou cancela.

Os planos (R$ 49,90, R$ 129,90, R$ 269,90 e R$ 299,90) ficam em `src/lib/plans.js`.

## 5. Teste antes de divulgar (modo de teste do Stripe)

- [ ] Criar conta com e-mail e senha → abre o painel com "Teste grátis: 7 dias restantes".
- [ ] Sair e entrar de novo → o painel abre direto, sem voltar para o login.
- [ ] Lançar uma receita, recarregar a página e abrir em outro navegador → o lançamento aparece.
- [ ] Assinar com o cartão de teste `4242 4242 4242 4242` (qualquer validade futura e CVC) → página de sucesso → painel sem o aviso de teste.
- [ ] No Stripe, cancelar a assinatura de teste → no Firebase, `subscriptions/{id}` fica com status `canceled`.
- [ ] Menu → Simulador Tributário → buscar um CNPJ → os dados da empresa preenchem o simulador.
- [ ] CFO IA Chat responde perguntas.
- [ ] Páginas `/termos` e `/privacidade` abrem pelo rodapé.

Para conferir que ninguém consegue liberar o acesso sozinho: com uma conta de teste vencida (ou `TRIAL_DAYS=0`), o painel deve mostrar "Seu teste grátis terminou".

## 6. Antes de vender

- [ ] Preencher nos termos e na política: razão social, CNPJ, e-mail de suporte e e-mail do encarregado de dados (estão marcados em dourado nas páginas).
- [ ] CNPJ com atividade de software (CNAE 6311-9/00 ou 6203-1/00; confirme com o contador).
- [ ] Busca e pedido de registro da marca "MAX CFO" no INPI.
- [ ] Domínio próprio (ex.: maxcfo.com.br) apontado para a Vercel.
- [ ] Trocar as chaves do Stripe de teste para produção.

## O servidor Python (pasta `backend/`)

A versão 1 não depende dele: login, dados, pagamentos e IA rodam na Vercel com Firebase e Stripe. O servidor (FastAPI, Asaas, Focus NFe) fica guardado para a próxima fase, quando entrarem Pix/boleto pelo Asaas e emissão de notas. O arquivo `requirements.txt` foi restaurado, então ele volta a publicar no Render se for reativado. A Vercel ignora essa pasta (`.vercelignore`).

## Próximas melhorias sugeridas

1. Guardar lançamentos em coleções separadas no Firestore (hoje ficam num único documento por conta, com limite de 1 MB; o painel avisa quando estiver perto).
2. Pix e boleto recorrentes pelo Asaas, com nota fiscal de serviço automática.
3. Permissões da equipe verificadas no servidor (hoje o módulo Equipe controla só a tela).
4. Página inicial renderizada no servidor, para aparecer melhor no Google.
5. Exportar e excluir a conta pelo próprio painel (direitos da LGPD).
