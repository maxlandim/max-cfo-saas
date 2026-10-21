import LegalPage from '../components/LegalPage';

export const metadata = { title: 'Política de Privacidade — MAX CFO AI' };

export default function PrivacidadePage() {
  return (
    <LegalPage titulo="Política de Privacidade" atualizado="outubro de 2026">
      <p>Esta política explica como o MAX CFO AI, operado por <span className="pendente">[RAZÃO SOCIAL]</span> (CNPJ <span className="pendente">[CNPJ]</span>), trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <h2>1. Papéis</h2>
      <ul>
        <li><b>Dados da sua conta</b> (nome, e-mail, documento, dados de pagamento): somos o controlador.</li>
        <li><b>Dados que você cadastra no painel</b> (lançamentos, clientes, fornecedores, funcionários, notas): sua empresa é a controladora e nós atuamos como operador, tratando esses dados apenas para prestar o serviço.</li>
      </ul>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail, CPF ou CNPJ e senha (guardada de forma criptografada pelo Google Firebase).</li>
        <li>Uso do painel: os dados financeiros e cadastrais que você inserir ou importar (extratos OFX/CSV, planilhas, anexos).</li>
        <li>Pagamento: o Stripe processa o cartão; nós recebemos só o status da assinatura, nunca o número completo do cartão.</li>
        <li>Dados técnicos: registros de acesso, aparelho e navegador, para segurança e correção de erros.</li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Prestar o serviço contratado e manter sua conta (execução de contrato).</li>
        <li>Cobrar a assinatura e emitir documentos fiscais (execução de contrato e obrigação legal).</li>
        <li>Garantir segurança, prevenir fraudes e melhorar a plataforma (legítimo interesse).</li>
        <li>Enviar avisos sobre a conta e, se você permitir, novidades (consentimento, que pode ser retirado a qualquer momento).</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <ul>
        <li><b>Google Firebase / Google Cloud:</b> login, banco de dados e armazenamento de anexos.</li>
        <li><b>Vercel:</b> hospedagem do site.</li>
        <li><b>Stripe:</b> processamento de pagamentos.</li>
        <li><b>Google Gemini:</b> quando você usa o CFO IA Chat, a pergunta e um resumo dos números (receitas, despesas, saldo e quantidade de lançamentos) são enviados para gerar a resposta.</li>
        <li><b>BrasilAPI / Minha Receita:</b> quando você consulta um CNPJ, o número é enviado para buscar os dados públicos da Receita Federal.</li>
      </ul>
      <p>Alguns desses fornecedores guardam dados fora do Brasil, com cláusulas de proteção compatíveis com a LGPD (art. 33). Não vendemos dados pessoais.</p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>Enquanto a conta estiver ativa. Após o encerramento, os dados ficam disponíveis para exportação por 30 dias e depois são excluídos, exceto o que a lei obriga a guardar (por exemplo, registros fiscais e de acesso).</p>

      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), regras de acesso que isolam os dados de cada conta e verificação de assinatura no servidor. Nenhum sistema é 100% imune; se houver um incidente relevante, avisaremos os afetados e a ANPD, como prevê a lei.</p>

      <h2>7. Seus direitos</h2>
      <p>Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, exclusão, informação sobre compartilhamento e revogação do consentimento (art. 18 da LGPD). Escreva para o encarregado de dados: maxpaeslandim@gmail.com. Respondemos em até 15 dias.</p>

      <h2>8. Armazenamento no navegador</h2>
      <p>O painel guarda preferências e uma cópia dos dados no próprio navegador para funcionar mais rápido. Não usamos cookies de publicidade.</p>

      <h2>9. Menores de idade</h2>
      <p>A plataforma é destinada a empresas e profissionais e não deve ser usada por menores de 18 anos.</p>

      <h2>10. Mudanças</h2>
      <p>Quando esta política mudar, a nova versão será publicada aqui com a data atualizada, e mudanças relevantes serão avisadas no painel.</p>
    </LegalPage>
  );
}
