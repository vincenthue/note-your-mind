# Pre-Task: Simple File Management System - Hue Wei Sheng (Note Your Mind) 

## Features

- **Kanban Board** — Every note is a card in To do / In progress / Done; drag cards between columns (order is saved)
- **Rich Text Editor** — Headings, bold/italic/underline, highlight, links, lists, checklists, quotes, code blocks (TipTap)
- **Checklist Progress** — Cards show how many checklist items are done
- **List View** — All notes in one list, sortable by last edited, date created or title
- **Tags** — Coloured tags, filter by tag from the sidebar
- **Search** — Instant search across titles, content and tags (Ctrl+K)
- **Trash** — Soft delete with Undo, restore, delete forever, empty trash
- **Secure Accounts** — Token-based sessions, scrypt password hashing, every note scoped to its owner; forgot password via emailed OTP
- **Dark / Light Mode** and a responsive layout for phones

---

## Project Structure

```
Note-Your-Mind/
└── frontend/               # One Vercel project: Vue app + API
    ├── src/                # Vue 3 app (App.vue, components/, views/)
    ├── api/index.js        # Vercel serverless function — serves every /api/* request
    ├── server/
    │   ├── app.js          # Express API routes
    │   ├── db.js           # libSQL client (Turso in production, local.db in dev)
    │   └── dev.js          # Local API server on port 3000
    └── vercel.json         # Rewrites /api/* to the function
```

Live site: [https://noteyourmind.com](https://noteyourmind.com) (API at `/api`).

---

## Running locally

**Prerequisites:** Node.js 22+

```bash
cd frontend
npm install
npm run api    # terminal 1 — API on http://localhost:3000 (creates local.db)
npm run dev    # terminal 2 — app on http://localhost:5173 (proxies /api to :3000)
```

---

## Development Process 

### Example 1

**Prompt given:**
> "Create a Vue 3 authentication page where a purple gradient panel slides horizontally between Sign In and Sign Up states."

**AI's output:**
.purple-panel {
  position: absolute;
  left: 50%;
  width: 50%;
  transition: left 0.65s ease;
}
.purple-panel.panel-left { left: 0; }

**How I modified it:**
The AI only generated a basic horizontal slide. I add panelFullscreen state and a two-step animation, the panel first expands to cover the full screen, then shrinks back to the opposite side. This creates a more dramatic and polished transition effect.

**Why I made these changes:**
The basic slide i felt too plain. By adding the fullscreen expansion step between transitions, the switch between Sign In and Sign Up feels more intentional and visually engaging, giving the app a premium feel that stands out from typical auth pages.

---

### Example 2

**Prompt given:**
> "Make note cards draggable to reorder them in Vue 3."

**AI's output:**
const dragIndex = ref(null)

function onDragStart(index, e) {
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
}
function onDrop(index) {
  const arr = [...displayNotes.value]
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(index, 0, moved)
  displayNotes.value = arr
}

**How I modified it:**
The AI only generated basic drag and drop without any visual feedback. I added dragOverIndex to track which card the user is hovering over, and applied CSS classes to show which card is being dragged and where it will drop (App.vue line 298-299):
:class="{
  'note-card--dragging': dragIndex === index,
  'note-card--dragover': dragOverIndex === index && dragOverIndex !== dragIndex
}"

**Why I made these changes:**
Without visual feedback, the user has no idea where the card will land when they drop it. Highlighting the dragging card and the target position makes drag and drop much more easier to use.

---

### Example 3

**Prompt given:**
> "Generate a tag color picker in Vue 3 where each tag has a color input that lets users pick a custom color, and apply that color to the tag chip styling."

**AI's output:**
const tagColors = reactive({})

function setTagColor(tag, color) {
  tagColors[tag] = color
}

function getTagStyle(tag) {
  const color = tagColors[tag] || '#6366F1'
  return { color: color }
}

**How I modified it:**
The AI only applied color to the text. I used hexToRgb() to convert the hex color and apply it as background and border too. I also saved the colors to localStorage so they persist after page refresh (App.vue line 757-761):
const tagColors = reactive(JSON.parse(localStorage.getItem(TAG_COLOR_STORAGE_KEY) || '{}'))

function setTagColor(tag, color) {
  tagColors[tag] = color
  localStorage.setItem(TAG_COLOR_STORAGE_KEY, JSON.stringify({ ...tagColors }))
}

**Why I made these changes:**
Applying color only to text looks plain. Using the same color for background and border with reduced opacity gives the tag chip a cohesive look. Saving to localStorage means users don't have to re-pick colors every time they reload the page.

---
---

## Deployment notes

- Everything deploys from the `frontend` folder as one **Vercel** project (free tier). The API runs as a serverless function under `/api`, so no separate backend host is needed.
- Data lives in **Turso** (hosted SQLite, free tier). Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the Vercel project's environment variables. Without them the API falls back to a local `local.db` file (fine for development only).
- `RESEND_API_KEY` is needed to send password-reset emails; without it the code is printed to the server log.
