# Segurança da Landim Advisory

Este documento reúne o que protege o sistema, o que fazer quando algo dá errado e as rotinas de manutenção.
Responsável: **Max Oliveira Paes Landim** (encarregado de dados) · maxpaeslandim@gmail.com · (61) 99210-5889.

---

## 1. O que já está implementado

| Item | Como funciona | Onde está |
|---|---|---|
| Autenticação | Firebase Authentication (e-mail e senha com hash do Google, ou login com Google). Confirmação de e-mail para convites, administrador e cortesia | `src/lib/firebase.js`, `src/app/dashboard/page.js` |
| Controle de acesso | Regras do Firestore isolam cada empresa; papéis leitura, analista e gestor; administrador conferido no servidor | `firestore.rules`, `storage.rules`, `src/lib/firebaseAdmin.js` |
| Criptografia | HTTPS em tudo; AES-256-GCM para chaves do Asaas e certificados A1; links de anexo assinados (HMAC) | `src/lib/cripto.js`, `src/lib/anexos.js` |
| Senhas | Nunca passam pelo nosso servidor: ficam no Firebase, com hash | — |
| SQL injection | O sistema não usa SQL (Firestore). A pasta `backend/` (Python) não é publicada | `.vercelignore` |
| XSS | Textos escapados antes de entrar no HTML; política de segurança de conteúdo (CSP) | `public/modules/*.js` (`esc`, `jsArg`), `next.config.mjs` |
| CSRF | As rotas usam `Authorization: Bearer <token>`, que outro site não consegue enviar | — |
| Limite de uso | Por usuário e por empresa, compartilhado entre os servidores (Firestore, por hora) | `src/lib/limite.js` |
| APIs | Toda rota confere login, segredo da rotina (`CRON_SECRET`) ou token do webhook, em tempo constante | `src/lib/seguranca.js`, `test/rotas.test.mjs` |
| Painel fechado sem configuração | Se o servidor estiver sem `FIREBASE_SERVICE_ACCOUNT`, o painel não abre em produção | `src/app/api/subscription/route.js` |
| Backup | Diário, guardado por 30 dias, só o servidor lê | `src/app/api/backup/route.js`, `vercel.json` |
| Monitoramento | Eventos suspeitos contados por dia; alerta por e-mail quando passam do normal; cartão Segurança no /admin | `src/lib/seguranca.js`, `src/app/api/manutencao/route.js` |
| Erros e violações de CSP | Registrados sem dados pessoais e mostrados no /admin | `src/app/api/erro`, `src/app/api/csp` |
| Exclusão de conta (LGPD) | Botão em Configurações › Dados; bloqueio imediato e exclusão definitiva em 30 dias | `src/lib/exclusao.js`, `src/app/api/conta` |
| Testes e auditoria | GitHub Actions a cada mudança e toda segunda-feira; Dependabot | `.github/` |

---

## 2. Plano de resposta a incidentes

**Incidente** é qualquer acesso não autorizado, vazamento, perda ou alteração indevida de dados, ou o sistema fora do ar por ataque.

### Sinais de alerta
- E-mail "⚠️ Alerta de segurança" (enviado pela manutenção diária).
- Cartão **Segurança** do /admin em vermelho.
- Cliente relatando dado que não é dele, cobrança estranha ou login que não fez.
- Aviso do Google, da Vercel, do Asaas ou do GitHub.

### Passo a passo

**1. Conter (na primeira hora)**
- Chave vazada? Troque já (veja a tabela abaixo).
- Conta de cliente invadida: Firebase › Authentication › usuário › **Desativar conta**. Isso também derruba as sessões abertas.
- Ataque em massa: Vercel › projeto › Firewall › **Attack Challenge Mode** (ligar).
- Último recurso: Vercel › projeto › Settings › **Pause Project** (o site sai do ar).

| Segredo | Onde trocar | Depois de trocar |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase › Configurações › Contas de serviço › gerar nova chave e **apagar a antiga** | Atualizar na Vercel e fazer Redeploy |
| `CHAVE_CRIPTO` | **Não troque sozinha**: as chaves e certificados guardados dependem dela. Peça ajuda para recriptografar | — |
| `ASAAS_API_KEY` | Asaas › Integrações › Chaves de API | Atualizar na Vercel |
| `ASAAS_WEBHOOK_TOKEN` | Inventar outro (32+ caracteres) | Atualizar na Vercel **e** no webhook do Asaas |
| `CRON_SECRET` | Inventar outro (40+ caracteres) | Atualizar na Vercel (a Vercel usa nas tarefas agendadas) |
| `RESEND_API_KEY` | resend.com › API Keys | Atualizar na Vercel |
| Senha do GitHub, Vercel, Google, Asaas | No próprio serviço, com verificação em duas etapas ligada | — |

