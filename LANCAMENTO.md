# MAX CFO AI — Guia de lançamento comercial

> Pagamentos: desde 23/10/2026 o sistema usa o **Asaas** (cartão, Pix e boleto) no lugar do Stripe. O passo 4 traz a configuração atual.

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

## Novidades da versão 6 (todos os módulos funcionais)

| Tela | O que faz |
|---|---|
| Contas a Pagar e Receber | Baixa com juros/multa (lançados à parte, no resultado financeiro), desconto e baixa parcial; recibo com valor por extenso; duplicar; editar as próximas parcelas da série; filtros por conta e categoria |
| Clientes e Fornecedores | Cadastro com CPF/CNPJ (dados da Receita pelo CNPJ), WhatsApp, e-mail e cidade; saldo a receber, a pagar e atrasado de cada um. Criado sozinho a partir dos lançamentos |
| Fluxo de Caixa | Transferência entre contas (fora do DRE) |
| CRM | Funil com etapas, valor, próxima ação, origem, motivo de perda, previsão ponderada e conversão; oportunidade ganha vira orçamento |
| Orçamentos | Itens, desconto, validade e condições; envio pelo WhatsApp, impressão/PDF, aprovação e faturamento em parcelas no contas a receber, com baixa de estoque |
| Ordens de Serviço | Quadro aberta → em andamento → concluída → faturada, impressão para assinatura, aviso no WhatsApp e faturamento |
| Comissões | Calculadas sobre os orçamentos faturados de cada vendedor e lançadas no contas a pagar |
| Estoque | Custo médio, mínimo, entradas que geram contas a pagar, saídas que geram vendas, ajuste de inventário, histórico e duração pelo ritmo real |
| Contratos Recorrentes | Mensalidades que criam sozinhas as contas a receber do mês e do próximo; reajuste atualiza as cobranças em aberto |
| RH e Folha | Custo real com férias, 13º, FGTS e INSS patronal pelo regime; "Lançar folha do mês" cria salários, FGTS e INSS no contas a pagar |
| Imobilizado | Depreciação linear correta e rendimento de aluguel |
| Checklist Fiscal | RBT12 e limites do MEI/Simples, Fator R, receitas sem nota, imposto do mês, comprovantes, categorias e NFS-e nacional |
| Histórico de alterações | Quem criou, alterou ou excluiu cada registro |
| Configurações | Empresa (CNPJ com dados da Receita, regime), Pix, categorias próprias ligadas ao DRE, backup e textos corretos sobre onde ficam os dados |

Erros corrigidos nesta versão: valores com centavos digitados na baixa e no saldo da conta eram lidos 100 vezes maiores; a consulta de CNPJ travava no fim; a janela de nova OS não abria; o histórico perdia a descrição das ações. Saíram: ranking de vendedores inventado, previsão fixa de estoque, "notícias do setor" inventadas na consulta de CNPJ e o texto que dizia que os dados ficavam só no navegador.

## Novidades da versão 5 (financeiro completo)

| Tela | O que faz |
|---|---|
| Contas a Pagar e Receber | Vencimentos, parcelas e contas recorrentes, baixa (individual ou em lote), estorno, filtros e busca |
| Cobrança por Pix | QR Code e Pix copia e cola com a chave cadastrada e o valor da conta, mais a mensagem pronta para o WhatsApp do cliente |
| Fluxo de Caixa e Bancos | Contas bancárias com saldo real, projeção dia a dia de 30 a 180 dias, aviso da data em que o caixa ficaria negativo, tabela semanal e exportação |
| DRE Gerencial | Mês a mês, por competência ou caixa, aberto por categoria, com exportação CSV |
| Conciliação | Importa OFX/CSV (inclusive OFX em latin-1 e CSV com ";" e vírgula decimal), reconhece o que já foi lançado, dá baixa nas contas em aberto e sugere categorias |
| Leitura com IA | Foto ou PDF de boleto, nota ou recibo vira lançamento para conferir (rota `/api/ler-documento`, usa a mesma chave do Gemini) |
| Notas Fiscais | Registro da nota emitida no Emissor Nacional, com busca do tomador pelo CNPJ, conta a receber automática e faturamento de 12 meses |
| Portal do Contador | Pacote do mês em CSV (lançamentos, DRE, notas e comprovantes) e mensagem pronta para o contador |
| Multiempresas | Várias empresas no mesmo login, com dados separados, e o Painel Multiempresas para BPO. Limite por plano: Básico 1, Intermediário 3, Completo 10, Unlimited sem limite; no teste grátis, 3 |
| Painel, relatórios e CFO IA | Todos os números passam a vir dos lançamentos (antes havia gráfico simulado e percentuais fixos). Perguntas livres vão para a IA com o contexto real da empresa |

Também foram removidos os dados de exemplo (clientes, notas "autorizadas", links de pagamento e funcionários fictícios), a emissão de NF-e simulada, o Open Finance simulado e o score de crédito inventado para CPF. As telas sem integração real (antecipação, links de pagamento e termofinança) saíram do menu.

**Atenção:** as regras do Firebase mudaram nesta versão (para permitir várias empresas no mesmo login). Cole de novo `firestore.rules` e `storage.rules` no console depois de publicar.

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
| `ASAAS_API_KEY` | Asaas → Integrações → Chaves de API (`$aact_hmlg_…` no sandbox, `$aact_prod_…` em produção). No Coolify, marque a variável como literal por causa do `$` |
| `ASAAS_WEBHOOK_TOKEN` | Um texto aleatório de 32+ caracteres, o mesmo do passo 4 |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key (CFO IA e leitura de boletos e notas) |

Enquanto `FIREBASE_SERVICE_ACCOUNT` não estiver cadastrada, o painel abre para todos com o aviso "Modo de configuração". Cadastre antes de divulgar.

