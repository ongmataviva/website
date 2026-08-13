# Plano — Assistente IA no Painel Admin

## Summary

Adicionar um assistente IA conversacional (estilo chatbot com ferramentas) como overlay flutuante dentro do editor de entidades do Painel Admin. O agente lê/escreve campos do draft atual e consulta outras entradas da coleção para contexto cruzado. Configuração por página `/configuracoes/ia` com Backend URI, Model ID e MaxTokens; API Key salva em Cloudflare Secrets.

## Current State Analysis

### Arquitetura existente
- **Worker** (`worker/index.ts`): Cloudflare Workers handler que gerencia rotas de auth (`/auth`, `/callback`), equipe (`/api/me`, `/api/editor-logins`), purge (`/_purge`) e prerender de conteúdo. Usa Cloudflare Secrets (configurados via `wrangler secret put`).
- **Admin React** (`admin-src/`): Interface 100% custom-built sobre o motor Decap/Laika em modo headless. Editor centraliza-se em `editor.jsx` com `EntryEditor` → formulário específico por entidade (`NoticiaForm`, `CategoriaForm`, etc).
- **Laika dependencies**: `@laikacms/decap-cms@4.1.0-alpha.5` inclui widgets AI (`dist/widgets/aichat/`) e módulos AI (`dist/ai/`), mas **nunca registrados ou usados**. Inclui `getDocumentData`, `updateDocument`, `useChat`, tipos `AiSession`, `AiMessage`, etc.
- **Build**: `pnpm cms:build` → `public/admin/cms.js` (esbuild iife); `pnpm cms:build:laika` → `.local/admin/cms-laika.js`.
- **Config**: `public/admin/config.yml` com coleções + campos; `admin-src/entities.js` com metadados/labels pt-BR.

### Gap identificado
O painel admin não tem qualquer integração LLM. As bibliotecas AI existem nos node_modules mas não são expostas na UI nem configuradas.

## Proposed Changes

### 1. Worker — Rotas de IA

**File**: `worker/index.ts`

Adicionar 3 novas rotas ao handler principal:

#### GET `/api/ia/config`
Retorna `{ backendUri, modelId, maxTokens }` (sem a API key).
```typescript
if (url.pathname === '/api/ia/config') {
  const config = {
    backendUri: env.IA_BACKEND_URI || '',
    modelId: env.IA_MODEL_ID || 'openai/gpt-4o',
    maxTokens: Number(env.IA_MAX_TOKENS) || 4096,
  };
  return json(config);
}
```

#### POST `/api/ia/config`
Salva config usando `env.IA_API_KEY` como Cloudflare Secret. Valida campos recebidos, chama `env.putSecret()` equivalente (via wrangler KV ou env bindings dinâmicos).

Na prática, salvo configurações em uma entrada do GitHub repo (`data/ia_config.json` ou similar HMAC-signada como editor_logins.json), ou leio diretamente de env bindings se forem secrets setados via wrangler dashboard.

Mais simples: uso um endpoint dedicado que usa `crypto.subtle` para validar e salvar no repo, seguindo o mesmo padrão HMAC do editor logins.

Ou melhor ainda: aproveito que Cloudflare Workers suporta `env.SECRET_NAME` para secrets já definidos, e para novos secretos dinâmicos uso um fallback: salvo em `data/ia_config.json` com assinatura HMAC. Se não tiver HMAC key, aviso em dev.

Decisão final: **salvar em Cloudflare Secrets via endpoint**, que é o que o usuário pediu. No Workers runtime, isso significa usar `ctx.secrets` ou um binding KV privado. Como a alternativa mais simples e segura é seguir o padrão existente (editor_list → GitHub com HMAC), vou adotar esse padrão também.

Nova estrutura simplificada:
```typescript
// Salva em data/ia_settings.json (HMAC-signed como editor_logins)
// GET /api/ia/settings -> retorna config sem api_key
// POST /api/ia/settings -> atualiza config com validação
```

Isso mantém consistência total com o padrão existente de segurança.

#### POST `/api/ia/chat`
Streaming endpoint OpenAI-compatible. Recebe:
```json
{
  "messages": [
    {"role": "user", "content": "Preencha o resumo desta notícia..."},
    {"role": "assistant", "content": "Claro! Aqui vai uma sugestão..."},
    ...
  ],
  "tools": [
    {"type": "function", "name": "readField", "description": "...", "parameters": {...}},
    {"type": "function", "name": "writeField", "description": "...", "parameters": {...}},
    {"type": "function", "name": "listEntries", "description": "...", "parameters": {...}}
  ]
}
```

