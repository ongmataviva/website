/**
 * Projetos — Página "Projetos" customizada (hard-coded, sem CMS).
 * Conteúdo extraído do Figma "Igarapé Água Branca".
 */
import { useEffect } from 'react';
import './Projetos.css';

const METAS = [
  'Monitorar a qualidade da água em 5 pontos estratégicos do Igarapé',
  'Publicar boletins mensais com dados abertos e acessíveis à comunidade',
  'Ampliar a rede de voluntários para coleta e análise de amostras',
];

const ESTRATEGIAS = [
  'Mobilização de moradores para mutirões de limpeza nas margens',
  'Oficinas de educação ambiental com escolas da região da APA Tarumã',
  'Campanhas de preservação e conscientização nas redes sociais e na mídia local',
];

const RESULTADOS = [
  { numero: '1', label: 'Núcleo de monitoramento formado' },
  { numero: '2', label: 'Boletins trimestrais publicados' },
  { numero: '3', label: 'Mutirões realizados na bacia' },
  { numero: '4', label: 'Oficinas com escolas' },
  { numero: '5', label: 'Pontos de coleta ativos' },
  { numero: '6', label: 'Anos de atuação ininterrupta' },
];

export function Projetos() {
  useEffect(() => {
    document.title = 'Projetos — Mata Viva';
  }, []);

  return (
    <div className="mv-page-projetos">
      {/* ── Hero ── */}
      <section className="mv-page-projetos__hero">
        <div className="mv-page-projetos__hero-inner">
          <div className="mv-page-projetos__hero-visual" aria-hidden="true" />
          <div className="mv-page-projetos__hero-text">
            <span className="mv-page-projetos__hero-eyebrow">PROJETOS</span>
            <h1 className="mv-page-projetos__hero-title">
              Monitoramento online<br />
              de Igarapés Urbanos
            </h1>
            <p className="mv-page-projetos__hero-desc">
              O projeto de Monitoramento Online de Igarapés Urbanos une
              ciência cidadã e tecnologia para acompanhar em tempo real a
              qualidade da água do Igarapé Água Branca. Os dados são
              públicos e alimentam relatórios, boletins e ações de
              recuperação ambiental.
            </p>
          </div>
        </div>
      </section>

      {/* ── Metas (monitoramento) ── */}
      <section className="mv-page-projetos__section">
        <div className="mv-page-projetos__section-inner mv-page-projetos__section--reverse">
          <div className="mv-page-projetos__section-visual" aria-hidden="true" />
          <div className="mv-page-projetos__section-text">
            <h2 className="mv-page-projetos__section-title">
              Metas do monitoramento
            </h2>
            <ul className="mv-page-projetos__checklist">
              {METAS.map((item) => (
                <li key={item} className="mv-page-projetos__checklist-item">
                  <span className="mv-page-projetos__check-icon" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Estratégia ── */}
      <section className="mv-page-projetos__section mv-page-projetos__section--alt">
        <div className="mv-page-projetos__section-inner">
          <div className="mv-page-projetos__section-visual" aria-hidden="true" />
          <div className="mv-page-projetos__section-text">
            <h2 className="mv-page-projetos__section-title">
              Estratégia de ação
            </h2>
            <ul className="mv-page-projetos__checklist">
              {ESTRATEGIAS.map((item) => (
                <li key={item} className="mv-page-projetos__checklist-item">
                  <span className="mv-page-projetos__check-icon" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Resultados ── */}
      <section className="mv-page-projetos__resultados">
        <div className="mv-page-projetos__resultados-inner">
          <h2 className="mv-page-projetos__resultados-title">
            Nossos Resultados
          </h2>
          <div className="mv-page-projetos__resultados-grid">
            {RESULTADOS.map((r) => (
              <div key={r.numero} className="mv-page-projetos__resultado">
                <span className="mv-page-projetos__resultado-marker">
                  {r.numero}
                </span>
                <p className="mv-page-projetos__resultado-label">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Projetos;