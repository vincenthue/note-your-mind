# Pre-Task: Simple File Management System - Hue Wei Sheng (Note Your Mind) 

## Features

- **User Authentication** — Sign up with email, sign in, forgot password with OTP verification via email
- **CRUD Notes** — Create, read, update, and delete notes with title and content
- **Soft Delete & Trash** — Deleted notes go to trash and can be restored or permanently deleted
- **Tags & Filtering** — Add tags to notes and filter by tag with custom colors
- **Search** — Real-time search by title or content
- **Sort** — Sort notes by latest, earliest, A→Z, or Z→A
- **Dark / Light Mode** — Toggle between dark and light themes
- **Drag to Reorder** — Drag notes to rearrange their order
- **Animated UI** — Smooth transitions, sliding login panel, rabbit mascot

---

## Project Structure

```
Note-Your-Mind/
├── frontend/           # Vue 3 frontend
│   ├── src/
│   │   ├── App.vue         # Main notes application
│   │   ├── main.js         # Vue app entry point
│   │   └── views/
│   │       └── AuthPage.vue    # Login / Sign up page
│   ├── Dockerfile
│   └── nginx.conf
├── backend/            # Node.js backend
│   ├── server.js       # Express API routes
│   ├── db.js           # SQLite database setup
│   ├── notes.db        # SQLite database file
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Setup & Running the Application

### Option 1: Docker (Recommended)

**Prerequisites:** [Docker Desktop]

```bash
# Clone the repository
git clone https://github.com/vincenthue/note-your-mind.git
cd note-your-mind

# Build and run
docker-compose up --build
```

- Frontend: [https://noteyourmind.com](https://noteyourmind.com)
- Backend API: [https://note-your-mind-production.up.railway.app](https://note-your-mind-production.up.railway.app)

---

### Option 2: Manual Setup

**Prerequisites:** Node.js v18+

#### Backend
```bash
cd backend
npm install
node server.js
```
Server runs on `http://localhost:3000`

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5174`

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