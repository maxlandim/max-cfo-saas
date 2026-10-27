import LegalPage from '../components/LegalPage';
import { EMPRESA } from '../../lib/empresa';

export const metadata = { title: 'Política de Privacidade — Landim Advisory' };

export default function PrivacidadePage() {
  return (
    <LegalPage titulo="Política de Privacidade" atualizado="27 de outubro de 2026">
      <p>Esta política explica como a Landim Advisory, operada por {EMPRESA.razao} (CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}), trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <h2>1. Papéis</h2>
      <ul>
        <li><b>Dados da sua conta</b> (nome, e-mail, documento, dados de pagamento): somos o controlador.</li>
        <li><b>Dados que você cadastra no painel</b> (lançamentos, clientes, fornecedores, funcionários, notas): sua empresa é a controladora e nós atuamos como operador, tratando esses dados apenas para prestar o serviço.</li>
      </ul>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail, CPF ou CNPJ e senha (guardada de forma criptografada pelo Google Firebase).</li>
        <li>Uso do painel: os dados financeiros e cadastrais que você inserir ou importar (extratos OFX/CSV, planilhas, anexos).</li>
        <li>Pagamento: o Asaas processa o cartão, o Pix e o boleto. Guardamos o nome e o CPF ou CNPJ informados para a cobrança e recebemos só o status das cobranças, nunca o número do cartão.</li>
        <li>Emissão de NFS-e: o certificado digital A1 da empresa e a senha dele, guardados cifrados (AES-256) no servidor e usados só para assinar e enviar as notas que você emitir. Eles nunca voltam para o navegador e você pode removê-los quando quiser.</li>
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
        <li><b>Hospedagem:</b> servidor contratado (Hostinger) ou Vercel, onde o site roda.</li>
        <li><b>Resend:</b> envio dos lembretes por e-mail que você ligar em Configurações (resumo do dia para você e aviso de vencimento para os seus clientes, com nome, valor, vencimento e Pix).</li>
        <li><b>Pessoas que você autorizar:</b> quem você liberar em Equipe e acessos (o seu cliente ou contador, por exemplo) vê os dados daquela empresa em modo somente leitura, até você remover o acesso.</li>
        <li><b>Asaas:</b> processamento de pagamentos (cartão, Pix e boleto) e envio das cobranças.</li>
        <li><b>Leitura de documentos e CFO:</b> a leitura de boletos e notas e as respostas do CFO são feitas no seu próprio navegador, pelo sistema. Os arquivos e as perguntas não são enviados a serviços de inteligência artificial de terceiros.</li>
        <li><b>Receita Federal (Sefin Nacional da NFS-e):</b> quando você emite ou cancela uma NFS-e, os dados da nota (prestador, tomador, serviço e valores) vão assinados com o seu certificado para o sistema nacional da NFS-e.</li>
        <li><b>ViaCEP:</b> quando você informa um CEP na emissão da nota, o número é consultado para completar o endereço.</li>
        <li><b>BrasilAPI / Minha Receita:</b> quando você consulta um CNPJ, o número é enviado para buscar os dados públicos da Receita Federal.</li>
      </ul>
      <p>Alguns desses fornecedores guardam dados fora do Brasil, com cláusulas de proteção compatíveis com a LGPD (art. 33). Não vendemos dados pessoais.</p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>Enquanto a conta estiver ativa. Após o encerramento, os dados ficam disponíveis para exportação por 30 dias e depois são excluídos, exceto o que a lei obriga a guardar (por exemplo, registros fiscais e de acesso).</p>

      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), regras de acesso que isolam os dados de cada conta e verificação de assinatura no servidor. Nenhum sistema é 100% imune; se houver um incidente relevante, avisaremos os afetados e a ANPD, como prevê a lei.</p>

      <h2>7. Seus direitos</h2>
      <p>Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, exclusão, informação sobre compartilhamento e revogação do consentimento (art. 18 da LGPD). Escreva para o encarregado de dados, Max Oliveira Paes Landim: {EMPRESA.email}. Respondemos em até 15 dias.</p>

      <h2>8. Armazenamento no navegador</h2>
      <p>O painel guarda preferências e uma cópia dos dados no próprio navegador para funcionar mais rápido. Não usamos cookies de publicidade.</p>

      <h2>9. Menores de idade</h2>
      <p>A plataforma é destinada a empresas e profissionais e não deve ser usada por menores de 18 anos.</p>

      <h2>10. Mudanças</h2>
      <p>Quando esta política mudar, a nova versão será publicada aqui com a data atualizada, e mudanças relevantes serão avisadas no painel.</p>
    </LegalPage>
  );
}
