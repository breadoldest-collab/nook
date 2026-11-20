# Nook

Nook is a personal journaling app built with React and Vite. Journal entries are saved locally in the browser by default. An optional Supabase connection adds email-link sign-in and private per-account journal sync.

## Run locally

```sh
npm install
npm run dev
```

## Set up Supabase sync

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261120000000_create_journal_entries.sql`](./supabase/migrations/20261120000000_create_journal_entries.sql). It creates the entries table and row-level security policies so each signed-in user can access only their own rows.
3. In **Authentication → URL Configuration**, add the local app URL (for example `http://localhost:5173`) to the allowed redirect URLs. Add the deployed Nook origin when deploying.
4. Copy `.env.example` to `.env.local` and fill in the project's URL and public anon/publishable key from the Supabase project API settings:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   ```

   Never put a Supabase `service_role` or secret key in this frontend app.
5. Restart the Vite server, open **Settings → Account → Cloud sync**, enter your email, and follow the sign-in link.

On first sign-in, Nook imports browser entries that are not already in the account. Entries with matching IDs are reconciled by their latest edit timestamp. The browser copy is retained; remote entries are also added to it. Later entry edits and deletions sync automatically when online. If sync fails, Nook reports the error and keeps local edits in the browser for retry.

This initial cloud sync covers journal entries. Profile preferences and Mira conversation history remain browser-local. Photo attachments are stored with their entry, subject to a 4 MB sync request limit; voice recordings currently use temporary browser URLs and are not portable across devices.

## Checks

```sh
npm run lint
npm run build
```
