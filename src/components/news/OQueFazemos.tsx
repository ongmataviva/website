/**
 * OQueFazemos — seção "O que fazemos?" da home.
 * Cards estáticos: Plantio de Mudas Nativas, Projeto Trilha Ecológica,
 * Monitoramento Online. Fundo F7F8FA.
 */
import './OQueFazemos.css';

const CARDS = [
  {
    titulo: 'Plantio de Mudas Nativas',
    descricao:
      'Promovemos o reflorestamento da mata ciliar do Igarapé Água Branca com espécies nativas da Amazônia, recuperando nascentes e protegendo a biodiversidade.',
    icone: '🌱',
  },
  {
    titulo: 'Projeto Trilha Ecológica',
    descricao:
      'Educação ambiental na prática: trilhas monitoradas que conectam a comunidade ao ecossistema local, com identificação de fauna e flora.',
    icone: '🌿',
  },
  {
    titulo: 'Monitoramento Online',
    descricao:
      'Dados abertos e transparência: análises da qualidade da água, imagens de satélite e boletins ambientais acessíveis a todos.',
    icone: '📡',
  },
];

export function OQueFazemos() {
  return (
    <section className="mv-oquefazemos">
      <div className="mv-oquefazemos__inner">
        <h2 className="mv-oquefazemos__title">O que fazemos?</h2>
        <div className="mv-oquefazemos__grid">
          {CARDS.map((card) => (
            <article key={card.titulo} className="mv-oquefazemos__card">
              <span className="mv-oquefazemos__icon" aria-hidden="true">
                {card.icone}
              </span>
              <h3 className="mv-oquefazemos__card-title">{card.titulo}</h3>
              <p className="mv-oquefazemos__card-desc">{card.descricao}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OQueFazemos;