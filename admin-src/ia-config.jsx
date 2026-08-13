// Página de configuração do Assistente IA — /configuracoes/ia
//
// Permite definir Backend URI (OpenAI-compatible), Model ID e MaxTokens.
// A API Key é enviada separadamente ao servidor para armazenamento seguro.
//
// Configuração salva em data/ia_settings.json no repo (HMAC-signed),
// seguindo o mesmo padrão de segurança dos edit_logins.
import { useEffect, useState } from 'react';
import { Button, Card, PageHeader, LoadingScreen } from './ui';
import { usePermissions } from './permissions';

export function IaConfigPage() {
  const perms = usePermissions();

  const [backendUri, setBackendUri] = useState('');
  const [modelId, setModelId] = useState('openai/gpt-4o');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState(''); // '' | 'saving' | 'saved' | error
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    fetch('/api/ia/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.backendUri) setBackendUri(d.backendUri);
        if (d?.modelId) setModelId(d.modelId);
        if (d?.maxTokens) setMaxTokens(d.maxTokens);
      })
      .catch(() => {});
  }, []);

  if (!perms.isAdmin) {
    return (
      <div className="pnl-center" style={{ minHeight: '60vh' }}>
        <Card>
          <h1>Sem permissão</h1>
          <p>Apenas administradores podem configurar o assistente IA.</p>
        </Card>
      </div>
    );
  }

  const save = async () => {
    setStatus('saving');
    try {
      const res = await fetch('/api/ia/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backendUri, modelId, maxTokens, apiKey: apiKey || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus(data?.error === 'unauthorized'
          ? 'Sua sessão não autoriza alterações. Saia e entre novamente.'
          : `Falha ao salvar (${res.status}).`);
        return;
      }
      setStatus('saved');
      setApiKey(''); // clear after successful save
    } catch {
      setStatus('Falha de rede ao salvar.');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const res = await fetch(`${backendUri || 'https://openrouter.ai/api/v1'}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey || ''}` },
        body: JSON.stringify({
          model: modelId || 'openai/gpt-4o',
          messages: [{ role: 'user', content: 'Oi' }],
          max_tokens: 5,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.choices?.[0]) {
        setTestResult('Conectado! Resposta recebida com sucesso.');
      } else {
        setTestResult(`Erro: ${data?.error?.message || `HTTP ${res.status}`}`);
      }
    } catch (e) {
      setTestResult(`Erro de conexão: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="pnl-ia-config">
      <PageHeader
        title="Configurações da IA"
        subtitle="Configure o assistente IA que aparece nos editores de conteúdo."
      />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="pnl-ia-config-fields">
            <div className="pnl-field">
              <label className="pnl-label" htmlFor="ia-backend-uri">
                Backend URI <span className="pnl-req">*</span>
              </label>
              <input
                id="ia-backend-uri"
                className="pnl-input"
                type="text"
                placeholder="https://openrouter.ai/api/v1"
                value={backendUri}
                onChange={(e) => setBackendUri(e.target.value)}
              />
              <span className="pnl-hint">
                Endpoint OpenAI-compatible para chamadas de chat.
              </span>
            </div>

            <div className="pnl-field">
              <label className="pnl-label" htmlFor="ia-model-id">
                Model ID <span className="pnl-req">*</span>
              </label>
              <input
                id="ia-model-id"
                className="pnl-input"
                type="text"
                placeholder="anthropic/claude-sonnet-4"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
              <span className="pnl-hint">
                Nome do modelo compatível com OpenAI protocol. Ex: openai/gpt-4o, anthropic/claude-sonnet-4
              </span>
            </div>

            <div className="pnl-field">
              <label className="pnl-label" htmlFor="ia-max-tokens">
                Max Tokens <span className="pnl-req">*</span>
              </label>
              <input
                id="ia-max-tokens"
                className="pnl-input"
                type="number"
                min={1}
                max={128000}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value) || 4096)}
              />
              <span className="pnl-hint">Limite máximo de tokens por resposta.</span>
            </div>

            <div className="pnl-field">
              <label className="pnl-label" htmlFor="ia-api-key">
                API Key
              </label>
              <input
                id="ia-api-key"
                className="pnl-input"
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <span className="pnl-hint">Chave da API do provedor. Deixar vazio para manter a atual.</span>
            </div>
          </div>

          <div className="pnl-ia-actions">
            <Button variant="primary" type="submit" disabled={status === 'saving'}>
              {status === 'saving' ? 'Salvando…' : 'Salvar configuração'}
            </Button>
            <Button variant="ghost" type="button" disabled={testing || status === 'saving'} onClick={testConnection}>
              {testing ? 'Testando…' : 'Testar Conexão'}
            </Button>
            {status === 'saved' ? <span className="pnl-badge pnl-badge--accent">Salvo</span> : null}
            {status !== '' && status !== 'saving' && status !== 'saved' ? (
              <span className="pnl-ia-error">{status}</span>
            ) : null}
          </div>

          {testResult && (
            <div className={testResult.startsWith('Erro') ? 'pnl-ia-test-error' : 'pnl-ia-test-ok'}>
              {testResult}
            </div>
          )}
        </form>
      </Card>
    </section>
  );
}
