# Sangol

Deployable monorepo:

- `backend` — Express + TypeScript API
- `front` — public Vite/React site
- `admin` — Vite/React admin

## Quick start (DB + CMS images)

```bash
cd backend
cp .env.example .env   # set DB_PASSWORD, JWT_SECRET (32+ chars)
npm ci
npm run migrate
npm run seed:init      # seed/cms-assets → uploads + cms_media + cms_pages
```

See [docs/GIT_AND_SEED.md](docs/GIT_AND_SEED.md) for a clean GitHub push checklist.  
See [backend/seed/README.md](backend/seed/README.md) for seed layout.

Secrets stay in `.env` (not committed).
