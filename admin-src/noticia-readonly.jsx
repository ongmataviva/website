import { Badge, Button, Card } from './ui';
import { entityMeta } from './entities';
import { navigate } from './routing';

/* ============================================================
   Modo leitura de notícia (M3): não-admin visualiza notícias que
   não são suas sem poder editar. Renderização estática dos campos
   e do corpo (markdown cru, sem salvar).
   ============================================================ */

export function NoticiaReadOnly({ slug, entry }) {
  const meta = entityMeta('noticia');
  const d = entry?.data || {};

  return (
    <>
      <header className="pnl-header pnl-editor-header">
        <div>
          <p className="pnl-breadcrumb">
            <button
              type="button"
              className="pnl-breadcrumb-link"
              onClick={() => navigate('collection', { collectionName: 'noticia' })}
            >
              {meta.label}
            </button>
            <span aria-hidden="true"> / </span>
            <span>{slug}</span>
          </p>
          <h1 className="pnl-title">{d.titulo || 'Sem título'}</h1>
          <p className="pnl-subtitle">
            Modo leitura · <Badge variant="outline">somente leitura</Badge>
          </p>
        </div>
        <div className="pnl-header-actions">
          <Button variant="ghost" onClick={() => navigate('collection', { collectionName: 'noticia' })}>
            Voltar
          </Button>
        </div>
      </header>

      <div className="pnl-editor-grid">
        <Card className="pnl-editor-section">
          {d.imagem ? <img className="pnl-readonly-image" src={d.imagem} alt="" /> : null}
          <dl className="pnl-readonly-meta">
            {d.categoria ? (
              <div>
                <dt>Categoria</dt>
                <dd>{d.categoria}</dd>
              </div>
            ) : null}
            {d.autor ? (
              <div>
                <dt>Autor</dt>
                <dd>{d.autor}</dd>
              </div>
            ) : null}
            {d.data ? (
              <div>
                <dt>Data</dt>
                <dd>{String(d.data).slice(0, 10)}</dd>
              </div>
            ) : null}
            {d.atualizada ? (
              <div>
                <dt>Atualizada em</dt>
                <dd>{String(d.atualizada).slice(0, 16)}</dd>
              </div>
            ) : null}
            {d.destaque ? (
              <div>
                <dt>Destaque</dt>
                <dd>Sim</dd>
              </div>
            ) : null}
            {Array.isArray(d.tags) && d.tags.length ? (
              <div>
                <dt>Tags</dt>
                <dd>{d.tags.join(', ')}</dd>
              </div>
            ) : null}
          </dl>
          {d.resumo ? <p className="pnl-readonly-resumo">{d.resumo}</p> : null}
          {d.body ? <pre className="pnl-readonly-body">{String(d.body)}</pre> : null}
        </Card>
      </div>
    </>
  );
}
