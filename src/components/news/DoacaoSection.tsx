/**
 * DoacaoSection — seção de doação (PIX + dados bancários).
 * Usa os dados da coleção "doacao" (singleton).
 */
import type { Doacao } from '../types';
import './DoacaoSection.css';

export interface DoacaoSectionProps {
  doacao: Doacao;
}

export function DoacaoSection({ doacao }: DoacaoSectionProps) {
  return (
    <section className="mv-doacao">
      <div className="mv-doacao__inner">
        <h2 className="mv-doacao__title">Salve o Água Branca!</h2>
        <p className="mv-doacao__lead">
          Sua contribuição nos ajuda a manter o monitoramento ambiental, as
          trilhas ecológicas e as ações de recuperação do Igarapé Água Branca.
        </p>

        <div className="mv-doacao__grid">
          <div className="mv-doacao__card mv-doacao__card--pix">
            <h3 className="mv-doacao__card-title">PIX</h3>
            <p className="mv-doacao__pix-key">{doacao.chave_pix}</p>
          </div>

          <div className="mv-doacao__card mv-doacao__card--bank">
            <h3 className="mv-doacao__card-title">Transferência bancária</h3>
            <table className="mv-doacao__table">
              <tbody>
                <tr>
                  <td className="mv-doacao__table-label">Banco</td>
                  <td>{doacao.banco}</td>
                </tr>
                <tr>
                  <td className="mv-doacao__table-label">Agência</td>
                  <td>{doacao.agencia}</td>
                </tr>
                <tr>
                  <td className="mv-doacao__table-label">Conta</td>
                  <td>{doacao.conta}</td>
                </tr>
                <tr>
                  <td className="mv-doacao__table-label">Tipo</td>
                  <td>{doacao.tipo_conta}</td>
                </tr>
                <tr>
                  <td className="mv-doacao__table-label">Titular</td>
                  <td>{doacao.titular}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {doacao.corpoHtml && (
          <div
            className="mv-doacao__extra"
            dangerouslySetInnerHTML={{ __html: doacao.corpoHtml }}
          />
        )}
      </div>
    </section>
  );
}

export default DoacaoSection;