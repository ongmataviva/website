# Baserow 2.3.3 AI Assistant Setup Guide

## Overview

Baserow 2.3.3 self-hosted has AI features (Kuma assistant, generative fields, MCP server), but setting it up with separate Docker containers (not the single-image bundle) requires specific configuration that differs from the single-image deployment. This document captures what was discovered during the setup.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Networks                     │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────          │
│  │ caddy    │    │ web-     │    │ backend  │          │
│  │ :8484    │───▶│ frontend │───▶│ :8000    │          │
│  │          │    │ :3000    │    │ (Django) │          │
│  │          │◀───│ (Nuxt)   │◀───│          │          │
│  └──────────    └──────────┘    └──────────┘          │
│       │                  │                    │          │
│       │                  │                    │          │
│  ┌────┴─────┐    ┌──────┴─────┐    ┌─────────┐       │
│  │ /api/     │    │ /api/      │    │ /assistant│       │
│  │ assistant │    │ database   │    │ chat/*    │       │
│  │ (rewrite) │    │ /tables    │    │           │       │
│  └──────────┘    └────────────┘    └──────────       │
─────────────────────────────────────────────────────────┘
```

**Key insight:** In the **single-image Baserow** (one Docker container), the internal routes are handled by Nginx inside the container. With **separate containers**, the Caddy reverse proxy needs explicit routing rules to know which path goes to frontend vs backend.

## What's Different: Separate Containers vs Single Image

| Component | Single Image | Separate Containers |
|---|---|---|
| Nuxt frontend | `/assistant/*` (internal Nginx) | `/assistant/*` needs Caddy routing |
| Enterprise API | `/api/assistant/*` (internal Nginx) | `/assistant/*` (no `/api` prefix) |
| Caddy/Nginx routing | Built-in | Manual in Caddy config |

### The Problem

The **Nuxt frontend** sends requests like:
- `POST /api/assistant/chat/?workspace_id=2` (creates conversation)
- `GET /assistant/chat/<uuid>/messages/` (fetches messages)

The **backend** has the enterprise URLs at:
- `POST /assistant/chat/` (creates conversation)
- `GET /assistant/chat/<uuid>/messages/` (fetches messages)

**Note:** `/api/` prefix is only added by frontend, NOT in backend's enterprise URLs.

## Configuration Files

### 1. `.env` — Environment Variables

```bash
# OpenRouter AI configuration
# Get key from https://openrouter.ai/keys
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-your-openrouter-key-here
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here

# Model configuration (openai: prefix is required for OpenAI-compatible endpoints)
BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL=openai:qwen/qwen3.7-flash
BASEROW_ENTERPRISE_ASSISTANT_LLM_TEMPERATURE=0.3
BASEROW_OPENAI_ENABLED_MODELS=openai:qwen/qwen3.7-flash
```

### Why `openai:` prefix?

Baserow uses **pydantic-ai** as the LLM framework. The model string format is:
```
provider:model_name
```

For OpenRouter (OpenAI-compatible):
```
openai:qwen/qwen3.7-flash
```

Without the `openai:` prefix, pydantic-ai tries to find a `QwenProvider` which doesn't exist. The `openai:` prefix tells pydantic-ai to use its OpenAI client, which respects `OPENAI_BASE_URL` and passes the bare model ID (`qwen/qwen3.7-flash`) to OpenRouter.

### 2. `docker-compose.dev.yml` — AI Variables on ALL Services

The AI Assistant (`/assistant/*`) requires the model and API key to be set in **BOTH** `backend` and `web-frontend` services. Not just one.

```yaml
services:
  backend:
    environment:
      # REQUIRED for AI-ASSISTANT
      OPENAI_BASE_URL: ${OPENAI_BASE_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL: ${BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL:-openai:qwen/qwen3.7-flash}
      BASEROW_ENTERPRISE_ASSISTANT_LLM_TEMPERATURE: ${BASEROW_ENTERPRISE_ASSISTANT_LLM_TEMPERATURE:-0.3}
      BASEROW_OPENAI_ENABLED_MODELS: ${BASEROW_OPENAI_ENABLED_MODELS:-openai:qwen/qwen3.7-flash}

  web-frontend:
    environment:
      # REQUIRED for AI-ASSISTANT (same as backend)
      OPENAI_BASE_URL: ${OPENAI_BASE_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL: ${BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL:-openai:qwen/qwen3.7-flash}
      BASEROW_OPENAI_ENABLED_MODELS: ${BASEROW_OPENAI_ENABLED_MODELS:-openai:qwen/qwen3.7-flash}
```

### 3. `Caddyfile.dev` — URL Routing (The Critical Fix)

```nginx
:80 {
    # CRITICAL: Rewrite /api/assistant/* → /assistant/*
    # Frontend Nuxt sends to /api/assistant/* (with /api prefix)
    # Backend enterprise has URLs at /assistant/* (without prefix)
    handle /api/assistant/* {
        uri replace /api/assistant/ /assistant/
        reverse_proxy backend:8000
    }

    # Other backend endpoints
    @backend {
        path /api/* /ws/* /static/* /assistant/chat/*
    }
    reverse_proxy @backend backend:8000

    # Everything else goes to frontend
    reverse_proxy web-frontend:3000
}
```

**Key points:**
- `handle /api/assistant/*` — catches the `/api/` prefix that Nuxt adds
- `uri replace /api/assistant/ /assistant/` — strips the `/api/` prefix before proxying
- `/assistant/chat/*` — needs `*` glob to match subpaths like `/assistant/chat/<uuid>/messages/`

## Common Mistakes & Solutions

### Mistake 1: Using model without provider prefix

```bash
# WRONG
BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL=qwen/qwen3.7-flash

# CORRECT (for OpenAI-compatible endpoints like OpenRouter)
BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL=openai:qwen/qwen3.7-flash
```

**Error:** `The model 'qwen/qwen3.7-flash' is not supported... QwenProvider not available`

**Why:** `pydantic-ai` can't find a `QwenProvider`. With `openai:` prefix, it uses the standard OpenAI client.

---

### Mistake 2: Environment variable from host shell overriding `.env`

If you have `OPENAI_API_KEY` set in your shell environment (e.g., via dotenv, exports, etc.), Docker Compose will **prefer that value** over `.env`.

```bash
# Check what Docker sees
docker exec mataviva-backend-1 env | grep OPENAI_API_KEY

# If it shows a different key than your .env, you have a conflict
```

**Solution:** Reset the env var before starting containers:

```bash
unset OPENAI_API_KEY
docker compose -f docker-compose.dev.yml up -d
```

Or remove the conflicting env var from your shell:

```bash
export OPENAI_API_KEY=""  # Clear it
```

**Or**, add this to your `~/.zshrc`:

```bash
# Let project .env drive OpenAI keys for Docker containers
unset OPENAI_API_KEY OPENAI_BASE_URL
```

---

### Mistake 3: `/assistant/chat/` (without glob) returns 404 for subpaths

The path `/assistant/chat/` only matches the **exact** path. To match subpaths like `/assistant/chat/<uuid>/messages/`, you need:

```nginx
# WRONG (only matches /assistant/chat/ exactly)
@backend {
    path /assistant/chat/
}

# CORRECT (matches /assistant/chat/* and subpaths)
@backend {
    path /assistant/chat/*
}
```

---

### Mistake 4: Forgetting AI variables on web-frontend

The Kuma assistant needs the config in **both** services. If only `backend` has `OPENAI_API_KEY`, the frontend can't create conversations.

**Error:** `/assistant/chat/` returns 401 or 404

**Fix:** Add to `web-frontend` environment block in `docker-compose.dev.yml`

---

## Verification Checklist

Before considering the setup done, verify each component:

### 1. Backend is running and env vars are set

```bash
docker exec mataviva-backend-1 env | grep -E "OPENAI_API_KEY|OPENAI_BASE_URL|LLM_MODEL"
```

Expected output:
```
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL=openai:qwen/qwen3.7-flash
```

### 2. Model string parses correctly

```bash
docker exec mataviva-backend-1 python3 -c "
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'baserow.config.settings.base'
django.setup()
from baserow_enterprise.assistant.model_profiles import get_model_string
print('Parsed model:', get_model_string())
"
```

Expected: `Parsed model: openai:qwen/qwen3.7-flash`

### 3. LLM readiness check passes

```bash
docker exec mataviva-backend-1 python3 -c "
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'baserow.config.settings.base'
django.setup()
from baserow_enterprise.assistant.model_profiles import check_lm_ready_or_raise
try:
    check_lm_ready_or_raise()
    print('LM readiness: PASSED')
except Exception as e:
    print('LM readiness: FAILED -', str(e)[:200])
"
```

Expected: `LM readiness: PASSED`

### 4. Backend endpoint responds (requires auth)

```bash
curl -s 'http://localhost:8484/api/assistant/chat/?workspace_id=2'
```

Expected: `{"detail":"Authentication credentials were not provided."}` (401)

This means:
- ✅ Caddy is routing `/api/assistant/*` to backend
- ✅ Backend has the route registered
- ✅ Authentication required (good)

### 5. Kuma works in browser

Open `http://localhost:8484` → Create account → Click **Kuma AI** in sidebar → Type a message

Expected: Kuma creates a conversation, responds with the model

## Troubleshooting Quick Reference

| Symptom | Cause | Fix |
|---|---|---|
| `Page not found: /assistant/chat/<uuid>/messages/` | Caddy routing missing `/api/assistant/*` handling | Add `handle /api/assistant/* { uri replace /api/assistant/ /assistant/; reverse_proxy backend:8000 }` to Caddyfile |
| `The specified language model is not supported` | Model string missing provider prefix | Use `openai:model_name` format for OpenAI-compatible endpoints |
| `Missing Authentication header` 401 on OpenRouter | Host shell has conflicting `OPENAI_API_KEY` (e.g., OpenAI project key) | `unset OPENAI_API_KEY` before docker compose, or remove from shell env |
| `/assistant/chat/` 404 for subpaths | Missing `*` glob in path match | Change `/assistant/chat/` to `/assistant/chat/*` |
| Assistant doesn't appear in frontend | Missing env vars on `web-frontend` service | Add AI variables to `web-frontend.environment` in docker-compose |

## Files Modified During Setup

- `.env` — Added OPENAI_API_KEY, OPENAI_BASE_URL, BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL, etc.
- `Caddyfile.dev` — Added `handle /api/assistant/*` rewrite rule, changed `/assistant/chat/` to `/assistant/chat/*`
- `docker-compose.dev.yml` — Added AI environment variables to `backend` and `web-frontend` services

## Version Notes

- **Baserow version:** 2.3.3
- **Image repository:** `baserow/backend:2.3.3`, `baserow/web-frontend:2.3.3`
- **Caddy version:** 2.11.1-alpine
- **Note:** This setup is for **separate containers** (not single-image Baserow). Single-image has these routes configured internally.

## References

- [Baserow AI Assistant Documentation](https://baserow.io/docs/installation/ai-assistant)
- [Baserow MCP Server](https://baserow.io/user-docs/mcp-server)
- [pydantic-ai providers](https://docs.pydantic.dev/latest/concepts/agents/)
- [OpenRouter API](https://openrouter.ai/docs)
