import { useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultRoutingTable,
  matchRoute,
  Notifications,
  useAppSelector,
  useAuth,
  useCollection,
  useConfig,
} from '@laikacms/decap-cms/core';
import { Button, Forbidden, LoadingScreen } from './ui';
import { COLLECTION_ORDER, entityMeta } from './entities';
import { navigate, navigatePath, useRouterPath } from './routing';
import { CollectionList } from './collection-list';
import { EntryEditor, NoticiaEntryGate } from './editor';
import { EditorSettings } from './editor-settings';
import { usePermissions } from './permissions';

/* ============================================================
   Login (produção — OAuth Google via worker /auth + /callback).
   Fluxo de redirecionamento de página inteira (sem popup):
   /admin → /auth → Google → /callback (guarda sessão em
   sessionStorage 'mataviva-auth') → /admin.
   ============================================================ */

const AUTH_KEY = 'mataviva-auth';

function startGoogleLogin({ config, setError }) {
  const backendConfig = config.backend || {};
  // Em produção o base_url do config.yml aponta para o domínio real.
  // Em localhost (wrangler dev) o fluxo precisa usar a origem local.
  const hostname = document.location.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const baseUrl = isLocalHost
    ? document.location.origin
    : String(backendConfig.base_url || '').replace(/\/+$/, '');
  if (!baseUrl) {
    setError('Backend sem base_url no config.');
    return;
  }
  const authEndpoint = backendConfig.auth_endpoint || 'auth';
  const scope = backendConfig.auth_scope || 'repo';
  const host = document.location.host.split(':')[0];
  const siteId = host === 'localhost' ? 'demo.decapcms.org' : host;
  const url = `${baseUrl}/${authEndpoint}?provider=github&site_id=${encodeURIComponent(siteId)}&scope=${encodeURIComponent(scope)}`;
  window.location.href = url;
}

