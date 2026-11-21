# Nook

Nook is a private, mindful digital journaling space for daily reflection. It features a focused writing environment, a date-based calendar and archive, tagging, favorites, light and dark themes, an emotionally perceptive AI reflection companion powered by Google Gemini, and optional cloud sync via Supabase.

## Features

- **Guest Sign-In**: Start journaling instantly with just your name—no passwords or mandatory emails. All entries stay stored privately in your browser.
- **AI Reflection Companion**: A warm, mindful AI companion (default: Mira) that reads your journal entry for context, understands your mood, and prompts gentle self-reflection.
- **Customizable Assistant**: Rename your AI companion in Settings (e.g., to Mira, Sol, Aria, etc.).
- **Profile Photo & Avatar**: Upload custom profile photos or avatars directly in Settings.
- **Sign Out & Account Deletion**: Easily sign out of your guest session or completely purge all local journal data with one click.
- **Optional Cloud Sync**: Connect Supabase with secure email magic links to sync your entries across devices.
- **Rich Media**: Attach photos and audio voice recordings directly into your journal entries.

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

Database schema and row-level security migrations live under `backend/supabase`.

## Quick start

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
cd frontend
npm ci
npm run dev
```

From `frontend/`, you can also run:

```sh
npm run build
npm run lint
npm run preview
```

## Environment variables

Create `frontend/.env.local` based on `frontend/.env.example`:

```dotenv
# Optional: Supabase cloud sync
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

# Optional: Google Gemini API key for AI companion
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## Live site & deployment

The `main` branch deploys the frontend to GitHub Pages at <https://breadoldest-collab.github.io/nook/>.

To configure production keys on GitHub Pages:
1. Navigate to your repository **Settings → Secrets and variables → Actions**.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository variables.
3. Add `VITE_GEMINI_API_KEY` as a repository secret or variable.

## Supabase setup (optional)

Cloud sync is entirely optional; browser-local storage works out of the box.

1. Create a Supabase project.
2. Run [`backend/supabase/migrations/20261120000000_create_journal_entries.sql`](./backend/supabase/migrations/20261120000000_create_journal_entries.sql) in the Supabase SQL Editor.
3. In **Authentication → URL Configuration**, allow your local Vite origin (`http://localhost:5173`) and your deployed GitHub Pages URL (`https://breadoldest-collab.github.io/nook/`).
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`.
