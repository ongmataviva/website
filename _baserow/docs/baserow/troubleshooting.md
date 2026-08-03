# Baserow Troubleshooting Quick Reference

## Quick Diagnostic Commands

```bash
# Check all containers are running
docker compose -f docker-compose.dev.yml ps

# Check backend env vars (API key conflict check)
docker exec mataviva-backend-1 env | grep -E "OPENAI_API_KEY|OPENAI_BASE_URL|LLM_MODEL"

# Check backend logs for errors
docker compose -f docker-compose.dev.yml logs backend --tail 50 2>&1 | grep -iE "error|exception|assistant|key|api"

# Test backend is responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:8484/api/v1/
```

## Troubleshooting Scenarios

### Scenario 1: Kuma returns "Page not found: /assistant/chat/<uuid>/messages/"

**Diagnosis:** Caddy routing issue — frontend sends to `/api/assistant/*`, backend has URLs at `/assistant/*`.

**Fix:** Verify `Caddyfile.dev` has this block:

```nginx
handle /api/assistant/* {
    uri replace /api/assistant/ /assistant/
    reverse_proxy backend:8000
}
```

Also verify the `@backend` path has `*` glob:

```nginx
@backend {
    path /api/* /ws/* /static/* /assistant/chat/*  # Needs asterisk!
}
reverse_proxy @backend backend:8000
```

After fix: `docker compose -f docker-compose.dev.yml restart caddy`

---

### Scenario 2: "The specified language model is not supported"

**Root cause:** Missing `provider:model` format for pydantic-ai.

**Fix in `.env`:**

```bash
# WRONG (will not work for OpenAI-compatible endpoints like OpenRouter)
BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL=qwen/qwen3.7-flash

# CORRECT (prefix with provider name)
BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL=openai:qwen/qwen3.7-flash
```

**Why:** Baserow uses `pydantic-ai` as the LLM framework. The model string format is `provider:model_name`. Without the prefix, pydantic-ai tries to find a matching provider (e.g., `QwenProvider`) which doesn't exist.

With `openai:` prefix, pydantic-ai uses its OpenAI client, which respects `OPENAI_BASE_URL` and passes the bare model ID (`qwen/qwen3.7-flash`) to OpenRouter.

**After fix:** Remove containers, recreate with new env:

```bash
docker compose -f docker-compose.dev.yml down
unset OPENAI_API_KEY  # Clear host env conflict
docker compose -f docker-compose.dev.yml up -d
```

---

### Scenario 3: "Missing Authentication header" 401 on OpenRouter

**Root cause:** Host shell has `OPENAI_API_KEY` set to an OpenAI project key (`sk-proj-...`), not an OpenRouter key (`sk-or-v1-...`).

**Diagnosis:**

```bash
# Check what shell has
printenv OPENAI_API_KEY

# Check what container has
docker exec mataviva-backend-1 env | grep OPENAI_API_KEY
```

If host shows `sk-proj-...` and container also shows `sk-proj-...`, the host is overriding your `.env`.

**Fix:**

