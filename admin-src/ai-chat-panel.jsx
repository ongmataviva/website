// Assistente IA — painel flutuante (overlay) sobre o editor de entidades.
//
// O assistente envia contexto do draft atual para o modelo e recebe
// sugestões de texto em resposta. Quando o texto gerado é útil, o usuário
// pode copiá-lo diretamente para o campo correspondente no formulário.

import { useEffect, useRef, useState } from 'react';
import { Button, Spinner } from './ui';

/* ─── Helpers para formatar contexto do draft ──────────────────── */

const PT_FIELD_LABELS = {
  titulo: 'Título', slug: 'Slug', data: 'Data', atualizada: 'Atualizada',
  categoria: 'Categoria', autor: 'Autor', tags: 'Tags', destaque: 'Destaque',
  imagem: 'Imagem', resumo: 'Resumo', body: 'Conteúdo', nome: 'Nome',
  descricao: 'Descrição', title: 'Nome', cargo: 'Cargo', login: 'Login GitHub',
  bio: 'Biografia', avatar: 'Foto',
};

function fmtLabel(name) {
  return PT_FIELD_LABELS[name] || name;
}

function buildContextPayload(formDraft, collectionName) {
  const data = typeof formDraft === 'object' && formDraft !== null ? formDraft : {};
  const payload = { collection: collectionName };
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'string') payload[key] = val.slice(0, 2000);
      else if (Array.isArray(val)) payload[key] = val.map(s => String(s).slice(0, 500));
      else payload[key] = val;
    }
  }
  return payload;
}

/* ─── Componente principal ─────────────────────────────────────── */

export function AiChatPanel({ isOpen, onClose, collectionName, formData }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focar input quando abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset quando fecha
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputText('');
      setStreaming(false);
    }
  }, [isOpen]);

  const sendToServer = async (userMessage) => {
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInputText('');
    setStreaming(true);

    try {
      const response = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          document: buildContextPayload(formData, collectionName),
          collectionName,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: 'system', content: `[Erro ${response.status}] ${err.error || 'Falha na chamada à IA.'}` },
        ]);
        setStreaming(false);
        return;
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content || '' },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pnl-ai-overlay">
      {/* Header */}
      <div className="pnl-ai-header">
        <span className="pnl-ai-title">✦ Assistente IA</span>
        <button className="pnl-ai-close-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      {/* Mensagens */}
      <div className="pnl-ai-messages">
        {messages.length === 0 && (
          <div className="pnl-ai-welcome">
            <p>Olá! Sou o assistente IA do Mata Viva.</p>
            <p>Posso ajudar com textos jornalísticos, revisar conteúdo ou responder perguntas sobre o sistema.</p>
            <div className="pnl-ai-suggestions">
              <button onClick={() => sendToServer('Sugira um resumo jornalístico para esta notícia.')}>
                Sugira um resumo
              </button>
              <button onClick={() => sendToServer('Reveja o corpo e sugira melhorias no texto.')}>
                Revisar corpo
              </button>
              <button onClick={() => sendToServer('Quais categorias já existem?')}>
                Ver categorias existentes
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`pnl-ai-msg pnl-ai-msg--${msg.role}`}>
            <div className="pnl-ai-msg-body">{msg.content}</div>
          </div>
        ))}

        {streaming && <Spinner />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        className="pnl-ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (inputText.trim() && !streaming) {
            sendToServer(inputText.trim());
          }
        }}
      >
        <input
          ref={inputRef}
          className="pnl-ai-input-text"
          type="text"
          placeholder="Descreva o que deseja..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={streaming}
          autoComplete="off"
        />
        <button
          type="submit"
          className="pnl-ai-send-btn"
          disabled={!inputText.trim() || streaming}
          aria-label="Enviar"
        >
          &#9654;
        </button>
      </form>
    </div>
  );
}
