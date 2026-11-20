# Backend

Nook uses Supabase as its managed backend; there is no separate API server in this repository.

## Database

Apply SQL migrations from [`supabase/migrations/`](./supabase/migrations/) to the Supabase project's SQL Editor. The journal entries table stores each entry as JSONB, keyed by account and entry ID. Row-level security restricts access to the authenticated owner.

The frontend uses only the project's public anon/publishable key. Never expose a Supabase service-role or secret key in frontend code or environment files that are committed.

## Authentication

Supabase Auth sends email magic links. Configure local and production app URLs under **Authentication → URL Configuration** in the Supabase dashboard.

## Future backend work

Keep schema changes in timestamped SQL migrations. If server-only integrations are added later, put them in a dedicated service or Supabase Edge Functions; keep private credentials out of the browser.
