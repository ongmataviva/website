// Patch @laikacms/decap-cms GitHub backend (node_modules) para UTF-8 correto.
//
// 1) LEITURA (fetchBlobContent): atob() decoda base64 como Latin-1, corrompendo
//    conteúdo UTF-8 (ç → Ã§). Substituído por TextDecoder('utf-8').
// 2) GRAVAÇÃO (persistFiles/toBase64): btoa(file.raw) converte cada code unit
//    UTF-16 direto em byte — ou seja, grava Latin-1 (é=0xE9 em vez de C3 A9).
//    O site lê o arquivo como UTF-8 e exibe '�' em todo acento salvo pelo
//    admin via backend GitHub. Agora o texto é UTF-8 codificado com
//    TextEncoder antes do btoa.
//
// Roda no `postinstall` para manter o fix persistente entre instalações.

import { readFileSync, writeFileSync } from 'fs';

const file = 'node_modules/@laikacms/decap-cms/dist/backends/github/API.js';
let src = readFileSync(file, 'utf-8');

// ── Patch 1: leitura (já existente) ────────────────────────────────────────
const readOld = `if (parseText) {
            // treat content as a utf-8 string
            const content = atob(result.content);
            return content;
        }
        else {
            // treat content as binary and convert to blob
            const content = atob(result.content);
            const byteArray = new Uint8Array(content.length);
            for (let i = 0; i < content.length; i++) {
                byteArray[i] = content.charCodeAt(i);
            }
            const blob = new Blob([byteArray]);
            return blob;
        }`;

const readNew = `if (parseText) {
            // decode base64 → bytes → UTF-8 string (atob alone decodes as Latin-1,
            // which corrupts multi-byte UTF-8: ç (C3 A7) → Ã§)
            const decoded = atob(result.content);
            const byteArray = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                byteArray[i] = decoded.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(byteArray);
        }
        else {
            // treat content as binary and convert to blob
            const decoded = atob(result.content);
            const byteArray = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                byteArray[i] = decoded.charCodeAt(i);
            }
            const blob = new Blob([byteArray]);
            return blob;
        }`;

// ── Patch 2: gravação — persistFiles usa btoa(file.raw) direto ─────────────
const putInlineOld = `toBase64: () => Promise.resolve(btoa(file.raw))`;
const putInlineNew = `toBase64: () => this.toBase64(file.raw)`;

// ── Patch 3: gravação — método toBase64 vira UTF-8 seguro ──────────────────
const putMethodOld = `toBase64(str) {
        return Promise.resolve(btoa(str));
    }`;
const putMethodNew = `toBase64(str) {
        // UTF-8 seguro: TextEncoder → bytes → btoa (btoa puro gravaria Latin-1)
        const bytes = new TextEncoder().encode(str);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return Promise.resolve(btoa(bin));
    }`;

const patches = [
  { old: readOld, new: readNew, label: 'leitura (fetchBlobContent)' },
  { old: putInlineOld, new: putInlineNew, label: 'gravação (persistFiles inline)' },
  { old: putMethodOld, new: putMethodNew, label: 'gravação (toBase64 método)' },
];

let applied = 0;
for (const p of patches) {
  if (src.includes(p.new)) {
    console.log('PATCH ALREADY APPLIED:', p.label);
    continue;
  }
  if (!src.includes(p.old)) {
    console.error('PATCH FAILED (old text not found):', p.label, 'in', file);
    process.exit(1);
  }
  src = src.replace(p.old, p.new);
  applied += 1;
  console.log('PATCHED:', p.label);
}

if (applied > 0) {
  writeFileSync(file, src, 'utf-8');
}
console.log(applied === 0 ? 'PATCH ALREADY APPLIED (all): ' + file : 'DONE: ' + file);
