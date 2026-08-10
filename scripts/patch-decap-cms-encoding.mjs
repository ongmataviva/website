// Patch @laikacms/decap-cms GitHub backend: atob() decodes base64 as Latin-1,
// which corrupts UTF-8 content (ç → Ã§). Replace with TextDecoder('utf-8').
// Runs after `pnpm install` to keep the fix persistent across installs.

import { readFileSync, writeFileSync } from 'fs';

const file = 'node_modules/@laikacms/decap-cms/dist/backends/github/API.js';
let src = readFileSync(file, 'utf-8');

const oldText = `if (parseText) {
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

const newText = `if (parseText) {
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

if (src.includes(newText)) {
  // Já patcheado (instalação anterior) — idempotente, não faz nada.
  console.log('PATCH ALREADY APPLIED:', file);
  process.exit(0);
}

if (!src.includes(oldText)) {
  console.error('PATCH FAILED: old text not found in', file);
  process.exit(1);
}

src = src.replace(oldText, newText);
writeFileSync(file, src, 'utf-8');
console.log('PATCHED:', file);
