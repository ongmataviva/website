# Baserow Docker Setup (Single-Image vs Separate Containers)

## Quick Start

Run the Baserow Docker compose locally for development or experimentation with the Kuma AI assistant.

### Prerequisites

- Docker Desktop (for macOS/Windows)
- Docker Compose v2+

### Run

```bash
# Start all containers
docker compose -f docker-compose.dev.yml up -d --remove-orphans

# Stop all containers
docker compose -f docker-compose.dev.yml down
```

Access at: **http://localhost:8484**

## Container Architecture

| Container | Image | Port | Purpose |
|---|---|---|---|
| `backend` | `baserow/backend:2.3.3` | 8000 (internal) | Django API, enterprise features |
| `web-frontend` | `baserow/web-frontend:2.3.3` | 3000 (internal) | Nuxt frontend |
| `caddy` | `caddy:2.11.1-alpine` | 8484:80 | Reverse proxy, SSL termination |
| `db` | `pgvector/pgvector:pg15` | 5432 (internal) | PostgreSQL with vector extensions |
| `redis` | `redis:7-alpine` | 6379 (internal) | Cache and queue |

**Note:** This setup uses **5 separate containers**. The Baserow docker also provides a **single-image** version that bundles everything into one container. The single-image version has all routes handled internally (no Caddy config needed).

## Environment Variables

See `.env` for all configurable values.

### Required Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key | `dev-secret-key-change-in-prod` |
| `DATABASE_PASSWORD` | PostgreSQL password | `dev123` |
| `REDIS_PASSWORD` | Redis password | `dev123` |

### AI Variables (Kuma Assistant)

| Variable | Description |
|---|---|
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible API (e.g., OpenRouter) |
| `OPENAI_API_KEY` | API key for the provider |
| `BASEROW_ENTERPRISE_ASSISTANT_LLM_MODEL` | Model string (format: `provider:model_name`) |
| `BASEROW_ENTERPRISE_ASSISTANT_LLM_TEMPERATURE` | Temperature setting (default: 0.3) |
| `BASEROW_OPENAI_ENABLED_MODELS` | Models enabled for AI Fields |

### 🚨 Critical: HOST ENV CONFLICT

If you have `OPENAI_API_KEY` set in your shell (e.g., from dotenv, `.zshrc`, or other tools), Docker Compose will **prefer that value** over your `.env` file.

**Check:**
```bash
printenv OPENAI_API_KEY  # Shows what Docker will see
```

**Fix:**
```bash
unset OPENAI_API_KEY
docker compose -f docker-compose.dev.yml up -d
```

Or add to `~/.zshrc`:
```bash
# Let project .env drive OpenAI keys for Docker containers
unset OPENAI_API_KEY OPENAI_BASE_URL
```

## File Structure

```
mataviva/
├── .env                    # Environment variables
├── Caddyfile.dev           # Caddy configuration (single-container proxy)
├── docker-compose.dev.yml  # Docker Compose configuration
├── docs/
│   └── baserow/
│       ├── docker-setup.md # This file
│       └── ai-assistant-setup.md  # Kuma AI setup details
└── ideas/
    └── input/
        └── 2026-07-30-baseroll-docker-local-setup.md  # Original rought
```

## Single-Image vs Separate Containers

### Single-Image (baserow/baserow:latest)

- One container, all-in-one
- Internal Nginx handles routing
- No Caddy config needed
- Simpler setup, but less control

### Separate Containers (what we have here)

- 5 containers
- Caddy handles routing
- Full control over each service
- **Requires Caddyfile tweaks for AI features** (see `ai-assistant-setup.md`)

## Volume Persistence

PostgreSQL data is persisted in a named volume `pgdata`.

```bash
# View data
docker volume ls | grep pgdata

# Back up database
docker run --rm -v mataviva_pgdata:/data alpine \
  tar czf /tmp/dbbackup.tar.gz -C /data .

# Restore
docker run --rm -v mataviva_pgdata:/data alpine \
  tar xzf /tmp/dbbackup.tar.gz -C /data
```

## Next Steps

1. Set up AI Assistant (see [`ai-assistant-setup.md`](ai-assistant-setup.md))
2. Configure MCP Server (see [`ai-assistant-setup.md#mcp`](ai-assistant-setup.md))
3. Create initial data (databases, tables, etc.)

## References

- [Baserow Docker Installation](https://baserow.io/docs/installation/install-with-docker)
- [Baserow Architecture](https://baserow.io/docs/user-docs/how-baserow-works)
