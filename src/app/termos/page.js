import LegalPage from '../components/LegalPage';
import { EMPRESA } from '../../lib/empresa';

export const metadata = { title: 'Termos de Uso — Landim Advisory' };

export default function TermosPage() {
  return (
    <LegalPage titulo="Termos de Uso" atualizado="27 de outubro de 2026">
      <h2>1. Quem somos</h2>
      <p>A Landim Advisory é uma plataforma on-line de gestão financeira para empresas, operada por {EMPRESA.razao}, inscrita no CNPJ {EMPRESA.cnpj}, com sede em {EMPRESA.endereco}. Contato: {EMPRESA.email} ou WhatsApp {EMPRESA.whatsapp}.</p>

      <h2>2. Aceite</h2>
      <p>Ao criar uma conta ou usar a plataforma, você declara ter lido e aceito estes Termos e a <a href="/privacidade">Política de Privacidade</a>. Se usar a Landim Advisory em nome de uma empresa, você declara ter poderes para aceitá-los em nome dela.</p>

      <h2>3. Conta e acesso</h2>
      <ul>
        <li>Você é responsável pelos dados informados no cadastro e por manter sua senha em sigilo.</li>
        <li>Cada conta é pessoal. Membros da equipe devem usar convites próprios.</li>
        <li>Avise o suporte imediatamente se suspeitar de uso indevido da sua conta.</li>
      </ul>

      <h2>4. Teste grátis, planos e pagamento</h2>
      <ul>
        <li>Toda conta nova tem 7 dias de teste grátis, sem cartão. Ao fim do teste, o acesso ao painel exige uma assinatura.</li>
        <li>Os planos podem ser mensais ou anuais, com cobrança pelo Asaas a cada período até o cancelamento: no cartão de crédito, cobrada automaticamente; no Pix ou no boleto, enviada por e-mail para pagamento até o vencimento. Com uma cobrança vencida há mais de 5 dias, o acesso ao painel fica suspenso até o pagamento, sem perda dos dados.</li>
        <li>Você pode cancelar a qualquer momento. O acesso continua até o fim do período já pago, e não há multa nem fidelidade.</li>
        <li>Na primeira contratação, você pode desistir em até 7 dias e receber o valor de volta (art. 49 do Código de Defesa do Consumidor).</li>
        <li>Os preços podem mudar. Avisaremos com pelo menos 30 dias de antecedência, e a mudança vale a partir da renovação seguinte.</li>
        <li>Se o pagamento falhar, o acesso pode ser suspenso até a regularização. Os dados ficam guardados.</li>
      </ul>

      <h2>5. Uso permitido</h2>
      <p>Você se compromete a não usar a plataforma para atividades ilegais, não tentar acessar dados de outros clientes, não sobrecarregar ou atacar o sistema e não copiar, revender ou fazer engenharia reversa do software.</p>

      <h2>6. Seus dados</h2>
      <p>Os dados financeiros que você cadastra continuam sendo seus. Nós os tratamos apenas para prestar o serviço, como descrito na Política de Privacidade. Você pode exportá-los a qualquer momento em Configurações e pedir a exclusão da conta.</p>

      <h2>7. Simulações, IA e informações fiscais</h2>
      <p>Relatórios, simulações tributárias, projeções e respostas do CFO IA são estimativas de apoio à decisão, feitas a partir dos dados que você informa e das regras vigentes na data de cada cálculo. Eles não substituem a apuração contábil, o parecer de um contador ou advogado, nem garantem economia de impostos. Confira enquadramento, benefícios estaduais e regras do município antes de decidir.</p>

      <h2>8. Disponibilidade</h2>
      <p>Trabalhamos para manter a plataforma disponível o tempo todo, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros (hospedagem, bancos, órgãos públicos). Recomendamos exportar backups periódicos.</p>

      <h2>9. Responsabilidade</h2>
      <p>Na máxima extensão permitida pela lei, nossa responsabilidade por danos ligados ao serviço fica limitada ao valor pago pelo cliente nos 12 meses anteriores ao fato. Não respondemos por decisões tomadas com base em dados incorretos informados pelo usuário.</p>

      <h2>10. Propriedade intelectual</h2>
      <p>O software, a marca Landim Advisory e o conteúdo da plataforma pertencem ao operador. A assinatura dá a você uma licença de uso, pessoal e intransferível, enquanto estiver ativa.</p>

      <h2>11. Encerramento</h2>
      <p>Você pode encerrar a conta a qualquer momento. Podemos suspender ou encerrar contas que violem estes Termos. Após o encerramento, os dados ficam disponíveis para exportação por 30 dias e depois são excluídos, salvo obrigação legal de guarda.</p>

      <h2>12. Alterações e foro</h2>
      <p>Podemos atualizar estes Termos; mudanças relevantes serão avisadas por e-mail ou no painel. Fica eleito o foro de Brasília-DF, ressalvado o direito do consumidor de propor ação no seu domicílio.</p>
    </LegalPage>
  );
}