## 3. Firebase (console.firebase.google.com → projeto max-cfo-saas)

1. **Authentication → Método de login:** ative E-mail/senha e Google.
2. **Authentication → Configurações → Domínios autorizados:** inclua `max-cfo-saas.vercel.app` e o seu domínio próprio, se tiver.
3. **Firestore → Regras:** apague o conteúdo, cole o arquivo `firestore.rules` e clique em Publicar.
4. **Storage → Regras:** cole o arquivo `storage.rules` e publique.

Importante: publique as regras depois que a nova versão estiver no ar. Elas bloqueiam o formato antigo (dados guardados pelo e-mail para gravação).

## 4. Asaas (www.asaas.com)

1. Crie a conta (CPF ou CNPJ), confirme os documentos e cadastre o site `https://landimadvisory.com.br` nos dados comerciais.
2. Integrações → Chaves de API → gere a chave e cadastre em `ASAAS_API_KEY`.
3. Integrações → Webhooks → Adicionar:
   - URL: `https://landimadvisory.com.br/api/asaas`
   - Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - Versão da API: v3 · Fila: sincronizada (ou não sincronizada) · Ativo
   - Eventos: todos de **Cobranças**, todos de **Assinaturas** e todos de **Checkout**
4. Notificações: o Asaas envia as cobranças de Pix e boleto por e-mail ao cliente. Ajuste em Configurações → Notificações (SMS e WhatsApp podem ter custo).

Como funciona: o cartão é cadastrado no checkout do Asaas e cobrado sozinho em cada vencimento; no Pix ou boleto, o Asaas gera uma cobrança por período e envia o link. Assinando no teste grátis, a 1ª cobrança vence quando o teste acaba. Cobrança vencida há mais de 5 dias suspende o painel até o pagamento. O cliente vê as cobranças, troca de plano ou cancela em `/assinatura`.

Os planos (R$ 79,90, R$ 149,90, R$ 349,90 e R$ 599,90, com preço de fundador e plano anual) ficam em `src/lib/plans.js`.

## 5. Teste antes de divulgar (sandbox do Asaas)

- [ ] Criar conta com e-mail e senha → abre o painel com "Teste grátis: 7 dias restantes".
- [ ] Sair e entrar de novo → o painel abre direto, sem voltar para o login.
- [ ] Lançar uma receita, recarregar a página e abrir em outro navegador → o lançamento aparece.
- [ ] Assinar no sandbox com um cartão de teste do Asaas → página de sucesso → painel com a assinatura; em "Minha assinatura" aparece a 1ª cobrança.
- [ ] Assinar com Pix ou boleto → abre a cobrança do Asaas; no sandbox, confirme o pagamento pelo painel do Asaas → o acesso fica "pago até".
- [ ] Em "Minha assinatura", cancelar → no Firebase, `subscriptions/{uid}` fica com `statusAsaas: DELETED` e o acesso vale até `pagoAte`.
- [ ] Menu → Simulador Tributário → buscar um CNPJ → os dados da empresa preenchem o simulador.
- [ ] CFO IA Chat responde perguntas livres usando os números da empresa.
- [ ] Contas a Pagar e Receber → "+ A receber" parcelado em 3x → aparecem 3 parcelas com vencimentos mensais.
- [ ] Cobrar por Pix → cadastrar a chave → ler o QR Code com o app do banco (deve mostrar o valor e o seu nome).
- [ ] Fluxo de Caixa → informar o saldo do extrato na conta → o saldo bate com o banco.
- [ ] Conciliação → importar o OFX do banco → baixas e lançamentos novos corretos.
- [ ] Ler boleto com IA → foto de um boleto → valor e vencimento preenchidos.
- [ ] Trocar de empresa no seletor do menu → dados separados; Painel Multiempresas mostra todas.
- [ ] Páginas `/termos` e `/privacidade` abrem pelo rodapé.

Para conferir que ninguém consegue liberar o acesso sozinho: com uma conta de teste vencida (ou `TRIAL_DAYS=0`), o painel deve mostrar "Seu teste grátis terminou".

## 6. Antes de vender

- [ ] Preencher nos termos e na política: razão social, CNPJ, e-mail de suporte e e-mail do encarregado de dados (estão marcados em dourado nas páginas).
- [ ] CNPJ com atividade de software (CNAE 6311-9/00 ou 6203-1/00; confirme com o contador).
- [ ] Busca e pedido de registro da marca "MAX CFO" no INPI.
- [ ] Domínio próprio (ex.: maxcfo.com.br) apontado para a Vercel.
- [ ] Trocar a chave do Asaas do sandbox para a de produção (e o webhook para a conta de produção).

## O servidor Python (pasta `backend/`)

A versão 1 não depende dele: login, dados, pagamentos e IA rodam na Vercel com Firebase e Stripe. O servidor (FastAPI, Asaas, Focus NFe) fica guardado para a próxima fase, quando entrarem Pix/boleto pelo Asaas e emissão de notas. O arquivo `requirements.txt` foi restaurado, então ele volta a publicar no Render se for reativado. A Vercel ignora essa pasta (`.vercelignore`).

## Próximas melhorias sugeridas

1. Guardar lançamentos em coleções separadas no Firestore (hoje ficam num único documento por conta, com limite de 1 MB; o painel avisa quando estiver perto).
2. Pix e boleto recorrentes pelo Asaas, com nota fiscal de serviço automática.
3. Permissões da equipe verificadas no servidor (hoje o módulo Equipe controla só a tela).
4. Página inicial renderizada no servidor, para aparecer melhor no Google.
5. Exportar e excluir a conta pelo próprio painel (direitos da LGPD).