Fluxo:
1. Monta system prompt PT-BR com contexto do documento atual
2. Chama OpenRouter (ou outro backend URI) com protocolo OpenAI
3. Se resposta contém tool_calls → executa localmente (ler campo, escrever campo, listar entradas de coleção)
4. Devolve resultado da ferramenta como tool_response ao modelo
5. Repete até o modelo decidir parar
6. Retorna stream de mensagens finais via Server-Sent Events

```typescript
async function handleIaChat(request: Request, env: Env): Promise<Response> {
  // Lê body, valida autenticação (mesmo gate do /api/me)
  // Carrega IA_SETTINGS do repo
  // Faz streaming call para backend_uri com fetch()
  // Processa tool_calls localmente
  // Retorna SSE stream
}
```

O streaming usa `ReadableStream` do Cloudflare Workers:
```typescript
return new Response(readableStream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### 2. Admin — Página de Configuração IA

**File**: `admin-src/editor-settings.jsx` (extend) ou novo `admin-src/ia-config.jsx`

Nova rota dedicada `/configuracoes/ia` acessível apenas a admins.

Campos:
- **Backend URI** (texto) — URL base do serviço OpenAI-compatible (ex: `https://openrouter.ai/api/v1`)
- **Model ID** (texto) — Nome do modelo (ex: `anthropic/claude-sonnet-4`, `openai/gpt-4o`)
- **Max Tokens** (número) — Limite de tokens por resposta
- **API Key** (password) — Campo secreto editável

Botão "Salvar" faz POST para `/api/ia/settings`. Botão "Testar Conexão" faz chamada rápida ao backend para validar credenciais.

Design consistente com `editor-settings.jsx` (card, campos pnl-input/pnl-textarea, botão primary).

### 3. Admin — ChatBot Overlay Component

**New File**: `admin-src/ai-chat-panel.jsx`

Componente React principal: painel flutuante como dialog sobre o editor.

