import { useState } from 'react';
import { Button } from './ui';
import MediaPicker from './media-picker';

/* ============================================================
   Campo de imagem com upload real (via MediaPicker).

   O valor gravado no frontmatter é o caminho público (ex.:
   /images/foo.jpg). A pré-visualização usa o próprio valor, já
   que o upload persiste o arquivo imediatamente em media_folder.
   ============================================================ */

export default function ImageField({ value, onChange, field }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pnl-image-field">
      {value ? (
        <div className="pnl-image-preview-wrap">
          <img className="pnl-image-preview" src={value} alt="" />
        </div>
      ) : (
        <div className="pnl-image-empty">Nenhuma imagem selecionada</div>
      )}
      <div className="pnl-image-actions">
        <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
          {value ? 'Trocar imagem' : 'Escolher imagem'}
        </Button>
        {value ? (
          <Button variant="danger" size="sm" onClick={() => onChange(null)}>
            Remover
          </Button>
        ) : null}
      </div>

      {open ? (
        <MediaPicker
          field={field}
          onSelect={(publicPath) => {
            onChange(publicPath);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
