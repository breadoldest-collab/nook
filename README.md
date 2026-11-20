# Nook

Nook is a private-feeling digital journal for daily reflections. It includes a focused writing space, a date-based archive, tags, favorites, light and dark themes, and an optional email-link account for syncing journal entries with Supabase.

## Repository layout

```text
nook/
├── backend/
│   ├── README.md
│   └── supabase/
│       └── migrations/
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

The backend is hosted by Supabase; this repository does not run a separate API server. Database schema and row-level security migrations live under `backend/supabase`.

## Quick start

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
cd frontend
npm ci
npm run dev
```

Vite prints the local URL when the development server is ready. From `frontend/`, use:

```sh
npm run build
npm run lint
npm run preview
```

## Supabase setup

Cloud sync is optional. Without Supabase configuration, entries continue to work in browser storage.

1. Create a Supabase project.
2. Run [`backend/supabase/migrations/20261120000000_create_journal_entries.sql`](./backend/supabase/migrations/20261120000000_create_journal_entries.sql) in the Supabase SQL Editor.
3. In **Authentication → URL Configuration**, allow the local Vite origin (usually `http://localhost:5173`) and the deployed Nook origin.
4. Copy `frontend/.env.example` to `frontend/.env.local` and add the project URL and public anon/publishable key:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   ```

5. Restart Vite, open **Settings → Account → Cloud sync**, enter your email, and follow the sign-in link.

Never put a Supabase `service_role` or secret key in this frontend app. Environment files containing keys are ignored by Git.

The first sign-in imports browser entries into the account and keeps their local copy. Entries are scoped by user with row-level security. Later entry changes sync when online; the app reports sync errors and retains unsynced local data. Profile preferences and Mira conversation history remain browser-local. Photo attachments sync with their entry, subject to a 4 MB request limit; voice recordings currently use temporary browser URLs and are not portable across devices.

See [`backend/README.md`](./backend/README.md) for backend ownership and migration conventions.
