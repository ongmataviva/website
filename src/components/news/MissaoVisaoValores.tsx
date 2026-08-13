/**
 * MissaoVisaoValores — seção com 3 cards da home.
 * Fundo branco, cards com sombra.
 */
import './MissaoVisaoValores.css';

const CARDS = [
  {
    titulo: 'Missão',
    descricao:
      'Vigiar, preservar e recuperar o Igarapé Água Branca por meio de monitoramento científico, educação ambiental e incidência política.',
  },
  {
    titulo: 'Visão',
    descricao:
      'Ser referência em transparência ambiental e gestão participativa de bacias hidrográficas na Amazônia.',
  },
  {
    titulo: 'Valores',
    descricao:
      'Transparência, autonomia comunitária, ciência cidadã, justiça ambiental e defesa intransigente do direito à água.',
  },
];

export function MissaoVisaoValores() {
  return (
    <section className="mv-mvv">
      <div className="mv-mvv__inner">
        <div className="mv-mvv__grid">
          {CARDS.map((card) => (
            <article key={card.titulo} className="mv-mvv__card">
              <h3 className="mv-mvv__card-title">{card.titulo}</h3>
              <p className="mv-mvv__card-desc">{card.descricao}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MissaoVisaoValores;