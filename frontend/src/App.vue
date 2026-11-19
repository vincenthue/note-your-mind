<template>
  <div class="shell" :class="{ 'nav-open': navOpen }">

    <!-- ── Sidebar ── -->
    <aside class="side" aria-label="Navigation">
      <div class="side-brand">
        <span class="logo">
          <svg width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="5" fill="var(--accent)"/><path d="M6 6.5h8M6 10h8M6 13.5h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
        </span>
        <span class="side-name">Note Your Mind</span>
      </div>

      <label class="side-search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="M10.5 10.5L14 14"/></svg>
        <input ref="searchEl" v-model="search" type="search" placeholder="Search" aria-label="Search notes" @keydown.esc="search = ''; searchEl.blur()" />
        <span class="kbd">Ctrl K</span>
      </label>

      <nav class="side-nav">
        <button v-for="item in navItems" :key="item.id" class="nav-item" :class="{ on: view === item.id }" @click="go(item.id)">
          <span class="nav-icon" v-html="item.icon"></span>
          {{ item.label }}
          <span class="nav-count">{{ item.count }}</span>
        </button>
      </nav>

      <div v-if="allTags.length" class="side-section">
        <div class="side-label">Tags</div>
        <button v-for="t in allTags" :key="t.name" class="nav-item nav-tag" :class="{ on: activeTag === t.name }"
          @click="toggleTag(t.name)">
          <span class="tag-dot" :style="{ background: tagColor(t.name) }"></span>
          <span class="nav-tag-name">{{ t.name }}</span>
          <span class="nav-count">{{ t.count }}</span>
        </button>
      </div>

      <div class="side-foot">
        <div class="me">
          <span class="avatar">{{ (user?.username || '?').slice(0, 1).toUpperCase() }}</span>
          <div class="me-text">
            <div class="me-name">{{ user?.username }}</div>
            <div class="me-mail">{{ user?.email }}</div>
          </div>
        </div>
        <div class="side-foot-actions">
          <button class="btn btn-ghost btn-sm btn-icon" :title="isDark ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
            <svg v-if="isDark" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9"/></svg>
            <svg v-else width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Sign out" @click="signOut">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.5 8H6"/></svg>
          </button>
        </div>
      </div>
    </aside>
    <div class="scrim" @click="navOpen = false"></div>

    <!-- ── Main ── -->
    <main class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-icon menu-btn" aria-label="Open menu" @click="navOpen = true">
          <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h11"/></svg>
        </button>
        <h1 class="page-title">{{ pageTitle }}</h1>
        <span v-if="activeTag" class="tag filter-chip">
          <span class="tag-dot" :style="{ background: tagColor(activeTag) }"></span>{{ activeTag }}
          <button aria-label="Clear tag filter" @click="activeTag = null">×</button>
        </span>
        <span v-if="search" class="filter-note">“{{ search }}”</span>

        <div class="topbar-right">
          <div v-if="view === 'list'" class="sort" ref="sortWrap">
            <button class="btn btn-sm" @click="sortOpen = !sortOpen">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4.5 2.5v11M2 11l2.5 2.5L7 11M11.5 13.5v-11M9 5l2.5-2.5L14 5"/></svg>
              {{ sortOptions.find(o => o.value === sort).label }}
            </button>
            <Transition name="pop">
              <div v-if="sortOpen" class="menu menu-right">
                <button v-for="o in sortOptions" :key="o.value" class="menu-item" :class="{ on: sort === o.value }"
                  @click="sort = o.value; sortOpen = false">{{ o.label }}</button>
              </div>
            </Transition>
          </div>
          <button v-if="view !== 'trash'" class="btn btn-primary" title="New note (Alt+N)" @click="newNote">
            <svg width="13" height="13" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9"/></svg>
            <span class="hide-sm">New note</span>
          </button>
        </div>
      </header>

      <section class="content">
        <div v-if="loading" class="state"><span class="spinner"></span></div>

        <div v-else-if="loadError" class="state">
          <p class="state-title">Couldn’t load your notes</p>
          <p class="state-text">{{ loadError }}</p>
          <button class="btn" @click="loadAll">Try again</button>
        </div>

        <template v-else-if="view === 'day'">
          <div v-if="!visibleDayNotes.length && search" class="state">
            <p class="state-title">No matching notes</p>
            <p class="state-text">Try a different search.</p>
          </div>
          <div v-else-if="!dayNotes.length" class="state">
            <p class="state-title">No day notes yet</p>
            <p class="state-text">Plan a day hour by hour: Default setup, Assigned task and Venue for every time slot.</p>
            <button class="btn btn-primary" @click="openDayEditor(null)">New note</button>
          </div>
          <DayNoteList v-else :notes="visibleDayNotes" @open="openDayEditor" @create="openDayEditor(null)" />
        </template>

        <template v-else-if="view === 'board'">
          <KanbanBoard :notes="visibleNotes" @open="openEditor" @create="s => openEditor(null, s)"
            @move="moveNote" @quick-add="quickAdd" />
        </template>

        <template v-else-if="view === 'list'">
          <div v-if="!sortedNotes.length" class="state">
            <p class="state-title">{{ search || activeTag ? 'No matching notes' : 'No notes yet' }}</p>
            <p class="state-text">{{ search || activeTag ? 'Try a different search or tag.' : 'Capture your first idea — it’ll show up here and on the board.' }}</p>
            <button v-if="!search && !activeTag" class="btn btn-primary" @click="openEditor(null)">New note</button>
          </div>
          <NoteList v-else :notes="sortedNotes" @open="openEditor" @delete="trashNote" @cycle-status="cycleStatus" />
        </template>

        <template v-else>
          <div v-if="!visibleTrash.length" class="state">
            <p class="state-title">{{ search ? 'Nothing matches in trash' : 'Trash is empty' }}</p>
            <p class="state-text">Deleted notes stay here until you restore them or delete them forever.</p>
          </div>
          <template v-else>
            <div class="trash-bar">
              <span>{{ visibleTrash.length }} note{{ visibleTrash.length === 1 ? '' : 's' }} in trash</span>
              <button class="btn btn-danger btn-sm" @click="emptyTrash">Empty trash</button>
            </div>
            <NoteList :notes="visibleTrash" trash @restore="restoreNote" @purge="purgeNote" />
          </template>
        </template>
      </section>
    </main>

    <!-- ── Editor ── -->
    <Transition name="fade">
      <NoteEditor
        v-if="editor.open"
        :key="editor.key"
        :note="editor.note"
        :default-status="editor.status"
        :all-tags="allTags.map(t => t.name)"
        :on-save="saveNote"
        @close="editor.open = false"
        @delete="n => trashNote(n, true)"
      />
    </Transition>

    <Transition name="fade">
      <DayNoteEditor
        v-if="dayEditor.open"
        :key="dayEditor.key"
        :note="dayEditor.note"
        :on-save="saveDayNote"
        @close="dayEditor.open = false"
        @delete="deleteDayNote"
      />
    </Transition>

    <ConfirmDialog />

    <Transition name="pop">
      <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`" role="status">
        {{ toast.message }}
        <button v-if="toast.action" class="toast-action" @click="toast.action.run(); toast.show = false">{{ toast.action.label }}</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { api, errorMessage } from './api'
import { parseTags, tagColor, toPlainText, parseDate, STATUSES } from './utils'
import { confirmDialog, confirmState } from './confirm'
import KanbanBoard from './components/KanbanBoard.vue'
import NoteList from './components/NoteList.vue'
const NoteEditor = defineAsyncComponent(() => import('./components/NoteEditor.vue'))
import ConfirmDialog from './components/ConfirmDialog.vue'
import DayNoteList from './components/DayNoteList.vue'
import { allEntries } from './daynote'
const DayNoteEditor = defineAsyncComponent(() => import('./components/DayNoteEditor.vue'))

const props = defineProps({ user: Object })
const emit = defineEmits(['logout'])

// ── Persisted UI prefs ──
const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
}

// ── State ──
const notes = ref([])
const trash = ref([])
const loading = ref(true)
const loadError = ref('')
const dayNotes = ref([])
const view = ref(store.get('nym_view', 'day'))
const search = ref('')
const activeTag = ref(null)
const sort = ref(store.get('nym_sort', 'updated'))
const sortOpen = ref(false)
const navOpen = ref(false)
const searchEl = ref(null)
const sortWrap = ref(null)
const isDark = ref(store.get('notes_theme', 'dark') !== 'light')

watch(view, v => { store.set('nym_view', v); navOpen.value = false })
watch(sort, v => store.set('nym_sort', v))

function applyTheme() { document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light') }
function toggleTheme() { isDark.value = !isDark.value; store.set('notes_theme', isDark.value ? 'dark' : 'light'); applyTheme() }

// ── Toast ──
const toast = reactive({ show: false, message: '', type: 'ok', action: null })
let toastTimer
function notify(message, type = 'ok', action = null) {
  clearTimeout(toastTimer)
  Object.assign(toast, { show: true, message, type, action })
  toastTimer = setTimeout(() => (toast.show = false), action ? 5000 : 2600)
}

// ── Derived ──
function matches(n) {
  if (activeTag.value && !parseTags(n.tags).includes(activeTag.value)) return false
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return n.title.toLowerCase().includes(q) || toPlainText(n.content, 100000).toLowerCase().includes(q) ||
    parseTags(n.tags).some(t => t.toLowerCase().includes(q))
}
const visibleNotes = computed(() => notes.value.filter(matches))
const visibleTrash = computed(() => trash.value.filter(matches))
const visibleDayNotes = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return dayNotes.value
  return dayNotes.value.filter(n => n.title.toLowerCase().includes(q) ||
    allEntries(n.data).some(e => e.text.toLowerCase().includes(q)))
})

const sortOptions = [
  { value: 'updated', label: 'Last edited' },
  { value: 'created', label: 'Date created' },
  { value: 'az', label: 'Title A → Z' },
  { value: 'za', label: 'Title Z → A' },
]
const sortedNotes = computed(() => {
  const arr = [...visibleNotes.value]
  const t = (n, k) => parseDate(n[k])?.getTime() || 0
  if (sort.value === 'az') arr.sort((a, b) => a.title.localeCompare(b.title))
  else if (sort.value === 'za') arr.sort((a, b) => b.title.localeCompare(a.title))
  else if (sort.value === 'created') arr.sort((a, b) => t(b, 'created_at') - t(a, 'created_at'))
  else arr.sort((a, b) => t(b, 'updated_at') - t(a, 'updated_at'))
  return arr
})

const allTags = computed(() => {
  const counts = new Map()
  for (const n of notes.value) for (const t of parseTags(n.tags)) counts.set(t, (counts.get(t) || 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
})
watch(allTags, tags => { if (activeTag.value && !tags.some(t => t.name === activeTag.value)) activeTag.value = null })

const ICONS = {
  day: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4M5.5 9.5h1.5M5.5 11.8h1.5M9 9.5h1.5"/></svg>',
  board: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.8" y="2.5" width="3.6" height="11" rx="1"/><rect x="6.2" y="2.5" width="3.6" height="7.5" rx="1"/><rect x="10.6" y="2.5" width="3.6" height="9.5" rx="1"/></svg>',
  list: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.6" cy="4" r=".6" fill="currentColor"/><circle cx="2.6" cy="8" r=".6" fill="currentColor"/><circle cx="2.6" cy="12" r=".6" fill="currentColor"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.8h4V4M4 4l.7 9.2h6.6L12 4"/></svg>',
}
const navItems = computed(() => [
  { id: 'day', label: 'Day notes', icon: ICONS.day, count: dayNotes.value.length },
  { id: 'board', label: 'Board', icon: ICONS.board, count: notes.value.length },
  { id: 'list', label: 'All notes', icon: ICONS.list, count: notes.value.length },
  { id: 'trash', label: 'Trash', icon: ICONS.trash, count: trash.value.length || '' },
])
const pageTitle = computed(() => ({ day: 'Day notes', board: 'Board', list: 'All notes', trash: 'Trash' })[view.value])

function go(id) { view.value = id }
function toggleTag(t) { activeTag.value = activeTag.value === t ? null : t; navOpen.value = false }

// ── Data ──
async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [a, b, c] = await Promise.all([api.get('/api/notes'), api.get('/api/notes/trash'), api.get('/api/daynotes')])
    notes.value = a.data.data
    trash.value = b.data.data
    dayNotes.value = c.data.data
  } catch (err) {
    loadError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

function replaceNote(updated) {
  const i = notes.value.findIndex(n => n.id === updated.id)
  if (i === -1) notes.value = [updated, ...notes.value]
  else notes.value.splice(i, 1, updated)
}

// ── Editor ──
const editor = reactive({ open: false, note: null, status: 'todo', key: 0 })
function openEditor(note = null, status = 'todo') {
  Object.assign(editor, { open: true, note, status, key: editor.key + 1 })
}

async function saveNote(payload) {
  if (editor.note) {
    const { data } = await api.put(`/api/notes/${editor.note.id}`, payload)
    replaceNote(data.data)
    notify('Saved')
  } else {
    const { data } = await api.post('/api/notes', payload)
    replaceNote(data.data)
    notify('Note created')
  }
}

// ── Day notes ──
const dayEditor = reactive({ open: false, note: null, key: 0 })
function openDayEditor(note = null) {
  Object.assign(dayEditor, { open: true, note, key: dayEditor.key + 1 })
}
function newNote() {
  if (view.value === 'day') openDayEditor(null)
  else openEditor(null)
}

async function saveDayNote(payload) {
  const sortDays = list => list.sort((a, b) => b.day.localeCompare(a.day) || String(b.updated_at).localeCompare(String(a.updated_at)))
  if (dayEditor.note) {
    const { data } = await api.put(`/api/daynotes/${dayEditor.note.id}`, payload)
    dayNotes.value = sortDays(dayNotes.value.map(n => (n.id === data.data.id ? data.data : n)))
  } else {
    const { data } = await api.post('/api/daynotes', payload)
    dayNotes.value = sortDays([data.data, ...dayNotes.value])
  }
  notify(`Note saved — “${payload.title || 'Untitled day'}”`)
}

async function deleteDayNote(note) {
  const ok = await confirmDialog({ title: 'Delete this note?', message: `“${note.title}” and all its entries will be deleted. This can’t be undone.`, confirmText: 'Delete', danger: true })
  if (!ok) return
  try {
    await api.delete(`/api/daynotes/${note.id}`)
    dayNotes.value = dayNotes.value.filter(n => n.id !== note.id)
    dayEditor.open = false
    notify('Note deleted')
  } catch (err) { notify(errorMessage(err), 'err') }
}

async function quickAdd(status, title) {
  try {
    const { data } = await api.post('/api/notes', { title, status, content: '' })
    replaceNote(data.data)
  } catch (err) { notify(errorMessage(err), 'err') }
}

async function moveNote(note, status, position) {
  const before = { status: note.status, position: note.position }
  replaceNote({ ...note, status, position })
  try {
    await api.patch(`/api/notes/${note.id}/move`, { status, position })
  } catch (err) {
    replaceNote({ ...note, ...before })
    notify(errorMessage(err, 'Could not move card.'), 'err')
  }
}

async function cycleStatus(note) {
  const order = STATUSES.map(s => s.value)
  const next = order[(order.indexOf(note.status || 'todo') + 1) % order.length]
  const maxPos = Math.max(0, ...notes.value.filter(n => n.status === next).map(n => n.position))
  await moveNote(note, next, maxPos + 1)
}

async function trashNote(note, fromEditor = false) {
  try {
    await api.delete(`/api/notes/${note.id}`)
    notes.value = notes.value.filter(n => n.id !== note.id)
    trash.value = [{ ...note, deleted_at: new Date().toISOString() }, ...trash.value]
    if (fromEditor) editor.open = false
    notify(`“${note.title}” moved to trash`, 'ok', { label: 'Undo', run: () => restoreNote(note, true) })
  } catch (err) { notify(errorMessage(err), 'err') }
}

async function restoreNote(note, quiet = false) {
  try {
    const { data } = await api.put(`/api/notes/${note.id}/restore`)
    trash.value = trash.value.filter(n => n.id !== note.id)
    replaceNote(data.data)
    if (!quiet) notify('Note restored')
  } catch (err) { notify(errorMessage(err), 'err') }
}

async function purgeNote(note) {
  const ok = await confirmDialog({ title: 'Delete forever?', message: `“${note.title}” will be permanently deleted. This can’t be undone.`, confirmText: 'Delete forever', danger: true })
  if (!ok) return
  try {
    await api.delete(`/api/notes/${note.id}/permanent`)
    trash.value = trash.value.filter(n => n.id !== note.id)
    notify('Deleted forever')
  } catch (err) { notify(errorMessage(err), 'err') }
}

async function emptyTrash() {
  const items = [...visibleTrash.value]
  const ok = await confirmDialog({ title: `Empty trash?`, message: `${items.length} note${items.length === 1 ? '' : 's'} will be permanently deleted. This can’t be undone.`, confirmText: 'Empty trash', danger: true })
  if (!ok) return
  const results = await Promise.allSettled(items.map(n => api.delete(`/api/notes/${n.id}/permanent`)))
  const gone = new Set(items.filter((_, i) => results[i].status === 'fulfilled').map(n => n.id))
  trash.value = trash.value.filter(n => !gone.has(n.id))
  notify(gone.size === items.length ? 'Trash emptied' : 'Some notes could not be deleted', gone.size === items.length ? 'ok' : 'err')
}

async function signOut() {
  const ok = await confirmDialog({ title: 'Sign out?', confirmText: 'Sign out' })
  if (ok) emit('logout')
}

// ── Keyboard ──
function onKey(e) {
  if (confirmState.open || editor.open || dayEditor.open) return
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); searchEl.value?.focus() }
  else if ((e.altKey && e.key.toLowerCase() === 'n') || (mod && e.key.toLowerCase() === 'n' && !e.shiftKey)) {
    if (view.value !== 'trash') { e.preventDefault(); newNote() }
  }
}
function onDocClick(e) { if (sortWrap.value && !sortWrap.value.contains(e.target)) sortOpen.value = false }

onMounted(() => {
  applyTheme()
  loadAll()
  window.addEventListener('keydown', onKey)
  document.addEventListener('mousedown', onDocClick)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('mousedown', onDocClick)
})
</script>

<style scoped>
.shell { display: grid; grid-template-columns: 248px minmax(0, 1fr); height: 100vh; height: 100dvh; }

/* Sidebar */
.side {
  display: flex; flex-direction: column; gap: 4px; min-height: 0;
  background: var(--bg-sidebar); border-right: 1px solid var(--border);
  padding: 14px 10px 10px;
}
.side-brand { display: flex; align-items: center; gap: 10px; padding: 2px 8px 12px; }
.logo { display: grid; }
.side-name { font-weight: 650; font-size: 14px; letter-spacing: -0.01em; }
.side-search {
  display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px 0 10px; margin-bottom: 8px;
  border: 1px solid var(--border); border-radius: 8px; background: var(--bg-input); color: var(--text-3);
}
.side-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
.side-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font-size: 13px; color: var(--text); }
.side-search input::placeholder { color: var(--text-3); }
.side-search input::-webkit-search-cancel-button { display: none; }
.side-nav { display: flex; flex-direction: column; gap: 1px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  height: 32px; padding: 0 8px 0 10px; border: 0; border-radius: 7px; background: none;
  color: var(--text-2); font-size: 13.5px; font-weight: 500; text-align: left;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text); }
.nav-item.on { background: var(--bg-hover); color: var(--text); }
.nav-icon { display: grid; color: var(--text-3); }
.nav-item.on .nav-icon { color: var(--accent); }
.nav-count { margin-left: auto; font-size: 12px; color: var(--text-3); font-weight: 400; }
.side-section { margin-top: 14px; overflow-y: auto; min-height: 0; }
.side-label { font-size: 11.5px; font-weight: 600; color: var(--text-3); padding: 0 10px 4px; letter-spacing: .02em; }
.nav-tag { font-weight: 400; gap: 9px; padding-left: 14px; }
.nav-tag-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-foot { margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 4px; }
.me { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; padding: 4px 6px; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none;
  background: var(--accent-bg); color: var(--accent); font-weight: 650; font-size: 12.5px;
}
.me-text { min-width: 0; }
.me-name { font-size: 13px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.me-mail { font-size: 11.5px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-foot-actions { display: flex; }
.scrim { display: none; }

/* Main */
.main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.topbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  min-height: 56px; padding: 10px 24px; border-bottom: 1px solid var(--border);
}
.menu-btn { display: none; }
.page-title { margin: 0; font-size: 15px; font-weight: 600; }
.filter-chip { height: 24px; gap: 6px; padding-right: 4px; }
.filter-chip button { border: 0; background: none; color: var(--text-3); font-size: 15px; line-height: 1; padding: 0 3px; }
.filter-chip button:hover { color: var(--text); }
.filter-note { color: var(--text-3); font-size: 13px; }
.topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.sort { position: relative; }
.menu {
  position: absolute; top: calc(100% + 6px); z-index: 20; min-width: 170px; padding: 4px;
  background: var(--bg-elev); border-radius: 9px; box-shadow: var(--shadow);
}
.menu-right { right: 0; }
.menu-item {
  width: 100%; display: flex; align-items: center; height: 32px; padding: 0 10px;
  border: 0; border-radius: 6px; background: none; font-size: 13px; color: var(--text); text-align: left;
}
.menu-item:hover, .menu-item.on { background: var(--bg-hover); }

.content { flex: 1; min-height: 0; overflow: auto; padding: 18px 24px 20px; }
.content:has(.board) { overflow: hidden; display: flex; flex-direction: column; }
.content :deep(.board) { flex: 1; }

.state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 80px 16px; }
.state-title { margin: 0; font-size: 15px; font-weight: 600; }
.state-text { margin: 0 0 8px; color: var(--text-3); max-width: 360px; }
.spinner { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--accent); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.trash-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; color: var(--text-3); font-size: 13px; }

.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 300;
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border-radius: 10px; background: var(--bg-elev); box-shadow: var(--shadow);
  font-size: 13px; max-width: calc(100vw - 32px);
}
.toast--err { color: var(--danger); }
.toast-action { border: 0; background: none; color: var(--accent); font-weight: 600; padding: 0; }
.pop-enter-from.toast, .pop-leave-to.toast { transform: translate(-50%, 6px); }

@media (max-width: 860px) {
  .shell { grid-template-columns: minmax(0, 1fr); }
  .side {
    position: fixed; inset: 0 auto 0 0; width: 272px; z-index: 50;
    transform: translateX(-100%); transition: transform .2s ease;
  }
  .nav-open .side { transform: none; box-shadow: var(--shadow); }
  .nav-open .scrim { display: block; position: fixed; inset: 0; z-index: 40; background: var(--overlay); }
  .menu-btn { display: inline-flex; margin-left: -8px; }
  .topbar { padding: 10px 16px; }
  .content { padding: 14px 16px 16px; }
  .hide-sm { display: none; }
}
</style>