**2. Entender (até 24 h)**
- Logs: Vercel › projeto › Logs (o plano gratuito guarda só 1 hora; anote ou tire print).
- /admin: cartões Segurança e Erros no navegador.
- Firebase › Authentication: logins recentes da conta afetada.
- Responder por escrito: o que aconteceu, quando, quais dados, quantos clientes, se ainda está acontecendo.

**3. Avaliar e comunicar (até 3 dias úteis)**
Pela LGPD (art. 48) e pela **Resolução CD/ANPD nº 15/2024**, quando o incidente puder causar **risco ou dano relevante** aos titulares (dados financeiros, documentos, acesso a contas, muitos titulares):
- **ANPD**: comunicar em até **3 dias úteis** a partir do conhecimento, pelo formulário no site gov.br/anpd ("Comunicar incidente de segurança").
- **Clientes afetados**: avisar no mesmo prazo, por e-mail, em linguagem simples: o que aconteceu, quais dados, o que já foi feito, o que o cliente deve fazer (por exemplo, trocar a senha) e o contato do encarregado.
- Se o incidente envolver dados que **o cliente** guarda no sistema (lançamentos, funcionários), somos operador: avise o cliente na hora, porque ele é o controlador e decide a comunicação aos titulares dele.
- Guardar o registro do incidente por pelo menos **5 anos**, mesmo quando não precisar comunicar (o que aconteceu, dados envolvidos, avaliação de risco, medidas tomadas).

Modelo de aviso ao cliente:
> Assunto: Aviso de segurança — Landim Advisory
>
> Olá, [nome]. Em [data] identificamos [o que aconteceu, em uma frase]. Os dados envolvidos foram [quais]. Já [medidas tomadas]. Recomendamos que você [ação para o cliente]. Comunicamos o ocorrido à Autoridade Nacional de Proteção de Dados (ANPD). Dúvidas: Max Oliveira Paes Landim, encarregado de dados, maxpaeslandim@gmail.com, (61) 99210-5889.

**4. Recuperar**
- Dados apagados ou alterados: /admin › Backups (cópias diárias de 30 dias).
- Publicar a correção, rodar `node scripts/teste-seguranca.mjs https://landimadvisory.com.br`, reativar o que foi pausado.

**5. Aprender (até 1 semana)**
- Anotar em `INCIDENTES.md` (fora do repositório público): data, causa, impacto, o que foi feito, o que muda para não repetir.

---

## 3. Operadores (fornecedores que tratam dados)

O contrato com cada um é o termo de serviço que aceitamos ao criar a conta. Todos têm acordo de proteção de dados (DPA) próprio, com cláusulas para transferência internacional (art. 33 da LGPD).

| Fornecedor | Para quê | Dados | Onde ficam | Termos de proteção de dados |
|---|---|---|---|---|
| Google Firebase / Google Cloud | Login, banco e cópias de segurança | Conta, dados das empresas | EUA | cloud.google.com/terms/data-processing-addendum |
| Vercel | Hospedagem do site e das rotas | Requisições, logs de 1 hora | EUA | vercel.com/legal/dpa |
| Hostinger (VPS/Coolify) | Servidor antigo e anexos | Anexos enviados | Conforme o plano contratado | Termos de serviço e Política de Privacidade da Hostinger |
| Asaas | Cobrança da assinatura e das cobranças dos clientes | Nome, CPF/CNPJ, e-mail, pagamentos | Brasil | Termos de uso e Política de Privacidade do Asaas (instituição de pagamento regulada pelo Banco Central) |
| Resend | E-mails de lembretes e alertas | E-mail, nome, valores dos lembretes | EUA | resend.com/legal/dpa |
| Receita Federal (Sefin Nacional) | Emissão de NFS-e | Dados da nota | Brasil | Obrigação legal |
| BrasilAPI, Minha Receita, ViaCEP | Consulta de CNPJ e CEP | Só o número consultado | Brasil | Dados públicos |
| GitHub | Código-fonte | Nenhum dado de cliente | EUA | docs.github.com/site-policy |

