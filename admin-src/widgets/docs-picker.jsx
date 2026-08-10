// Document picker widget — lets editors browse available docs from the
// Worker API and pick one or more to reference in markdown content.
//
// Value shape: string | array of strings (document URLs like "/docs-proxy/filename.pdf")
// Stored as frontmatter key(s); links work both in preview and on the live site.
//
// Configuration: use the `apiBase` field in the CMS config collection field definition.
// Example in config.yml:
//   - label: "Documentos vinculados"
//     name: "documentos"
//     widget: "docs-picker"
//     apiBase: "https://mataviva-docs.your-subdomain.workers.dev"

import { useState, useEffect } from 'react';

const DEFAULT_API = 'http://localhost:8787'; // Local worker-docs dev server

function getFileIcon(contentType) {
  if (!contentType) return '\uD83D\uDCC4';
  if (contentType.includes('pdf')) return '\uD83D\uDCDD';
  if (contentType.includes('image')) return '\uD83D\uDCF7';
  if (contentType.includes('sheet') || contentType.includes('excel') || contentType.includes('csv')) return '\uD83D\uDCCA';
  if (contentType.includes('word') || contentType.includes('document') || contentType.includes('text')) return '\uD83D\uDCC4';
  if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('tar')) return '\uD83D\uDCE6';
  return '\uD83D\uDCC4';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function DocsPickerControl({ value, onChange, meta }) {
  const apiBase = meta?.apiBase || DEFAULT_API;
  const listUrl = `${apiBase}/api/docs/list`;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const isMultiple = Array.isArray(value);
  const selected = isMultiple ? value : (value ? [value] : []);

  useEffect(() => {
    fetch(listUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load documents');
        return res.json();
      })
      .then((docs) => setDocuments(docs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [listUrl]);

  function toggleDoc(docUrl) {
    if (isMultiple) {
      const next = selected.includes(docUrl)
        ? selected.filter((u) => u !== docUrl)
        : [...selected, docUrl];
      onChange(next.length > 0 ? next : []);
    } else {
      onChange(selected[0] === docUrl ? '' : docUrl);
    }
  }

  const filtered = filter
    ? documents.filter((d) =>
        d.key.toLowerCase().includes(filter.toLowerCase()) ||
        (d.contentType && d.contentType.toLowerCase().includes(filter.toLowerCase()))
      )
    : documents;

  const sorted = filtered.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  if (error) {
    return (
      <div style={{ padding: '12px', background: '#fff0f0', color: 'red', borderRadius: '4px', fontSize: '14px' }}>
        Erro: {error}
        <br />
        <span style={{ fontSize: '12px', color: '#999' }}>
          Verifique a configuração de apiBase no config.yml
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter input */}
      <input
        type="text"
        placeholder="Filtrar documentos..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '14px',
          marginBottom: '12px',
          boxSizing: 'border-box',
        }}
      />

      {/* Documents list */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Carregando...</div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          Nenhum documento encontrado.{!loading && '. Envie documentos em:'}{' '}
          <a href={`${apiBase}/admin`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a7f37' }}>
            Gerenciador de Documentos ({new URL(apiBase).hostname})
          </a>
        </div>
      ) : (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {sorted.map((doc) => {
            const docUrl = doc.publicUrl;
            const isSelected = selected.includes(docUrl);
            const filename = doc.key.split('/').pop();

            return (
              <div
                key={docUrl}
                onClick={() => toggleDoc(docUrl)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #1a7f37' : '1px solid #eee',
                  backgroundColor: isSelected ? '#e8f5e9' : 'white',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{getFileIcon(doc.contentType)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>{filename}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {formatBytes(doc.size)} &middot; {formatDate(doc.uploaded)}
                  </div>
                </div>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{isSelected ? '\u2705' : ''}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected URLs preview */}
      {selected.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>URL selecionada(s):</div>
          {selected.map((url) => (
            <code key={url} style={{ display: 'block', fontSize: '12px', wordBreak: 'break-all' }}>
              {url}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsPickerPreview({ value }) {
  if (!value) return <em>Nenhum documento vinculado</em>;

  const docs = Array.isArray(value) ? value : [value];

  return (
    <div style={{ padding: '8px' }}>
      {docs.map((url, i) => (
        <div key={url} style={{ marginBottom: i < docs.length - 1 ? '8px' : 0 }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            {'\uD83D\uDCC4'} {url.split('/').pop()}
          </a>
        </div>
      ))}
    </div>
  );
}
