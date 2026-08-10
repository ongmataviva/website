import { useCallback, useEffect, useRef, useState } from 'react';
import { currentBackend, useConfig } from '@laikacms/decap-cms/core';
import { Button, Spinner } from './ui';

/* ============================================================
   Seletor de mídia próprio (estética Ocelot).

   Usa o backend do motor headless diretamente (currentBackend),
   sem depender do estado global de mediaLibrary do fork:
   - listar:  backend.getMedia()
   - enviar:  backend.persistMedia(config, asset)  → escreve em
              media_folder (public/images no proxy; commit no github)
   - excluir: backend.deleteMedia(config, path)

   O campo recebe o caminho público (ex.: /images/foo.jpg) via
   onSelect — upload real, nunca caminho digitado à mão.
   ============================================================ */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

/* Superfície mínima que os backends usam (path + toBase64) —
   equivalente funcional do AssetProxy do motor (createAssetProxy). */
function makeAsset(file, path, field) {
  return {
    path,
    field,
    fileObj: file,
    toString: () => '',
    toBase64: () => fileToBase64(file),
  };
}

function sanitizeFileName(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const slug = base
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (slug || 'imagem') + ext;
}

function joinPath(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

/* Evita colisão: nome.png → nome-1.png, nome-2.png… */
function uniqueName(existing, wanted) {
  if (!existing.includes(wanted)) return wanted;
  const dot = wanted.lastIndexOf('.');
  const base = dot >= 0 ? wanted.slice(0, dot) : wanted;
  const ext = dot >= 0 ? wanted.slice(dot) : '';
  for (let i = 1; ; i++) {
    const next = `${base}-${i}${ext}`;
    if (!existing.includes(next)) return next;
  }
}

export default function MediaPicker({ field, onSelect, onClose }) {
  const { config } = useConfig();
  const [files, setFiles] = useState(null); // null = carregando
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);
  const deletingRef = useRef(false);

  const mediaFolder = (config?.media_folder || 'public/images').replace(/\/+$/, '');
  const publicFolder = (config?.public_folder || '/images').replace(/\/+$/, '');

  /* Caminho público (valor gravado no campo) a partir de um arquivo.
     Mantém subpastas: public/images/2024/a.jpg → /images/2024/a.jpg */
  const publicPathFor = useCallback(
    (file) => {
      const rel = file.path.startsWith(mediaFolder)
        ? file.path.slice(mediaFolder.length).replace(/^\/+/, '')
        : file.path.split('/').pop();
      return joinPath(publicFolder, rel);
    },
    [mediaFolder, publicFolder],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const backend = currentBackend(config);
      const list = (await backend.getMedia()) || [];
      setFiles(list);
    } catch (e) {
      console.error('Erro ao listar mídias:', e);
      setError('Não foi possível carregar a biblioteca de imagens.');
    }
  }, [config]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleUpload = async (file) => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const existing = new Set((files || []).map((f) => f.path));
      const fileName = uniqueName([...existing], joinPath(mediaFolder, sanitizeFileName(file.name)));
      const backend = currentBackend(config);
      await backend.persistMedia(config, makeAsset(file, fileName, field));
      await load();
      onSelect(joinPath(publicFolder, fileName.split('/').pop()));
    } catch (e) {
      console.error('Erro ao enviar imagem:', e);
      setError('Falha ao enviar a imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!file || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setError(null);
    try {
      const backend = currentBackend(config);
      await backend.deleteMedia(config, file.path);
      await load();
      setSelected(null);
    } catch (e) {
      console.error('Erro ao excluir imagem:', e);
      setError('Falha ao excluir a imagem.');
    } finally {
      setDeleting(false);
      deletingRef.current = false;
    }
  };

  const selectedFile = selected ? files?.find((f) => f.path === selected) : null;

  return (
    <div
      className="pnl-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pnl-modal pnl-media-modal" role="dialog" aria-modal="true" aria-label="Biblioteca de imagens">
        <header className="pnl-modal-head">
          <div>
            <h3 className="pnl-modal-title">Biblioteca de imagens</h3>
            <p className="pnl-hint">Envie uma imagem nova ou escolha uma existente.</p>
          </div>
          <button type="button" className="pnl-modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="pnl-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handleUpload(f);
            }}
          />
          <button
            type="button"
            className="pnl-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Spinner /> Enviando…
              </>
            ) : (
              '+ Enviar nova imagem'
            )}
          </button>
        </div>

        {error ? <p className="pnl-modal-error">{error}</p> : null}

        {files === null ? (
          <div className="pnl-media-loading">
            <Spinner />
          </div>
        ) : files.length === 0 ? (
          <p className="pnl-hint pnl-media-empty">Nenhuma imagem ainda. Envie a primeira acima.</p>
        ) : (
          <div className="pnl-media-grid">
            {files.map((f) => {
              const isSel = selected === f.path;
              return (
                <button
                  type="button"
                  key={f.path}
                  className={`pnl-media-item${isSel ? ' pnl-media-item--selected' : ''}`}
                  onClick={() => setSelected(isSel ? null : f.path)}
                >
                  <img
                    className="pnl-media-thumb"
                    src={f.url || f.displayURL || ''}
                    alt={f.name}
                    loading="lazy"
                  />
                  <span className="pnl-media-name">{f.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <footer className="pnl-modal-foot">
          {selectedFile ? (
            <Button variant="danger" size="sm" onClick={() => handleDelete(selectedFile)} disabled={deleting}>
              {deleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          ) : (
            <span />
          )}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!selectedFile || uploading}
            onClick={() => onSelect(publicPathFor(selectedFile))}
          >
            Usar imagem
          </Button>
        </footer>
      </div>
    </div>
  );
}