Revisar esta tabela a cada fornecedor novo e uma vez por ano. Fornecedor novo que recebe dados de cliente também entra na Política de Privacidade (`src/app/privacidade/page.js`).

---

## 4. Rotinas

| Quando | O quê |
|---|---|
| Todo dia (automático) | Backup 3h · manutenção 3h30 (exclusões, limpeza, alerta) · lembretes 7h (horário de Brasília) |
| A cada mudança no código | GitHub Actions: testes, auditoria, procura de chaves, build e teste das rotas |
| Toda segunda-feira (automático) | Auditoria de dependências e pull requests do Dependabot |
| Toda semana | Olhar o cartão Segurança do /admin e os pull requests do Dependabot |
| Todo mês | Rodar `node scripts/teste-seguranca.mjs https://landimadvisory.com.br`; conferir quem é administrador (`ADMIN_EMAILS`) e cortesia (`CORTESIA_EMAILS`) |
| Todo ano | Revisar este documento, a tabela de operadores, a Política de Privacidade e os Termos; trocar `CRON_SECRET` e `ASAAS_WEBHOOK_TOKEN` |

### Gestão de vulnerabilidades
- **Crítica** (vazamento ou acesso a dados de outra conta): corrigir em até 24 h.
- **Alta** (Dependabot ou `npm audit` marcam como high): até 7 dias.
- **Média e baixa**: na próxima atualização, até 30 dias.
- Quem encontrar uma falha pode avisar pelo e-mail do arquivo `public/.well-known/security.txt`.

### Revisão de código (antes de juntar um pull request)
- [ ] O GitHub Actions passou (verde).
- [ ] Rota nova em `src/app/api` confere login (`usuarioDaRequisicao`) ou segredo (`cronAutorizado`) e, se mexe em empresa, confere se o usuário é o dono ou da equipe.
- [ ] Rota nova que pode ser repetida em massa usa `limitar(...)`.
- [ ] Texto vindo do usuário passa por `esc(...)` antes de entrar no HTML, e por `jsArg(...)` dentro de `onclick`.
- [ ] Nenhuma chave ou senha no código (só em variáveis da Vercel).
- [ ] Serviço externo novo no navegador foi incluído na CSP (`next.config.mjs`) e na tabela de operadores.
- [ ] Mudou `firestore.rules` ou `storage.rules`? Publicar no console do Firebase depois de juntar.

### Privilégios de administrador
- Administrador = e-mail em `ADMIN_EMAILS` **com e-mail confirmado**. Manter só o necessário.
- Verificação em duas etapas ligada em: Google (Firebase), GitHub, Vercel, Asaas, Resend e Registro.br.
- Quem sair da equipe: tirar de `ADMIN_EMAILS`, dos convites e dos painéis acima no mesmo dia.

### Desfazer um pedido de exclusão de conta (antes dos 30 dias)
1. Firebase › Firestore › coleção `exclusoes` › apagar o documento do cliente (id = uid).
2. Firebase › Authentication › usuário › **Ativar conta**.
3. Se ele quiser voltar a assinar, assina de novo pelo painel.

---

## 5. Pendências de dependências (auditoria de 06/11/2026)

O `npm audit` acusa vulnerabilidades em bibliotecas que só se resolvem com atualização de versão principal:

| Biblioteca | Hoje | Problema | Correção |
|---|---|---|---|
| Next.js | 14.2.35 (a linha 14 não recebe mais correções) | Avisos críticos e altos: negação de serviço em Server Components e envenenamento de cache. Os de otimizador de imagem, nonce de CSP e WebSocket não se aplicam a este site | Atualizar para Next.js 15 ou 16, com React 19 |
| firebase (navegador) | 10.14 | Dependências internas antigas (undici, grpc-js) | Atualizar para firebase 12 |
| firebase-admin (servidor) | 12 | Idem | Atualizar para firebase-admin 13 |

Como fazer com segurança: num branch próprio, atualizar uma de cada vez, conferir o build e o GitHub Actions e testar na prévia da Vercel (login, painel, cobrança no sandbox, NFS-e em produção restrita) antes de juntar. Prazo recomendado pela regra da seção 4: até 7 dias para as altas e 24 h para críticas que afetem o site (as do Next.js afetam disponibilidade, não vazamento de dados). Depois, trocar `continue-on-error` para `false` no passo de auditoria do `.github/workflows/verificacoes.yml`.