function LoginScreen() {
  const { login, isAuthenticating, authError } = useAuth();
  const { config } = useConfig();
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setError(null);
    startGoogleLogin({ config, onLogin: login, setError });
  };

  return (
    <div className="pnl-login">
      <div className="pnl-login-card">
        <div className="pnl-login-brand">
          <span className="pnl-brand-mark">M</span>
          <div style={{ textAlign: 'left' }}>
            <div className="pnl-brand-name">Mata Viva</div>
            <div className="pnl-brand-sub">Painel de Conteúdo</div>
          </div>
        </div>
        <h1 className="pnl-login-title">Entrar no Painel</h1>
        <p className="pnl-login-sub">
          Acesse com sua conta Google para gerenciar o conteúdo do site.
        </p>
        {error || authError ? <p className="pnl-login-error">{String(error || authError)}</p> : null}
        <Button variant="primary" size="lg" onClick={handleLogin} disabled={isAuthenticating}>
          {isAuthenticating ? 'Entrando…' : 'Entrar com Google'}
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Sidebar
   ============================================================ */

function Sidebar() {
  const path = useRouterPath();
  const { user, logout } = useAuth();
  const { collections } = useCollection();
  const entriesState = useAppSelector((state) => state.entries);
  const perms = usePermissions();
  const [open, setOpen] = useState(false);

  const displayName = user?.name || user?.login || user?.email || 'Usuário local';
  const displayLogin = user?.login ? `@${user.login}` : '';

  return (
    <aside className={open ? 'pnl-sidebar pnl-sidebar--open' : 'pnl-sidebar'}>
      <div className="pnl-brand">
        <span className="pnl-brand-mark">M</span>
        <div>
          <div className="pnl-brand-name">Mata Viva</div>
          <div className="pnl-brand-sub">Painel de Conteúdo</div>
        </div>
        <button
          type="button"
          className="pnl-sidebar-toggle"
          aria-expanded={open}
          aria-controls="pnl-sidebar-content"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Fechar' : 'Menu'}
        </button>
      </div>

      <div id="pnl-sidebar-content" className="pnl-sidebar-content">
      <nav className="pnl-nav" aria-label="Coleções">
        <span className="pnl-nav-label">Conteúdo</span>
        {COLLECTION_ORDER.map((name) => {
          const meta = entityMeta(name);
          const collection = collections?.[name];
          const label = collection?.label || meta.label;
          const active = path === `/collections/${name}` || path?.startsWith(`/collections/${name}/`);
          const count = entriesState?.pages?.[name]?.ids?.length;
          return (
            <button
              key={name}
              type="button"
              className={active ? 'pnl-nav-item pnl-nav-item--active' : 'pnl-nav-item'}
              onClick={() => {
                navigate('collection', { collectionName: name });
                setOpen(false);
              }}
            >
              <span>{label}</span>
              {count != null ? <span className="pnl-nav-count">{count}</span> : null}
            </button>
          );
        })}
      </nav>

      {perms.canEditList ? (
        <nav className="pnl-nav" aria-label="Administração">
          <span className="pnl-nav-label">Administração</span>
          <button
            type="button"
            className={path === '/equipe' ? 'pnl-nav-item pnl-nav-item--active' : 'pnl-nav-item'}
            onClick={() => {
              navigatePath('/equipe');
              setOpen(false);
            }}
          >
            <span>Equipe</span>
          </button>
        </nav>
      ) : null}

      <div className="pnl-user">
        <span className="pnl-avatar" aria-hidden="true" />
        <div className="pnl-user-meta">
          <div className="pnl-user-name">{displayName}</div>
          <div className="pnl-user-login">{displayLogin}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sair
        </Button>
      </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Rotas (hash router do motor + tabela padrão do Decap)
   ============================================================ */

const VIEWS = new Set(['collection', 'entryNew', 'entry']);

function PainelRoutes() {
  const path = useRouterPath();
  const { collections } = useCollection();
  const perms = usePermissions();
  const first = useMemo(() => COLLECTION_ORDER.find((name) => collections?.[name]), [collections]);
  const match = useMemo(() => (path ? matchRoute(defaultRoutingTable, path) : null), [path]);

  useEffect(() => {
    if (!path || path === '/') {
      if (first) navigate('collection', { collectionName: first });
      return;
    }
    if (match && !VIEWS.has(match.key)) {
      if (first) navigate('collection', { collectionName: first });
    }
  }, [path, match, first, navigate]);

  // Rota custom do Painel (fora da tabela padrão do motor).
  if (path === '/equipe') {
    if (!perms.canEditList) {
      return <Forbidden message="Somente administradores gerenciam a equipe." />;
    }
    return <EditorSettings />;
  }

  if (!match) return null;

  switch (match.key) {
    case 'collection':
      return <CollectionList collectionName={match.params.collectionName} />;
    case 'entryNew': {
      const name = match.params.collectionName;
      if (!perms.canEditCollection(name)) {
        return <Forbidden message="Somente administradores editam esta coleção." />;
      }
      if (name === 'noticia') return <NoticiaEntryGate isNew />;
      // key força remontagem limpa do rascunho ao trocar de entrada.
      return <EntryEditor key={`${name}/new`} collectionName={name} isNew />;
    }
    case 'entry': {
      const name = match.params.collectionName;
      if (!perms.canEditCollection(name)) {
        return <Forbidden message="Somente administradores editam esta coleção." />;
      }
      if (name === 'noticia') {
        return <NoticiaEntryGate key={`noticia/${match.params.slug}`} slug={match.params.slug} />;
      }
      return (
        <EntryEditor
          key={`${name}/${match.params.slug}`}
          collectionName={name}
          slug={match.params.slug}
        />
      );
    }
    default:
      return null;
  }
}

/* ============================================================
   Gates: config → auth → shell
   ============================================================ */

// Em localhost NUNCA usamos o backend github: o dev local é sempre o proxy
// (cms:server em :9191, grava no filesystem). Se o proxy não for detectado,
// mostramos um aviso em vez da tela de login (GitHub/Google é só produção).
const isLocalHost =
  document.location.hostname === 'localhost' || document.location.hostname === '127.0.0.1';

function LocalServerHint() {
  return (
    <div className="pnl-login">
      <div className="pnl-login-card">
        <div className="pnl-login-brand">
          <span className="pnl-brand-mark">M</span>
          <div style={{ textAlign: 'left' }}>
            <div className="pnl-brand-name">Mata Viva</div>
            <div className="pnl-brand-sub">Painel de Conteúdo</div>
          </div>
        </div>
        <h1 className="pnl-login-title">Servidor local não detectado</h1>
        <p className="pnl-login-sub">
          O Painel precisa do servidor CMS local (proxy em localhost:9191) para gravar no
          filesystem. Rode <code>pnpm dev:all</code> (ou <code>pnpm cms:server</code>) e
          recarregue a página.
        </p>
        <Button variant="primary" size="lg" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

function AuthGate() {
  const { config, backend } = useConfig();
  const { isAuthenticated, isAuthenticating, login } = useAuth();
  const backendName = backend?.name;
  const isProxy = backendName === 'proxy';
  const attempted = useRef(false);
  const [pendingAuth, setPendingAuth] = useState(() => Boolean(sessionStorage.getItem(AUTH_KEY)));

  // Login por redirecionamento de página inteira: o /callback guarda
  // {token, provider, user} em sessionStorage e volta para /admin/.
  useEffect(() => {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(AUTH_KEY);
    setPendingAuth(false);
    try {
      const payload = JSON.parse(raw);
      if (payload?.token) login({ token: payload.token, user: payload.user });
    } catch {
      /* payload inválido: ignora e volta para a tela de login */
    }
  }, [login]);

  useEffect(() => {
    // Backend local (proxy): login automático, sem tela de entrada.
    if (isProxy && !isAuthenticated && !isAuthenticating && !attempted.current) {
      attempted.current = true;
      login({});
    }
  }, [isProxy, isAuthenticated, isAuthenticating, login]);

  if (isAuthenticated) return <Shell />;
  if (pendingAuth) return <LoadingScreen message="Conectando…" />;
  if (isProxy) return <LoadingScreen message="Conectando ao servidor local…" />;
  if (isLocalHost && backendName === 'github') return <LocalServerHint />;
  if (backendName === 'github') return <LoginScreen />;
  return <LoadingScreen message="Conectando…" />;
}

function Shell() {
  return (
    <div className="pnl-shell">
      <Sidebar />
      <main className="pnl-main">
        <PainelRoutes />
      </main>
    </div>
  );
}

function ConfigGate() {
  const { isLoading, hasError, error } = useConfig();

  if (isLoading) return <LoadingScreen message="Carregando configuração…" />;

  if (hasError) {
    return (
      <div className="pnl-login">
        <div className="pnl-login-card">
          <h1 className="pnl-login-title">Falha ao carregar a configuração</h1>
          <p className="pnl-login-error">{String(error || 'Erro desconhecido')}</p>
          <Button variant="primary" size="lg" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // O modal de mídia do motor (<MediaLibrary />) NUNCA é montado: o mount
  // effect dele dispara `loadMedia` e, devido a uma corrida interna do motor
  // (um segundo CONFIG_REQUEST entre o render e o effect), lê o slice
  // `config` sem `backend` e quebra. Desde o M2, o seletor de imagem é um
  // modal próprio (admin-src/media-picker.jsx) que usa currentBackend
  // diretamente e só é montado quando o usuário clica em "Escolher imagem" —
  // config já estável nesse momento.
  return <AuthGate />;
}

/* ============================================================
   Raiz do Painel (dentro do DecapCmsProvider)
   ============================================================ */

export default function Painel() {
  return (
    <div className="pnl-root">
      <ConfigGate />
      <Notifications />
    </div>
  );
}
