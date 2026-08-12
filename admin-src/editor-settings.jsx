// Página Equipe — gestão de acesso ao Painel pela própria UI.
//
// A lista (admins + editores) vive em data/editor_logins.json no repo e é
// ASSINADA com HMAC (chave EDITORS_HMAC_KEY, só no Worker). Por isso:
//   - a escrita NUNCA passa pelo backend do Decap (que usaria o token do
//     GitHub App — igual para todos) — passa pelo endpoint
//     POST /api/editor-logins, que exige o cookie HttpOnly de admin;
//   - um editor que tente adulterar o arquivo pela API invalida a
//     assinatura e o Worker ignora a lista (fail-closed).
// A página só é visível para quem tem canEditList (bootstrap).
import { useEffect, useState } from 'react';
import { useConfig } from '@laikacms/decap-cms/core';
import { usePermissions } from './permissions';
import { Badge, Button, Forbidden, LoadingScreen, PageHeader } from './ui';

const RAW_LIST =
  'https://raw.githubusercontent.com/ongmataviva/website/content/data/editor_logins.json';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const norm = (s) => String(s || '').trim().toLowerCase();

function EmailList({ title, hint, emails, onChange, disabled }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const email = norm(draft);
    if (!EMAIL_RE.test(email) || emails.includes(email)) return;
    onChange([...emails, email]);
    setDraft('');
  };

  return (
    <div className="pnl-equipe-list">
      <div className="pnl-equipe-list-head">
        <h2 className="pnl-equipe-list-title">{title}</h2>
        <p className="pnl-equipe-list-hint">{hint}</p>
      </div>
      <ul className="pnl-equipe-emails">
        {emails.length === 0 ? (
          <li className="pnl-equipe-empty">Nenhum email ainda.</li>
        ) : (
          emails.map((email) => (
            <li key={email} className="pnl-equipe-row">
              <span className="pnl-equipe-email">{email}</span>
              <Button
                variant="danger"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(emails.filter((e) => e !== email))}
              >
                Remover
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="pnl-equipe-add">
        <input
          className="pnl-equipe-input"
          type="email"
          placeholder="email@exemplo.com"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="default" size="sm" disabled={disabled} onClick={add}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}

export function EditorSettings() {
  const perms = usePermissions();
  const { backend } = useConfig();
  const isProxy = backend?.name === 'proxy';

  const [admins, setAdmins] = useState(null); // null = carregando
  const [editores, setEditores] = useState(null);
  const [status, setStatus] = useState(''); // '' | 'saving' | 'saved' | mensagem de erro

  useEffect(() => {
    let alive = true;
    fetch(RAW_LIST)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setAdmins(Array.isArray(d?.admins) ? d.admins.map(norm) : []);
        setEditores(Array.isArray(d?.editores) ? d.editores.map(norm) : []);
      })
      .catch(() => {
        if (!alive) return;
        setAdmins([]);
        setEditores([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!perms.canEditList) {
    return <Forbidden message="Somente administradores gerenciam a equipe." />;
  }
  if (admins === null || editores === null) {
    return <LoadingScreen message="Carregando equipe…" />;
  }

  const save = async () => {
    setStatus('saving');
    try {
      const res = await fetch('/api/editor-logins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admins, editores }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(
          data?.error === 'unauthorized'
            ? 'Sua sessão não autoriza alterar a equipe. Saia e entre novamente.'
            : data?.error === 'invalid-emails'
              ? 'Há emails inválidos na lista.'
              : `Falha ao salvar (${res.status}).`,
        );
        return;
      }
      setStatus('saved');
    } catch {
      setStatus('Falha de rede ao salvar.');
    }
  };

  return (
    <section className="pnl-equipe">
      <PageHeader title="Equipe" subtitle="Quem acessa o Painel e o que cada um pode editar." />

      {isProxy ? (
        <p className="pnl-equipe-note">
          Modo local (proxy): a lista não é editável aqui — abra a versão publicada do Painel
          para gerenciar a equipe.
        </p>
      ) : null}

      <EmailList
        title="Administradores"
        hint="Acesso total: editam todas as coleções e gerenciam a equipe."
        emails={admins}
        onChange={setAdmins}
        disabled={isProxy || status === 'saving'}
      />
      <EmailList
        title="Editores"
        hint="Entram no Painel e criam/editem apenas as próprias notícias."
        emails={editores}
        onChange={setEditores}
        disabled={isProxy || status === 'saving'}
      />

      <div className="pnl-equipe-actions">
        <Button variant="primary" onClick={save} disabled={isProxy || status === 'saving'}>
          {status === 'saving' ? 'Salvando…' : 'Salvar lista'}
        </Button>
        {status === 'saved' ? <Badge variant="accent">Salvo</Badge> : null}
        {status !== '' && status !== 'saving' && status !== 'saved' ? (
          <span className="pnl-equipe-error">{status}</span>
        ) : null}
      </div>
    </section>
  );
}