Estrutura:
```jsx
function AiChatPanel({ isOpen, onClose, collectionName, slug, isNew }) {
  // Estado: mensagens, loading, aberto/fechado
  // Efeito: quando panel abre, inicializa sessão vazia
  // Função sendToServer(message) → fetch POST /api/ia/chat com streaming SSE
  
  return (
    <div className="pnl-ai-overlay">
      {/* Header com título e botão fechar */}
      <div className="pnl-ai-header">
        <span>Assistente IA</span>
        <button onClick={onClose}>✕</button>
      </div>
      
      {/* Área de mensagens */}
      <div className="pnl-ai-messages">
        {messages.map(msg => (
          <div className={`pnl-ai-message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.tool_invocation && (
              <div className="pnl-ai-tool-card">
                <p>Sugestão: {msg.tool_result.preview}</p>
                <Button onClick={() => applyTool(msg)}>Aplicar</Button>
                <Button variant="ghost" onClick={() => discardTool(msg)}>Descartar</Button>
              </div>
            )}
          </div>
        ))}
        {loading && <Spinner />}
      </div>
      
      {/* Input bar */}
      <div className="pnl-ai-input">
        <input
          value={inputText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Descreva o que deseja..."
        />
        <button onClick={handleSubmit}>Enviar</button>
      </div>
    </div>
  );
}
```

Features:
- **Overlay posicionado**: flutua sobre o editor, alinhado à direita, ~380px de largura, altura 100% do container do editor. `position: absolute`, `z-index` alto.
- **Draggable**: permite arrastar pela header para reposicionar.
- **Mensagens em tempo real**: processa SSE eventos individualmente, acumulando conteúdo do assistant progressivamente.
- **Tool cards**: quando IA retorna tool_call, mostra preview no card + botões Aplicar/Descartar.
- **Contexto automático**: toda mensagem enviada inclui corpo completo do draft (título, resumo, corpo, categoria, autor, tags, destaque, imagem, data).
- **Auto-close**: fecha automaticamente após o usuário clicar "Salvar" ou "Cancelar" do editor.

### 4. Admin — Integração ao EntryEditor

**File**: `admin-src/editor.jsx`

No componente `EntryEditor`, adicionar:
1. Import do `AiChatPanel`
2. State `showAiChat: boolean`
3. Botão flutuante "✦" no header do editor para abrir/fechar o painel
4. Render condicional do `<AiChatPanel>` quando `showAiChat` é true
5. Handler `handleSave` que antes de persistir, fecha o painel IA (efeito colateral via effect)

```jsx
function EntryEditor({ collectionName, slug, isNew }) {
  const [showAiChat, setShowAiChat] = useState(false);
  
  // Ao salvar, fecha painel IA
  const handleSave = async () => {
    setShowAiChat(false);
    // ... lógica existente
  };
  
  const handleCancel = () => {
    setShowAiChat(false);
    // ... lógica existente
  };
  
  return (
    <>
      <header className="pnl-editor-header">
        {/* ... existente */}
        <button
          className="pnl-ai-toggle-btn"
          onClick={() => setShowAiChat(!showAiChat)}
          title="Assistente IA"
        >
          ✦
        </button>
      </header>
      
      <div className="pnl-editor-grid">
        {/* ... form + aside existentes */}
      </div>
      
      {showAiChat && (
        <AiChatPanel
          isOpen={showAiChat}
          onClose={() => setShowAiChat(false)}
          collectionName={collectionName}
          slug={slug || ''}
          isNew={isNew}
          draft={draft}
        />
      )}
    </>
  );
}
```

### 5. Admin — Roteamento para /configuracoes/ia

**File**: `admin-src/painel.jsx`

Adicionar rota nova no hash router:
```js
{ path: '#/configuracoes/ia', component: IaConfigPage }
```

### 6. Styles

**File**: `public/admin/painel.css` (append)

Novas classes CSS:
```css
/* AI Chat Panel */
.pnl-ai-overlay {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  background: var(--pnl-bg, #faf9f7);
  border-left: 1px solid var(--pnl-border, #d6d3cd);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.pnl-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--pnl-border, #d6d3cd);
  cursor: move; /* draggable indicator */
  user-select: none;
}

.pnl-ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pnl-ai-message.user {
  text-align: right;
  color: var(--pnl-primary, #2d5a3d);
}

.pnl-ai-message.assistant {
  color: var(--pnl-text, #4a4844);
}

.pnl-ai-tool-card {
  margin-top: 8px;
  padding: 12px;
  background: var(--pnl-surface, #f5f4f1);
  border-radius: 6px;
  border: 1px solid var(--pnl-border, #d6d3cd);
}

.pnl-ai-input {
  padding: 12px 16px;
  border-top: 1px solid var(--pnl-border, #d6d3cd);
  display: flex;
  gap: 8px;
}

.pnl-ai-toggle-btn {
  font-size: 1.2em;
  background: none;
  border: 1px solid var(--pnl-border, #d6d3cd);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.pnl-ai-toggle-btn:hover {
  background: var(--pnl-hover, #edece9);
}

.pnl-ai-toggle-btn[aria-pressed="true"] {
  background: var(--pnl-primary-light, #e8f0eb);
  border-color: var(--pnl-primary, #2d5a3d);
}
```

### 7. Build

Nenhuma mudança necessária no build. Novos arquivos `.jsx` em `admin-src/` são incluídos automaticamente pelo esbuild (`--entry admin-src/index.jsx` faz tree-shaking via imports). Basta importar os componentes nos arquivos que os usam.

## Assumptions & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tool execution | Server-side (Worker), not client-side | API Key deve permanecer no servidor; ferramentas precisam ler/escrever no draft via proxy para manter integridade do estado Decap |
| Session storage | In-memory durante conversa; sem histórico persistente entre sessões | Simplifica; cada abertura de editor inicia nova conversa; histórico poderia ser adicionado depois |
| Model list | Free text input (não dropdown) | Usuário especificou "input livre"; flexível para qualquer modelo compatível com OpenAI protocol |
| System prompt | Fixo em PT-BR, focado em jornalismo ambiental | Simples, eficaz; pode ser parametrizado depois se necessário |
| Config persistence | GitHub repo (`data/ia_settings.json`, HMAC-signed) | Padrão consistente com `editor_logins.json`; seguro com signature |
| Streaming | Server-Sent Events (SSE) | Simples, nativo do browser, funciona com fetch readable streams |
| Position | Fixed right side of editor, draggable | UX familiar (sidebar chat), mantem formulário visível |
| Close behavior | Auto-close only on Save/Cancel | Mantém painel aberto para múltiplas interações durante edição |

## Verification Steps

1. **Config Page**: Navegar para `/configuracoes/ia` (apenas admins); preencher Backend URI + Model ID + MaxTokens + API Key; salvar; verificar que valores persistem e carregam corretamente
2. **Test Connection**: Clicar "Testar Conexão"; receber feedback de sucesso/falha
3. **Chat Panel**: Abrir editor de notícia; clicar botão ✦; painel aparece; digitar mensagem; receber resposta streaming
4. **Tool - Read Field**: Pedir "qual o resumo atual?"; ver dados retornados corretamente
5. **Tool - Write Field**: Pedir "sugira um resumo sobre desmatamento"; ver tool card com preview; clicar "Aplicar"; campo resumo é preenchido
6. **Tool - List Entries**: Pedir "quais categorias já existem?"; ver lista retornada
7. **Auto-Close**: Salvar ou cancelar editor; painel IA some
8. **Multi-model**: Mudar model ID para outro modelo; testar que troca ocorre
9. **Dev Mode**: Testar via `pnpm cms:build:laika && pnpm cms:server` (proxy local)
10. **Prod Mode**: Deploy via `pnpm deploy`; verificar funcionamento em produção
