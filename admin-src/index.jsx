// Mata Viva — Painel de conteúdo (admin headless).
//
// O motor é o Decap/Laika fork (`@laikacms/decap-cms`) usado em modo headless:
// <DecapCmsProvider> cuida do store, config (fetch de /admin/config.yml),
// autenticação, mídia e notificações; a UI é 100% nossa (<Painel>), com telas
// ergonômicas por entidade e estética Ocelot (public/admin/painel.css).
//
// O mesmo bundle serve dev (cms-laika.js, via proxy local) e produção
// (cms.js, via OAuth Google → installation token do GitHub App). A troca
// de backend é feita pelo próprio motor: o config.yml tem `local_backend`
// apontando para http://localhost:9191/api/v1 e `handleLocalBackend`
// alterna github → proxy quando o servidor local existe.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DecapCmsProvider, Registry } from "@laikacms/decap-cms/core";
import { en } from "@laikacms/decap-cms/locales";
import pt from "@laikacms/decap-cms/locales/pt";
import { DecapCmsBackendProxy } from "@laikacms/decap-cms/backends/proxy";
import { DecapCmsBackendGithub } from "@laikacms/decap-cms/backends/github";
import { createMarkdownEntryCodec } from "@laikacms/decap-cms/entry-codecs/markdown";
import {
  yamlEntryCodec,
  yamlFrontmatterCodec,
} from "@laikacms/decap-cms/entry-codecs/yaml";
import { DecapCmsWidgetString } from "@laikacms/decap-cms/widgets/string";
import { DecapCmsWidgetSelect } from "@laikacms/decap-cms/widgets/select";
import { DecapCmsWidgetNumber } from "@laikacms/decap-cms/widgets/number";
import { DecapCmsWidgetText } from "@laikacms/decap-cms/widgets/text";
import { DecapCmsWidgetImage } from "@laikacms/decap-cms/widgets/image";
import { DecapCmsWidgetBoolean } from "@laikacms/decap-cms/widgets/boolean";
import { DecapCmsWidgetList } from "@laikacms/decap-cms/widgets/list";
import { DecapCmsWidgetDatetime } from "@laikacms/decap-cms/widgets/datetime";
import {
  Widget as RichtextWidget,
  passthroughSerializer as richtextPassthroughSerializer,
} from "@laikacms/decap-cms/widgets/richtext";
import { markdownFormat } from "@laikacms/decap-cms/format-packs/markdown";
import Painel from "./painel";
import { router } from "./routing";
import { GoogleAuthGitHubBackend } from "./google-backend";

/* ============================================================
   Registros do motor (antes de montar o provider)
   ============================================================ */

// Backends: `github` (produção — login Google, adaptado em google-backend.js)
// e `proxy` (dev local — o motor alterna automaticamente quando detecta o
// local_backend no config.yml).
Registry.registerBackend("proxy", DecapCmsBackendProxy.ProxyBackend);
Registry.registerBackend("github", GoogleAuthGitHubBackend);

// Codecs de entrada: o config.yml é YAML; as entradas são markdown com
// frontmatter YAML. A ordem importa (yaml primeiro).
Registry.registerEntryCodec(yamlEntryCodec);
Registry.registerEntryCodec(
  createMarkdownEntryCodec({ frontmatter: [yamlFrontmatterCodec] })
);

// Widgets embutidos usados pelas coleções do site.
Registry.registerWidget(DecapCmsWidgetString.Widget());
Registry.registerWidget(DecapCmsWidgetSelect.Widget());
Registry.registerWidget(DecapCmsWidgetNumber.Widget());
Registry.registerWidget(DecapCmsWidgetText.Widget());
Registry.registerWidget(DecapCmsWidgetImage.Widget());
Registry.registerWidget(DecapCmsWidgetBoolean.Widget());
Registry.registerWidget(DecapCmsWidgetList.Widget());
Registry.registerWidget(DecapCmsWidgetDatetime.Widget());
Registry.registerWidget(RichtextWidget());
// Aliases de retrocompatibilidade Decap v1→v2: 'markdown' → richtext,
// 'date' → datetime (as coleções usam widget "markdown" no campo body).
Registry.registerWidget({ ...RichtextWidget(), name: "markdown" });
Registry.registerWidget({ ...DecapCmsWidgetDatetime.Widget(), name: "date" });

// O widget richtext guarda um `LexicalRichtextValue` lazy; o serializer
// passthrough mantém o proxy intacto pelo pipeline de valores do Decap para
// o `toString()` disparar uma única vez, na escrita do arquivo. O formato
// markdown registra o mapper 'markdown' que o alias resolve.
Registry.registerWidgetValueSerializer("richtext", richtextPassthroughSerializer);
Registry.registerWidgetValueSerializer("markdown", richtextPassthroughSerializer);
Registry.registerRichtextFormat(markdownFormat);

// Locales: `en` é a base dos phrases (merge getLocale('en') + getLocale(pt));
// `pt` vem do config.yml (`locale: pt`) e resolve as strings de UI.
Registry.registerLocale("en", en);
Registry.registerLocale("pt", pt);

/* ============================================================
   Montagem — provider headless + UI própria
   ============================================================ */

const ROOT_ID = "cms";
function getRoot() {
  const existing = document.getElementById(ROOT_ID);
  if (existing) return existing;
  const root = document.createElement("div");
  root.id = ROOT_ID;
  document.body.appendChild(root);
  return root;
}

// Reutiliza a raiz React entre HMR/re-renders (evita o erro de createRoot
// duplicado no mesmo container).
const rootRegistry = new WeakMap();
function ensureRoot(container) {
  let root = rootRegistry.get(container);
  if (!root) {
    root = createRoot(container);
    rootRegistry.set(container, root);
  }
  return root;
}

ensureRoot(getRoot()).render(
  <StrictMode>
    <DecapCmsProvider config={{}} router={router}>
      <Painel />
    </DecapCmsProvider>
  </StrictMode>
);
