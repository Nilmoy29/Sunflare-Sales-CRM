# API keys and environment setup — Sunflare

When you need each credential and where to get it.

## Quick reference

| Variable | Needed from | Used for |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Story 1.2** | App + Supabase CLI |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Story 1.2** | Browser/client auth (Story 1.3+) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Story 1.2** | Server admin ops, migrations tooling |
| `DATABASE_URL` | **Story 1.2** | `supabase db push`, direct SQL |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | **Story 2.3** (map UI) | Rep/admin maps |
| `MAPBOX_SECRET_TOKEN` | **Story 2.6** (address auto-fill) | Server-side reverse geocoding |
| `NEXT_PUBLIC_APP_URL` | **Story 1.3** | Auth redirects (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Story 4.8** | Web Push subscribe (browser) |
| `VAPID_PRIVATE_KEY` | **Story 4.8** | Web Push send (server only — secret) |
| `VAPID_SUBJECT` | **Story 4.8** | Web Push issuer (`mailto:you@domain.com` or app URL) |
| `CRON_SECRET` | **Story 4.8** | Protects `/api/v1/cron/follow-up-reminders` |

Until Story 1.2 you could run `npm run dev` without keys (health route only).  
From **Story 1.2 onward** you need a Supabase project to apply migrations.  
From **Story 1.3** login requires Supabase keys in `.env.local`.  
From **Story 2.3** add Mapbox for the canvassing map.  
From **Story 2.6** add `MAPBOX_SECRET_TOKEN` for address auto-fill on the knock form (map can work without it).

---

## 1. Supabase (needed now — Story 1.2+)

### Create a project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → pick org, name (`sunflare`), database password (save it), region (e.g. Sydney if AU users)
3. Wait until the project is **Active**

### Collect keys

**Project Settings → API**

| Copy this | Into `.env.local` |
|-----------|-------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

Never commit `service_role` or put it in client-side code.

**Project Settings → Database → Connection string**

| Copy this | Into `.env.local` |
|-----------|-------------------|
| URI (Session mode or Direct) | `DATABASE_URL` |

Use the **password** you set when creating the project. Prefer **Transaction** pooler for serverless (Vercel); **Session** or direct URL works for `supabase db push`.

**Project Settings → General**

| Copy this | Used with |
|-----------|-----------|
| Reference ID (e.g. `abcdefghijklmnop`) | `npx supabase link --project-ref <ref>` |

### Apply migrations

```bash
cp .env.example .env.local
# paste values above

npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**Local alternative (Docker):** no cloud keys required for DB only:

```bash
npx supabase start
npx supabase db reset   # applies migrations + seed.sql
```

Use connection details printed by `supabase status` for local `DATABASE_URL`.

### First admin user

After migrations:

1. Dashboard → **Authentication** → **Users** → **Add user** (email + password)
2. SQL Editor:

```sql
update public.profiles
set role = 'admin', name = 'Your Name'
where id = '<paste-user-uuid-from-auth-users>';
```

---

## 2. Mapbox (Story 2.3+ — map features)

### Create token

1. [https://account.mapbox.com/](https://account.mapbox.com/) → sign up / log in
2. **Access tokens** → **Create a token**
3. Default public scopes are fine for client map display
4. Copy token → `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env.local`

**Important:** The browser map requires a **public** token (`pk.…`) with map scopes (e.g. `STYLES:READ`, `STYLES:TILES`). Do not put your secret token here — the map will stay black.

**Secret** token (Story 2.6 — reverse geocoding): create a **second** token with secret scopes → `MAPBOX_SECRET_TOKEN` in `.env.local`. Never expose this token to the browser.

Without `MAPBOX_SECRET_TOKEN`, reps can still log knocks and type addresses manually; the map UI only needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.

Mapbox is **not** required for Story 1.2 or 1.3.

---

## 3. Vercel (deployment — later)

When deploying:

1. Import repo in [Vercel](https://vercel.com)
2. **Environment Variables** → add the same keys as `.env.local` (production values)
3. `NEXT_PUBLIC_*` vars must be set for Production and Preview

---

## 4. Security checklist

- [ ] `.env.local` is gitignored (already configured)
- [ ] `service_role` only in server env / CI secrets
- [ ] Rotate keys if accidentally committed
- [ ] Mapbox token URL-restricted in production (optional, recommended)

---

## 5. Verify setup

```bash
# App still builds without calling Supabase at runtime
npm run build

# After keys + link
npx supabase db push
npm run dev
```

Story 1.3: visit `/login` after creating a user in Supabase Auth.

---

## 5b. Web Push / VAPID (Story 4.8 — follow-up reminders)

Generate a key pair locally (do not commit the private key):

```bash
npx web-push generate-vapid-keys
```

| Copy this | Into `.env.local` |
|-----------|-------------------|
| Public Key | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| Private Key | `VAPID_PRIVATE_KEY` (secret) |

Also set `VAPID_SUBJECT` (e.g. `mailto:you@yourdomain.com`) and `CRON_SECRET` (random string for the cron route).

**Push QA:** Serwist is disabled in `npm run dev`. Use `npm run build && npm run start`. Trigger reminders:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/v1/cron/follow-up-reminders
```

---

## 6. Cursor + Supabase MCP

Project rules in `.cursor/rules/supabase-database-*.mdc` tell the agent to use **Supabase MCP** for schema work when connected.

**MCP setup** (user-level `~/.cursor/mcp.json`):

Use the **hosted HTTP** server (recommended — avoids `npx` / `ENOTEMPTY` failures):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=glruwdknafegbcofvnbp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPABASE_PAT"
      }
    }
  }
}
```

- PAT: [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) (`sbp_...`), **not** anon/service_role JWTs
- Copy template: `.cursor/mcp.json.example`

**If MCP stays red:** fully quit and reopen Cursor → Settings → MCP → click **supabase** for the error text. CLI fallback: `npm run db:push`.

**MCP scripts in repo:**

| Command | Purpose |
|---------|---------|
| `npm run db:types` | Regenerate `src/types/supabase.generated.ts` from live schema |
| `node scripts/mcp-call.mjs list_tables '{}'` | Ad-hoc MCP tool from terminal |

**Sunflare project ref:** `glruwdknafegbcofvnbp`
