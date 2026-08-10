// GoogleAuthGitHubBackend — backend `github` adaptado ao login por Google.
//
// O Worker (/callback) troca o OAuth do Google por um installation token do
// GitHub App e devolve a identidade do editor em `user` (login = email).
// O GitHub backend original faz `api.user()` → GET /user para montar o user,
// mas installation tokens não funcionam em endpoint de usuário — então aqui
// a identidade vem do payload do login (state.user) e o GET /user é pulado.
// Também pulamos o hasWriteAccess (GET /repos): tokens de instalação sempre
// reportam permissões vazias, e o controle de acesso de verdade é a allowlist
// de emails no Worker (/callback). O token em si tem `contents: write`.
import { DecapCmsBackendGithub } from "@laikacms/decap-cms/backends/github";

const { GitHubBackend } = DecapCmsBackendGithub;

export class GoogleAuthGitHubBackend extends GitHubBackend {
  constructor(config, options) {
    super(config, options);
    this._googleUser = null;
    this.bypassWriteAccessCheckForAppTokens = true;
  }

  async authenticate(state) {
    const g = state?.user || {};
    this._googleUser = {
      name: g.name || "Colaborador",
      login: g.login || g.email || "google",
      email: g.email || "",
    };
    // super.authenticate → this.api.user() → getUser → this.currentUser()
    // (nossa versão abaixo), então o GET /user nunca é chamado de verdade.
    return super.authenticate(state);
  }

  async currentUser({ token } = {}) {
    if (this._googleUser) return this._googleUser;
    return super.currentUser({ token });
  }
}
