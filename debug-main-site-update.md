# Debug: main-site-update

Status: [OPEN]

## Symptom

The admin shows a saved article title that differs from the title displayed in the main website hero.

## Hypotheses

1. The admin save reached the `content` branch but the index workflow has not regenerated `data/index.json`.
2. GitHub raw data is updated but the Worker or browser still serves cached content.
3. The Worker deployment containing the cache/purge changes did not reach production.
4. The admin saved a different field or slug than the hero route reads.

## Evidence

- GitHub `content/content/noticia/esgoto-condominio-notificacao.md` contains the current edited title ending in `sociedade civil`.
- GitHub `content/data/index.json` contains the same title and was regenerated at `2026-08-10T22:07:51.201Z`.
- The live home still renders the previous title ending in `comunidade!`.
- The live article still renders the previous truncated title.
- The live home response has `Cache-Control: public, max-age=300`, proving the old Worker is deployed.
- `/_purge?...` returns `404`, proving the cache-purge Worker change is not deployed.
- The live `/admin/cms.js` contains zero `_purge` markers, proving the admin bundle with the post-save purge hook is not deployed.

## Conclusion

Hypothesis 1 is rejected: GitHub content and the generated index are updated.
Hypothesis 2 is partially true: the live Worker serves stale content, but this is a consequence of the old deployment.
Hypothesis 3 is confirmed: the Worker and admin bundle containing the cache fixes are not in production.
Hypothesis 4 is rejected: the current slug and fields are present in both GitHub files and match the hero route.
