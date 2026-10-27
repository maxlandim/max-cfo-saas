import { EMPRESA } from '../../lib/empresa';

// Linha com razão social, CNPJ e endereço (Decreto 7.962/2013), para os rodapés do site.
export default function DadosEmpresa({ cor = '#6B7383', style }) {
  return (
    <p style={{ margin: 0, width: '100%', fontSize: 12.5, lineHeight: 1.6, color: cor, ...style }}>
      {EMPRESA.razao} · CNPJ {EMPRESA.cnpj} · {EMPRESA.endereco} · {EMPRESA.email} · WhatsApp {EMPRESA.whatsapp}
    </p>
  );
}
