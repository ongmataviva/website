// Roteamento do Painel.
//
// O fork não re-exporta `useDecap`/`useNavigate` do barrel `core` (bug do
// barrel: hooks/index.js não re-exporta useDecap.js/useNavigate.js e o mapa
// de exports do pacote não expõe `./core/*`). A superfície pública tem
// `createDefaultRouter` + `defaultRoutingTable`, então criamos o router aqui,
// passamos a MESMA instância para o <DecapCmsProvider router={router}> e
// derivamos nossos próprios `navigate`/`useRouterPath` sobre ele. Todo o
// resto do motor (thunks de persistência, remoção etc.) navega pelo mesmo
// router via `setActiveRouting`, então a URL e o estado ficam em sincronia.
import { useEffect, useState } from 'react';
import { createDefaultRouter, defaultRoutingTable } from '@laikacms/decap-cms/core';

export const router = createDefaultRouter();

export function navigate(key, params, options) {
  const path = defaultRoutingTable[key].create(params);
  if (options?.replace) router.replace(path);
  else router.push(path);
}

// Navegação para rotas custom do Painel (fora da tabela padrão do motor),
// ex.: a página /equipe.
export function navigatePath(path, options) {
  if (options?.replace) router.replace(path);
  else router.push(path);
}

export function useRouterPath() {
  const [path, setPath] = useState(() => router.location().pathname);
  useEffect(() => router.subscribe((update) => setPath(update.location.pathname)), []);
  return path;
}