```bash
unset OPENAI_API_KEY
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

**Permanent fix:** Add to `~/.zshrc`:

```bash
# Let project .env drive OpenAI keys for Docker containers
unset OPENAI_API_KEY OPENAI_BASE_URL
```

---

### Scenario 4: `/assistant/chat/` returns 404 for subpaths (like `/assistant/chat/<uuid>/messages/`)

**Diagnosis:** The `@backend` path match uses `/assistant/chat/` without glob `*`.

**Fix in `Caddyfile.dev`:**

```nginx
@backend {
    path /api/* /ws/* /static/* /assistant/chat/*  # Add asterisk!
}
```

The asterisk (`*`) matches any subsequent path segments. Without it, only exact path `/assistant/chat/` matches.

---

### Scenario 5: Kuma assistant doesn't appear in frontend sidebar

**Diagnosis:** `web-frontend` service is missing AI environment variables.

**Fix in `docker-compose.dev.yml`:**

Add to `web-frontend` environment block:

```yaml
web-frontend:
  environment:
    # ... existing vars ...
    OPENAI_BASE_URL: ${OPENAI_BASE_URL}
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL: ${BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL:-openai:qwen/qwen3.7-flash}
    BASEROW_OPENAI_ENABLED_MODELS: ${BASEROW_OPENAI_ENABLED_MODELS:-openai:qwen/qwen3.7-flash}
```

Both `backend` AND `web-frontend` need these vars.

---

### Scenario 6: Container startup fails on migrations

**Diagnosis:** Backend has migrations pending, or database credentials wrong.

**Check logs:**

```bash
docker compose -f docker-compose.dev.yml logs backend --tail 100
```

Look for migration errors or database connection failures.

**Fix:**

```bash
# Check DB connectivity
docker exec mataviva-db-1 psql -U baserow -c "SELECT version();"

# Check backend database settings
docker exec mataviva-backend-1 env | grep DATABASE
```

---

### Scenario 7: Caddy returns 502 Bad Gateway

**Diagnosis:** Backend or web-frontend not responding on expected port.

**Check:**

```bash
# Test web-frontend
curl -s http://localhost:8484/ | head -5

# Test backend directly (via web-frontend or backend host)
curl -s http://backend:8000/api/v1/ 2>&1 | head -5

# Check container health
docker inspect mataviva-<container-name> | grep -A5 "State"
```

---

## Verification Checklist

Run these to confirm everything is working:

### Step 1: All containers running

```bash
docker compose -f docker-compose.dev.yml ps
```

Expected: All 5 containers in `Up` state

---

### Step 2: Env vars correct

```bash
docker exec mataviva-backend-1 env | grep -E "OPENAI_API_KEY=sk-or|OPENAI_BASE_URL=https://openrouter|LLM_MODEL=openai:"
```

Expected: Shows OpenRouter key, OpenRouter URL, model with `openai:` prefix

---

### Step 3: Model parses correctly

```bash
docker exec mataviva-backend-1 python3 -c "
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'baserow.config.settings.base'
django.setup()
from baserow_enterprise.assistant.model_profiles import get_model_string
print(get_model_string())
"
```

Expected output: `openai:qwen/qwen3.7-flash`

---

### Step 4: LLM readiness

```bash
docker exec mataviva-backend-1 python3 -c "
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'baserow.config.settings.base'
django.setup()
from baserow_enterprise.assistant.model_profiles import check_lm_ready_or_raise
check_lm_ready_or_raise()
print('PASSED')
" 2>&1 | tail -1
```

Expected: `PASSED`

---

### Step 5: Backend endpoint responds

```bash
curl -s 'http://localhost:8484/api/assistant/chat/?workspace_id=2'
```

Expected: `{"detail":"Authentication credentials were not provided."}` (HTTP 401)

This confirms:
- ✅ Caddy routes `/api/assistant/*` to backend
- ✅ Backend has the route registered
- ✅ Authentication is enforced (correct)

---

### Step 6: Kuma works in browser

1. Open `http://localhost:8484`
2. Create admin account (if first time)
3. Click **Kuma AI** in left sidebar
4. Click **Create a table** or type a message
5. Expected: Kuma creates a conversation, LLM responds

---

## Files to Check

| File | What to verify |
|---|---|
| `.env` | `OPENAI_API_KEY=sk-or-...`, `LLM_MODEL=openai:...` |
| `Caddyfile.dev` | `handle /api/assistant/*` block exists, `/assistant/chat/*` has `*` |
| `docker-compose.dev.yml` | AI vars in both `backend` AND `web-frontend` environment |

---

## Known Limitations

- **Kuma requires Baserow enterprise license** for full functionality (chat persistence, knowledge base, etc.)
- **MCP Server** (Baserow's native MCP endpoint) requires enterprise license
- **AI Fields** (generative fields in tables) work on self-hosted without license

---

## Related Documentation

- [Docker Setup](docker-setup.md)
- [AI Assistant Setup](ai-assistant-setup.md)
