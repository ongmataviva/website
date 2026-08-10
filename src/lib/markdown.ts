// Conversor markdown → HTML (subset usado no conteúdo do portal).
// O backend pré-renderiza markdown em HTML (contrato §3: props *Html).
// Suporta: parágrafos, h2–h4, listas ul/ol, blockquote, hr, fenced code,
// **negrito**, *itálico*, `código`, [links](url). Suficiente para o
// conteúdo editorial do Mata Viva, sem dependências externas.

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(md: string): string {
  let out = escapeHtml(md);
  // Código inline primeiro (protege o conteúdo interno)
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // **negrito**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, t) => `<strong>${t}</strong>`);
  // *itálico* (sem tocar em ** já consumido)
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_m, before, t) => `${before}<em>${t}</em>`);
  // [texto](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => `<a href="${url}">${text}</a>`);
  return out;
}

export function mdToHtml(md: string): string {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  const isBlank = (l: string) => l.trim() === '';
  const isBlockStart = (l: string) =>
    /^(#{1,4})\s+/.test(l) ||
    /^\s*[-*+]\s+/.test(l) ||
    /^\s*\d+\.\s+/.test(l) ||
    /^>\s?/.test(l) ||
    /^```/.test(l) ||
    /^\s*([-*_])\s*(\1\s*){2,}$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    if (/^```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // pula a linha de fechamento
      html.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(
          buf.join('\n'),
        )}</code></pre>`,
      );
      continue;
    }

    // Heading h2–h4
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Regra horizontal
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      html.push('<hr>');
      i++;
      continue;
    }

    // Blockquote (linhas consecutivas)
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`);
      continue;
    }

    // Lista não ordenada (linhas consecutivas)
    if (/^\s*[-*+]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ul>${buf.join('')}</ul>`);
      continue;
    }

    // Lista ordenada (linhas consecutivas)
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ol>${buf.join('')}</ol>`);
      continue;
    }

    // Parágrafo (acumula até quebrar bloco)
    if (!isBlank(line)) {
      const buf: string[] = [line];
      i++;
      while (i < lines.length && !isBlank(lines[i]) && !isBlockStart(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      html.push(`<p>${inline(buf.join(' '))}</p>`);
      continue;
    }

    i++;
  }

  return html.join('\n');
}
