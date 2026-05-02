# CLINIA Production Pipeline

CLINIA production target:

```text
User -> CDN/Vercel -> Next.js
                 -> FastAPI Docker service
                 -> Managed PostgreSQL
                 -> ChromaDB
                 -> Redis
```

## Local Infra

1. Copy `.env.example` to `.env`.
2. Set a strong `SECRET_KEY`.
3. Start infra and apps:

```bash
docker compose up --build
```

Backend: `http://localhost:8000`
Frontend: `http://localhost:3000`
Chroma: `http://localhost:8001`

Run migrations:

```bash
docker compose exec backend alembic upgrade head
```

## CI

GitHub Actions runs:

- Backend dependency install
- Alembic migrations
- Backend tests
- Backend Docker build
- Frontend typecheck
- Frontend lint
- Frontend build
- Frontend Docker build

## Required Production Secrets

Set these in Railway/AWS/Vercel/GitHub:

```text
DATABASE_URL
SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=https://your-vercel-domain.com
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
DEPLOY_WEBHOOK
```

## Deployment

Frontend:

- Deploy `clinia-frontend` to Vercel.
- Set `NEXT_PUBLIC_API_URL` to the backend URL.

Backend:

- Deploy the root repo with `Backend/Dockerfile`.
- Set all backend environment variables.
- Run `alembic upgrade head` during release or as a one-off deploy command.

Database:

- Use managed PostgreSQL.
- Never commit `.env`.

Redis:

- Use managed Redis for cache and future background jobs.

ChromaDB:

- Use a persistent volume or managed vector database before real customer launch.
