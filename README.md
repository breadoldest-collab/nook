# Nook 🌿

> A private, mindful digital journaling space for daily reflection, creative writing, and self-discovery.

[![Live App](https://img.shields.io/badge/Live-breadoldest--collab.github.io%2Fnook-brightgreen)](https://breadoldest-collab.github.io/nook/)

🌐 **Live Application**: [https://breadoldest-collab.github.io/nook/](https://breadoldest-collab.github.io/nook/)

---

## Highlights

- **Clean Private Journaling**: Start journaling instantly with just your name—no passwords, mandatory emails, or trackers. All entries stay stored privately in your browser.
- **AI Reflection Companion (Mira)**: An emotionally perceptive, warm reflection partner powered by Google Gemini. Mira can reflect on your day, explore patterns, suggest prompts, and draft or expand journal entries whenever you ask.
- **Multimodal Understanding**: Attach photos to entries—Mira sees and reflects on the imagery in your journal.
- **Audio Voice Notes**: Record voice notes directly inside entries with persistent audio playback and easy deletion.
- **Interactive Calendar & Archive**: Browse entries by month or date, view monthly entry/favorite stats, see tag color dots on dates, and hover to quick-add an entry on any day.
- **Customizable Tag Colors**: Assign any of 7 curated aesthetic color tones (`sage`, `rose`, `sky`, `amber`, `violet`, `slate`, `teal`) to organize entries. Manage and rename tags in a dedicated Tags view.
- **Themes & Customization**: Seamless Light and Dark mode transitions with interactive particle physics. Rename your companion, update profile avatars, and customize starting views.
- **Data Export & Privacy**: Full data ownership with JSON export, local reset, and optional end-to-end cloud sync powered by Supabase.

---

## Tech Stack

- **Frontend**: React 19, Vite, Lucide Icons, Fluid Canvas Particle Simulation
- **Styling**: Modern CSS variables with fluid layout and responsive design
- **AI**: Google Gemini REST API (`gemini-flash-lite`) with multimodal vision and conversational memory
- **Cloud (Optional)**: Supabase Auth & PostgreSQL Row-Level Security
- **Hosting**: GitHub Pages via automated GitHub Actions

---

## Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/breadoldest-collab/nook.git
cd nook/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:5173/](http://localhost:5173/) to start journaling.

---

## Production Build & Deployment

```bash
cd frontend
npm run build -- --base=/nook/
```

Deploys automatically to GitHub Pages on every push to `main`.
