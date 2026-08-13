/**
 * Sobre — Página "Sobre Nós" customizada (hard-coded, sem CMS).
 * Conteúdo extraído do Figma "Igarapé Água Branca".
 */
import { useEffect } from 'react';
import './Sobre.css';

const MVV = [
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

export function Sobre() {
  useEffect(() => {
    document.title = 'Sobre Nós — Mata Viva';
  }, []);

  return (
    <div className="mv-page-sobre">
      {/* ── Hero ── */}
      <section className="mv-page-sobre__hero">
        <div className="mv-page-sobre__hero-inner">
          <div className="mv-page-sobre__hero-visual" aria-hidden="true" />
          <div className="mv-page-sobre__hero-text">
            <span className="mv-page-sobre__hero-eyebrow">SOBRE NÓS</span>
            <h1 className="mv-page-sobre__hero-title">
              Conectando Comunidades<br />
              Pela Preservação Ambiental
            </h1>
            <p className="mv-page-sobre__hero-desc">
              Há mais de 22 anos, a Associação Mata Viva reúne moradores,
              ativistas e pesquisadores na proteção do Igarapé Água Branca,
              dentro da APA Tarumã, em Manaus/AM. Atuamos com mobilização
              comunitária, mutirões de limpeza, educação ambiental e
              monitoramento da qualidade da água — sempre com transparência
              e participação popular.
            </p>
          </div>
        </div>
      </section>

      {/* ── Missão / Visão / Valores ── */}
      <section className="mv-page-sobre__mvv">
        <div className="mv-page-sobre__mvv-inner">
          <h2 className="mv-page-sobre__mvv-title">Nossa essência</h2>
          <div className="mv-page-sobre__mvv-grid">
            {MVV.map((card) => (
              <article key={card.titulo} className="mv-page-sobre__mvv-card">
                <div className="mv-page-sobre__mvv-icon" aria-hidden="true" />
                <h3 className="mv-page-sobre__mvv-card-title">
                  {card.titulo}
                </h3>
                <p className="mv-page-sobre__mvv-card-desc">
                  {card.descricao}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Sobre;