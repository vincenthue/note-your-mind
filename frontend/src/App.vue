<template>
  <div class="app">

    <!-- ── Toast ── -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">
        <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '⚠' }}</span>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- ── Header ── -->
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-icon">✯</span>
          <h1 class="brand-title">Note Your Mind, {{ props.user?.username }}</h1>
          <button
            class="home-btn"
            :class="{ 'home-btn--active': !showTrash }"
            @click="showTrash = false; fetchNotes()"
            title="Back to notes"
          >
            <span class="home-btn-count">{{ notes.length }}</span>
          </button>
        </div>
        <div class="header-actions">
          <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
            <span v-if="isDark">☀️</span>
            <span v-else>🌙</span>
          </button>
          <button class="btn btn-ghost btn-sm" @click="confirmLogout" title="Logout">
            🚪 Logout
          </button>
          <button
            class="btn btn-ghost btn-sm"
            :class="{ active: showTrash }"
            @click="toggleTrash"
            title="Trash"
          >
            🗑 Trash
            <span v-if="trashNotes.length" class="trash-badge" :class="{ 'trash-badge--active': showTrash }">{{ trashNotes.length }}</span>
          </button>
          <button class="btn btn-primary" @click="openModal()" title="New note (Ctrl+N)">
            <span class="btn-icon">+</span> New Note
          </button>
        </div>
      </div>

      <!-- Search + Tag Filter -->
      <!-- Toolbar — always visible for layout consistency -->
      <div class="toolbar">
        <div class="search-wrap" :class="{ expanded: searchFocused || searchQuery || trashQuery }"
          @mouseenter="searchFocused = true"
          @mouseleave="searchFocused = searchQuery !== '' || trashQuery !== ''"
        >
          <span class="search-icon">⌕</span>
          <input
            v-if="!showTrash"
            v-model="searchQuery"
            class="search-input"
            type="text"
            :placeholder="searchFocused || searchQuery ? 'Search notes . . . ( title or content )' : 'Search notes.'"
            @input="onSearchInput"
          />
          <input
            v-else
            v-model="trashQuery"
            class="search-input"
            type="text"
            :placeholder="searchFocused || trashQuery ? 'Search notes . . . ( title or content )' : 'Search notes.'"
          />
          <button
            v-if="showTrash ? trashQuery : searchQuery"
            class="search-clear"
            @click="showTrash ? trashQuery = '' : (searchQuery = '', fetchNotes())"
          >✕</button>
        </div>
        <div class="tags-bar tags-bar--spacer" v-if="showTrash">
          <!-- spacer to match notes page toolbar height -->
        </div>
        <div class="tags-bar" v-if="!showTrash">
          <template v-if="allTags.length">
            <button class="tag-pill" :class="{ active: !activeTag }" @click="setTag(null)">All</button>
            <button
              v-for="tag in allTags" :key="tag"
              class="tag-pill"
              :class="{ active: activeTag === tag }"
              :style="getTagPillStyle(tag)"
              @click="setTag(tag)"
            >{{ tag }}</button>
          </template>

          <!-- Sort button — pushed to far right -->
          <div class="sort-wrap">
            <button class="sort-btn" @click="showSortMenu = !showSortMenu" title="Sort notes">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="3" x2="12" y2="10"/>
                <polyline points="9 6 12 3 15 6"/>
                <line x1="12" y1="21" x2="12" y2="14"/>
                <polyline points="15 18 12 21 9 18"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="showSortMenu" class="sort-menu">
                <button
                  v-for="opt in sortOptions" :key="opt.value"
                  class="sort-option"
                  :class="{ active: sortOrder === opt.value }"
                  @click="setSortOrder(opt.value)"
                >
                  <span class="sort-option-icon">{{ opt.icon }}</span>
                  {{ opt.label }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Main ── -->
    <main class="main">

      <!-- Loading skeleton -->
      <div v-if="loading" class="skeleton-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-body"></div>
          <div class="skeleton-line skeleton-body short"></div>
          <div class="skeleton-footer">
            <div class="skeleton-line skeleton-tag"></div>
            <div class="skeleton-line skeleton-tag"></div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state-box">
        <span class="state-icon">⚠</span>
        <p class="state-title">{{ error }}</p>
        <button class="btn btn-ghost" @click="fetchNotes">Try Again</button>
      </div>

      <!-- ── Rabbit — always bottom-right corner ── -->
      <div class="rabbit-corner" v-show="filteredNotes.length > 0" @click="cycleRabbitMsg" title="Click me!">
        <Transition name="bubble">
          <div v-if="rabbitMsg" class="rabbit-bubble">{{ rabbitMsg }}</div>
        </Transition>
        <svg id="shiba-dog-corner" width="90" height="110" viewBox="0 0 200 240"
                 xmlns="http://www.w3.org/2000/svg">
              <!-- Long ears -->
              <ellipse cx="72"  cy="38" rx="16" ry="44" fill="#6B5BD6"/>
              <ellipse cx="72"  cy="40" rx="8"  ry="34" fill="#C084FC" opacity="0.6"/>
              <ellipse cx="128" cy="38" rx="16" ry="44" fill="#6B5BD6"/>
              <ellipse cx="128" cy="40" rx="8"  ry="34" fill="#C084FC" opacity="0.6"/>
              <!-- Body -->
              <ellipse cx="100" cy="178" rx="50" ry="42" fill="#7C6AE8"/>
              <ellipse cx="100" cy="185" rx="30" ry="28" fill="#C4BCFA"/>
              <!-- Fluffy tail -->
              <circle cx="152" cy="188" r="14" fill="#A78BFA"/>
              <circle cx="152" cy="188" r="9"  fill="#C4BCFA" opacity="0.7"/>
              <!-- Neck + collar -->
              <rect x="82" y="128" width="36" height="18" rx="9" fill="#7C6AE8"/>
              <rect x="76" y="134" width="48" height="10" rx="5" fill="#312E81"/>
              <ellipse cx="100" cy="148" rx="8" ry="6" fill="#818CF8"/>
              <ellipse cx="100" cy="148" rx="4" ry="3" fill="#312E81"/>
              <!-- Head -->
              <ellipse cx="100" cy="104" rx="46" ry="42" fill="#8B7CF0"/>
              <ellipse cx="86"  cy="88"  rx="26" ry="16" fill="#A78BFA" opacity="0.35"/>
              <!-- Snout -->
              <ellipse cx="100" cy="120" rx="24" ry="16" fill="#C4BCFA"/>
              <ellipse cx="100" cy="113" rx="7"  ry="5"  fill="#4C1D95"/>
              <path d="M100 118 L100 124" stroke="#4C1D95" stroke-width="2" stroke-linecap="round" fill="none"/>
              <path d="M100 124 Q94 130 90 126"  stroke="#4C1D95" stroke-width="2" stroke-linecap="round" fill="none"/>
              <path d="M100 124 Q106 130 110 126" stroke="#4C1D95" stroke-width="2" stroke-linecap="round" fill="none"/>
              <ellipse cx="70"  cy="118" rx="9" ry="5" fill="#F87171" opacity="0.3"/>
              <ellipse cx="130" cy="118" rx="9" ry="5" fill="#F87171" opacity="0.3"/>
              <!-- Eyes -->
              <ellipse cx="80"  cy="100" rx="13" ry="14" fill="white"/>
              <ellipse cx="120" cy="100" rx="13" ry="14" fill="white"/>
              <circle class="iris-left-s"   cx="80"  cy="100" r="9"  fill="#1E1B4B"/>
              <circle class="iris-right-s"  cx="120" cy="100" r="9"  fill="#1E1B4B"/>
              <circle class="pupil-left-s"  cx="80"  cy="100" r="5"  fill="#0F0E1F"/>
              <circle class="pupil-right-s" cx="120" cy="100" r="5"  fill="#0F0E1F"/>
              <circle cx="83"  cy="95" r="3.5" fill="white"/>
              <circle cx="123" cy="95" r="3.5" fill="white"/>
              <!-- Feet -->
              <ellipse cx="74"  cy="218" rx="20" ry="11" fill="#6B5BD6"/>
              <ellipse cx="126" cy="218" rx="20" ry="11" fill="#6B5BD6"/>
              <!-- Arms -->
              <ellipse cx="56"  cy="170" rx="13" ry="9" fill="#7C6AE8" transform="rotate(-30 56 170)"/>
              <ellipse cx="144" cy="170" rx="13" ry="9" fill="#7C6AE8" transform="rotate(30 144 170)"/>
            </svg>
        <p class="dog-sidebar-label">Click me!</p>
      </div>

      <!-- Trash view -->
      <Transition :name="trashTransition" mode="out-in">
        <div v-if="showTrash" key="trash">
          <div v-if="filteredTrash.length === 0" class="state-box">
            <span class="state-icon">🗑</span>
            <p class="state-title">{{ trashQuery ? 'No matching notes in trash' : 'Trash is empty' }}</p>
            <p class="state-text">{{ trashQuery ? 'Try a different search.' : 'Deleted notes appear here and can be restored.' }}</p>
          </div>
          <div v-else>
            <p class="trash-hint">Notes in trash can be restored or permanently deleted.</p>
            <div class="notes-grid">
              <article v-for="note in filteredTrash" :key="note.id" class="note-card note-card--trash">
                <div class="note-card-body">
                  <h2 class="note-title">{{ note.title }}</h2>
                  <p class="note-content">{{ note.content || 'No content.' }}</p>
                </div>
                <div class="note-card-footer">
                  <time class="note-time">Deleted {{ formatDate(note.deleted_at) }}</time>
                  <div class="note-actions">
                    <button class="btn btn-ghost btn-sm" @click="restoreNote(note)">↩ Restore</button>
                    <button class="btn btn-danger btn-sm" @click="permanentDelete(note)">Delete Forever</button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Notes view -->
      <Transition :name="notesTransition" mode="out-in">
        <div v-if="!showTrash" key="notes">

          <!-- Empty state: rabbit + message -->
          <div v-if="filteredNotes.length === 0" class="state-box">
            <template v-if="searchQuery || activeTag">
              <span class="state-icon">📋</span>
              <p class="state-title">No matching notes</p>
              <p class="state-text">Try a different search or tag.</p>
            </template>
            <template v-else>
              <p class="dog-message">Your thoughts deserve a home — start writing ✯</p>
              <div class="dog-container">
                <svg id="shiba-dog" width="210" height="250" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="100" cy="232" rx="44" ry="7" fill="#312E81" opacity="0.2"/>
                  <ellipse cx="72"  cy="38" rx="16" ry="44" fill="#6B5BD6"/>
                  <ellipse cx="72"  cy="40" rx="8"  ry="34" fill="#C084FC" opacity="0.6"/>
                  <ellipse cx="128" cy="38" rx="16" ry="44" fill="#6B5BD6"/>
                  <ellipse cx="128" cy="40" rx="8"  ry="34" fill="#C084FC" opacity="0.6"/>
                  <ellipse cx="100" cy="178" rx="50" ry="42" fill="#7C6AE8"/>
                  <ellipse cx="100" cy="185" rx="30" ry="28" fill="#C4BCFA"/>
                  <ellipse cx="84" cy="158" rx="18" ry="14" fill="#A78BFA" opacity="0.3"/>
                  <circle cx="152" cy="188" r="14" fill="#A78BFA"/>
                  <circle cx="152" cy="188" r="9"  fill="#C4BCFA" opacity="0.7"/>
                  <rect x="82" y="128" width="36" height="18" rx="9" fill="#7C6AE8"/>
                  <rect x="76" y="134" width="48" height="10" rx="5" fill="#312E81"/>
                  <ellipse cx="100" cy="148" rx="9" ry="7" fill="#818CF8"/>
                  <ellipse cx="100" cy="148" rx="5" ry="3.5" fill="#312E81"/>
                  <ellipse cx="100" cy="104" rx="46" ry="42" fill="#8B7CF0"/>
                  <ellipse cx="86"  cy="88"  rx="26" ry="16" fill="#A78BFA" opacity="0.35"/>
                  <ellipse cx="100" cy="120" rx="24" ry="16" fill="#C4BCFA"/>
                  <ellipse cx="100" cy="113" rx="7"  ry="5"  fill="#4C1D95"/>
                  <path d="M100 118 L100 124" stroke="#4C1D95" stroke-width="2" stroke-linecap="round" fill="none"/>
                  <path d="M100 124 Q94 130 90 126"  stroke="#4C1D95" stroke-width="2" stroke-linecap="round" fill="none"/>
                  <path d="M100 124 Q106 130 110 126" stroke="#4C1D95" stroke-width="2" stroke-linecap="round" fill="none"/>
                  <ellipse cx="70"  cy="118" rx="9" ry="5" fill="#F87171" opacity="0.3"/>
                  <ellipse cx="130" cy="118" rx="9" ry="5" fill="#F87171" opacity="0.3"/>
                  <ellipse cx="80"  cy="100" rx="13" ry="14" fill="white"/>
                  <ellipse cx="120" cy="100" rx="13" ry="14" fill="white"/>
                  <circle class="iris-left"  cx="80"  cy="100" r="9"  fill="#1E1B4B"/>
                  <circle class="iris-right" cx="120" cy="100" r="9"  fill="#1E1B4B"/>
                  <circle class="pupil-left"  cx="80"  cy="100" r="5" fill="#0F0E1F"/>
                  <circle class="pupil-right" cx="120" cy="100" r="5" fill="#0F0E1F"/>
                  <circle cx="83"  cy="95" r="3.5" fill="white"/>
                  <circle cx="123" cy="95" r="3.5" fill="white"/>
                  <ellipse cx="74"  cy="218" rx="20" ry="11" fill="#6B5BD6"/>
                  <ellipse cx="126" cy="218" rx="20" ry="11" fill="#6B5BD6"/>
                  <ellipse cx="56"  cy="170" rx="13" ry="9" fill="#7C6AE8" transform="rotate(-30 56 170)"/>
                  <ellipse cx="144" cy="170" rx="13" ry="9" fill="#7C6AE8" transform="rotate(30 144 170)"/>
                </svg>
              </div>
              <button class="btn btn-primary btn-lg" @click="openModal()">
                <span class="btn-icon">+</span> Create your first note
              </button>
            </template>
          </div>

          <!-- Notes grid (full width, no sidebar) -->
          <Transition :name="tagTransition" mode="out-in">
            <div :key="activeTag ?? '__all__'" class="notes-grid-wrap">
              <div v-if="filteredNotes.length === 0 && (searchQuery || activeTag)" class="state-box" style="min-height:200px">
                <span class="state-icon">📋</span>
                <p class="state-title">No matching notes</p>
                <p class="state-text">Try a different search or tag.</p>
              </div>
              <div v-else-if="filteredNotes.length > 0" class="notes-grid">
                <article
                  v-for="(note, index) in displayNotes" :key="note.id"
                  class="note-card"
                  :class="{
                    'note-card--dragging': dragIndex === index,
                    'note-card--dragover': dragOverIndex === index && dragOverIndex !== dragIndex
                  }"
                  draggable="true"
                  @dragstart="onDragStart(index, $event)"
                  @dragover.prevent="onDragOver(index)"
                  @dragend="onDragEnd"
                  @drop.prevent="onDrop(index)"
                  @click="openModal(note)"
                >
                  <div class="drag-handle" @click.stop title="Drag to reorder">⠿</div>
                  <div class="note-card-body">
                    <h2 class="note-title">{{ note.title }}</h2>
                    <p class="note-content">{{ stripMarkdown(note.content) || 'No content.' }}</p>
                    <div class="note-tags" v-if="parseTags(note.tags).length">
                      <span v-for="tag in parseTags(note.tags)" :key="tag" class="tag-chip" :style="getTagStyle(tag)">{{ tag }}</span>
                    </div>
                  </div>
                  <div class="note-card-footer" @click.stop>
                    <time class="note-time">{{ formatDate(note.updated_at) }}</time>
                    <div class="note-actions">
                      <button class="btn btn-ghost btn-sm" @click.stop="openModal(note)">Edit</button>
                      <button class="btn btn-danger btn-sm" @click.stop="softDelete(note)">Delete</button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </Transition>

        </div>
      </Transition>
    </main>

    <!-- ── Modal ── -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <Transition name="slide-up">
          <div v-if="showModal" class="modal">

            <div class="modal-header">
              <h2 class="modal-title">{{ editingNote ? 'Edit Note' : 'New Note' }}</h2>
              <div class="modal-header-right">
                <button class="btn btn-ghost btn-sm" @click="previewMode = !previewMode">
                  {{ previewMode ? '✏ Edit' : '👁 Preview' }}
                </button>
                <button class="modal-close" @click="closeModal">✕</button>
              </div>
            </div>

            <div class="modal-body">
              <div v-if="formError" class="form-error">⚠ {{ formError }}</div>

              <template v-if="!previewMode">
                <div class="form-field">
                  <label class="form-label" for="note-title">Title <span class="required">*</span></label>
                  <input
                    id="note-title"
                    v-model.trim="form.title"
                    class="form-input"
                    :class="{ 'is-error': formError && !form.title }"
                    type="text"
                    placeholder="Give your note a title…"
                    @keydown.ctrl.s.prevent="manualSave"
                  />
                </div>

                <div class="form-field">
                  <label class="form-label" for="note-tags">
                    Tags <span class="form-hint"> e.g. school, personal, work, ...</span>
                  </label>
                  <input
                    id="note-tags"
                    v-model="form.tags"
                    class="form-input"
                    type="text"
                    placeholder="work, personal, ideas…"
                  />
                  <div class="tag-preview" v-if="parseTags(form.tags).length">
                    <label
                      v-for="t in parseTags(form.tags)" :key="t"
                      class="tag-chip-editable"
                      :title="`Pick color for '${t}'`"
                    >
                      <span class="tag-chip" :style="getTagStyle(t)">{{ t }}</span>
                      <span class="tag-chip-pick">🎨</span>
                      <input type="color" :value="tagColors[t] || '#6366F1'" @input="e => setTagColor(t, e.target.value)"/>
                    </label>
                  </div>
                </div>

                <div class="form-field">
                  <label class="form-label" for="note-content">
                    Content <span class="required">*</span>
                    <span class="form-hint">What's on your mind?</span>
                  </label>
                  <textarea
                    id="note-content"
                    v-model="form.content"
                    class="form-textarea"
                    :class="{ 'is-error': formError && !form.content.trim() }"
                    placeholder="Write something…"
                    rows="10"
                    @keydown.ctrl.s.prevent="manualSave"
                  ></textarea>
                </div>
              </template>

              <!-- Markdown Preview -->
              <div v-else class="markdown-preview">
                <h1 class="preview-title">{{ form.title || 'Untitled' }}</h1>
                <div class="tag-preview" v-if="parseTags(form.tags).length">
                  <span v-for="t in parseTags(form.tags)" :key="t" class="tag-chip" :style="getTagStyle(t)">{{ t }}</span>
                </div>
                <div class="md-body" v-html="renderedMarkdown"></div>
              </div>
            </div>

            <div class="modal-footer">
              <span class="shortcut-hint">Ctrl+S to save • Ctrl+N new note • Esc to close</span>
              <button class="btn btn-ghost" @click="closeModal" :disabled="submitting">Cancel</button>
              <button class="btn btn-primary" @click="manualSave" :disabled="submitting">
                <span v-if="submitting" class="spinner spinner-sm"></span>
                {{ editingNote ? 'Save Changes' : 'Create Note' }}
              </button>
            </div>

            <!-- Unsaved changes overlay -->
            <Transition name="unsaved-fade">
              <div v-if="showUnsavedDialog" class="unsaved-overlay">
                <div class="unsaved-dialog">
                  <div class="unsaved-icon">⚠️</div>
                  <p class="unsaved-title">Unsaved Changes</p>
                  <p class="unsaved-text">You have unsaved changes. Leave without saving?</p>
                  <div class="unsaved-actions">
                    <button class="btn btn-ghost" @click="showUnsavedDialog = false">Stay &amp; Keep Editing</button>
                    <button class="btn btn-danger" @click="forceCloseModal">Leave Without Saving</button>
                  </div>
                </div>
              </div>
            </Transition>

          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { marked } from 'marked'

const props  = defineProps({ user: Object })
const emit   = defineEmits(['logout'])
const api    = axios.create({ baseURL: 'https://note-your-mind-production.up.railway.app' })
const userId = () => props.user?.id || 0

// ── State ──
const notes       = ref([])
const trashNotes  = ref([])
const allTags     = ref([])
const loading     = ref(false)
const error       = ref(null)
const showModal   = ref(false)
const showTrash   = ref(false)
const submitting  = ref(false)
const previewMode = ref(false)
const formError   = ref('')
const editingNote = ref(null)
const searchQuery  = ref('')
const trashQuery   = ref('')
const searchFocused = ref(false)
const activeTag   = ref(null)
const isDark = ref(localStorage.getItem('notes_theme') !== 'light')

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('notes_theme', isDark.value ? 'dark' : 'light')
  applyTheme(isDark.value)
}

const form = reactive({ title: '', content: '', tags: '' })

//── Logout confirmation ──
function confirmLogout() {
  if (confirm('Are you sure you want to logout?')) {
    emit('logout')
  }
}

// ── Toast ──
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  Object.assign(toast, { message, type, show: true })
  toastTimer = setTimeout(() => (toast.show = false), 2800)
}

// ── Computed ──
const filteredNotes = computed(() => notes.value)

// Sort
const showSortMenu = ref(false)
const sortOrder    = ref('latest') // 'latest' | 'earliest' | 'az' | 'za'
const sortOptions  = [
  { value: 'latest',   label: 'Latest to Earliest', icon: '🕐' },
  { value: 'earliest', label: 'Earliest to Latest', icon: '🕑' },
  { value: 'az',       label: 'A → Z',              icon: '↑' },
  { value: 'za',       label: 'Z → A',              icon: '↓' },
]
function setSortOrder(val) {
  sortOrder.value = val
  showSortMenu.value = false
}

// Close sort menu when clicking outside
function onDocClick(e) {
  const wrap = document.querySelector('.sort-wrap')
  if (wrap && !wrap.contains(e.target)) showSortMenu.value = false
}

const filteredTrash = computed(() => {
  if (!trashQuery.value.trim()) return trashNotes.value
  const q = trashQuery.value.toLowerCase()
  return trashNotes.value.filter(n =>
    n.title.toLowerCase().includes(q) ||
    (n.content || '').toLowerCase().includes(q)
  )
})

// displayNotes is a local reorderable copy of notes, with sort applied
const displayNotes = ref([])
watch([notes, sortOrder], ([newNotes]) => {
  let arr = [...newNotes]
  if (sortOrder.value === 'az') {
    arr.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortOrder.value === 'za') {
    arr.sort((a, b) => b.title.localeCompare(a.title))
  } else if (sortOrder.value === 'earliest') {
    arr.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
  } else {
    // latest (default — server already returns newest first, but re-sort to be safe)
    arr.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }
  displayNotes.value = arr
}, { immediate: true })

// ── Drag-to-reorder ──
const dragIndex     = ref(null)
const dragOverIndex = ref(null)

function onDragStart(index, e) {
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
}
function onDragOver(index) {
  dragOverIndex.value = index
}
function onDrop(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const arr = [...displayNotes.value]
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(index, 0, moved)
  displayNotes.value = arr
  dragIndex.value = null
  dragOverIndex.value = null
}
function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

const renderedMarkdown = computed(() => {
  if (!form.content) return '<p style="color:var(--text-mute,#2d6a44)">Nothing written yet…</p>'
  return marked.parse(form.content)
})

// ── Manual save ──
async function manualSave() {
  formError.value = ''
  if (!form.title) { formError.value = 'Title is required.'; return }
  if (!form.content.trim()) { formError.value = 'Content is required.'; return }
  submitting.value = true
  try {
    if (editingNote.value) {
      const { data } = await api.put(`/api/notes/${editingNote.value.id}`, {
        title: form.title, content: form.content, tags: normalizeTags(form.tags),
      })
      const idx = notes.value.findIndex(n => n.id === editingNote.value.id)
      if (idx !== -1) {
        const updated = [...notes.value]
        updated[idx] = data.data
        notes.value = updated
      }
      showToast(`✏️ "${form.title}" updated successfully!`, 'success')
    } else {
      const { data } = await api.post('/api/notes', {
        title: form.title, content: form.content, tags: normalizeTags(form.tags), user_id: userId(),
      })
      notes.value = [data.data, ...notes.value]
      showToast(`📝 "${form.title}" created!`, 'success')
    }
    await fetchTags()
    forceCloseModal()
  } catch (err) {
    const msg = err.response?.data?.message || 'Something went wrong.'
    formError.value = msg
    showToast(`❌ Failed to save — ${msg}`, 'error')
  } finally {
    submitting.value = false
  }
}

// ── Fetch ──
async function fetchNotes() {
  loading.value = true; error.value = null
  try {
    const params = { user_id: userId() }
    if (searchQuery.value) params.q = searchQuery.value
    if (activeTag.value)   params.tag = activeTag.value
    const { data } = await api.get('/api/notes', { params })
    notes.value = data.data
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load. Is the server running?'
  } finally {
    loading.value = false
  }
}

async function fetchTrash() {
  const { data } = await api.get('/api/notes/trash', { params: { user_id: userId() } })
  trashNotes.value = data.data
}

async function fetchTags() {
  const { data } = await api.get('/api/notes/tags', { params: { user_id: userId() } })
  allTags.value = data.data
}

// ── Search debounce ──
let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchNotes, 350)
}

function setTag(tag) {
  // zoom-out when leaving (going to filtered), zoom-in when returning to All
  tagTransition.value = tag ? 'tag-zoom-in' : 'tag-zoom-out'
  activeTag.value = tag
  fetchNotes()
}

// ── Trash ──
const trashTransition  = ref('fade-up')
const notesTransition  = ref('fade-down')
const tagTransition    = ref('tag-zoom-in')

async function toggleTrash() {
  if (!showTrash.value) {
    // going INTO trash: notes fade-out-up, trash fade-in-up
    trashTransition.value  = 'view-up'
    notesTransition.value  = 'view-up'
  } else {
    // going BACK to notes: trash fade-out-down, notes fade-in-down
    trashTransition.value  = 'view-down'
    notesTransition.value  = 'view-down'
  }
  showTrash.value = !showTrash.value
  if (showTrash.value) { trashQuery.value = ''; fetchTrash() }
}

async function softDelete(note) {
  if (!confirm(`Move "${note.title}" to trash?`)) return
  await api.delete(`/api/notes/${note.id}`)
  notes.value = notes.value.filter(n => n.id !== note.id)
  await fetchTags()
  showToast('Moved to trash')
}

async function restoreNote(note) {
  await api.put(`/api/notes/${note.id}/restore`)
  trashNotes.value = trashNotes.value.filter(n => n.id !== note.id)
  await fetchNotes(); await fetchTags()
  showToast('Note restored')
}

async function permanentDelete(note) {
  if (!confirm(`Permanently delete "${note.title}"? This cannot be undone.`)) return
  await api.delete(`/api/notes/${note.id}/permanent`)
  trashNotes.value = trashNotes.value.filter(n => n.id !== note.id)
  showToast('Permanently deleted', 'error')
}

// ── Modal ──
const showUnsavedDialog = ref(false)
const originalForm = reactive({ title: '', content: '', tags: '' })
const isDirty = computed(() =>
  editingNote.value !== null && (
    form.title   !== originalForm.title ||
    form.content !== originalForm.content ||
    form.tags    !== originalForm.tags
  )
)

function openModal(note = null) {
  editingNote.value = note
  form.title   = note?.title   ?? ''
  form.content = note?.content ?? ''
  form.tags    = note?.tags    ?? ''
  originalForm.title   = form.title
  originalForm.content = form.content
  originalForm.tags    = form.tags
  formError.value   = ''
  previewMode.value = false
  showUnsavedDialog.value = false
  showModal.value   = true
}

function closeModal() {
  if (isDirty.value) { showUnsavedDialog.value = true; return }
  forceCloseModal()
}

function forceCloseModal() {
  showModal.value = false
  showUnsavedDialog.value = false
  editingNote.value = null
}

// ── Rabbit click messages ──
const RABBIT_MSGS = [
  '(˶˃ ᵕ ˂˶)', 'Write more! ✍️', 'You got this! 💪',
  'Notes = memories 🌙', 'Hello there! 👋', 'Keep it up! ⭐',
  'I believe in you! 🥕', 'One note at a time 🐾', '...boing! 🐇',
  'Stay focused! 🎯', 'Great work! 🎉',
]
const rabbitMsg = ref('')
let rabbitMsgTimer = null
let lastRabbitIdx = -1
function cycleRabbitMsg() {
  clearTimeout(rabbitMsgTimer)
  let idx
  do { idx = Math.floor(Math.random() * RABBIT_MSGS.length) } while (idx === lastRabbitIdx)
  lastRabbitIdx = idx
  rabbitMsg.value = RABBIT_MSGS[idx]
  rabbitMsgTimer = setTimeout(() => (rabbitMsg.value = ''), 2200)
}

// ── Tag colors ──
const TAG_COLOR_STORAGE_KEY = 'notes_tag_colors'
const tagColors = reactive(JSON.parse(localStorage.getItem(TAG_COLOR_STORAGE_KEY) || '{}'))

function setTagColor(tag, color) {
  tagColors[tag] = color
  localStorage.setItem(TAG_COLOR_STORAGE_KEY, JSON.stringify({ ...tagColors }))
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

function getTagStyle(tag) {
  const color = tagColors[tag] || '#6366F1'
  const rgb = hexToRgb(color)
  return {
    background: `rgba(${rgb},0.15)`,
    color: color,
    borderColor: `rgba(${rgb},0.3)`,
  }
}

function getTagPillStyle(tag) {
  const color = tagColors[tag] || '#6366F1'
  const rgb = hexToRgb(color)
  return {
    '--pill-color': color,
    '--pill-rgb': rgb,
  }
}

// ── Dog eye tracking ──
function moveDogEyes(e) {
  const dogIds = [
    {
      svgId: 'shiba-dog',
      iris: ['.iris-left', '.iris-right'],
      pupil: ['.pupil-left', '.pupil-right'],
      centers: [{ x: 80, y: 100 }, { x: 120, y: 100 }],
    },
    {
      svgId: 'shiba-dog-corner',
      iris: ['.iris-left-s', '.iris-right-s'],
      pupil: ['.pupil-left-s', '.pupil-right-s'],
      centers: [{ x: 80, y: 100 }, { x: 120, y: 100 }],
    },
  ]

  dogIds.forEach(({ svgId, iris, pupil, centers }) => {
    const svg = document.getElementById(svgId)
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height * 0.45
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / dist
    const ny = dy / dist

    centers.forEach((c, i) => {
      const iEl = svg.querySelector(iris[i])
      const pEl = svg.querySelector(pupil[i])
      if (!iEl || !pEl) return
      iEl.setAttribute('cx', c.x + nx * 4)
      iEl.setAttribute('cy', c.y + ny * 4)
      pEl.setAttribute('cx', c.x + nx * 3)
      pEl.setAttribute('cy', c.y + ny * 3)
    })
  })
}

// ── Keyboard shortcuts ──
function onKeydown(e) {
  if (e.ctrlKey && e.key === 'n' && !showModal.value) { e.preventDefault(); openModal() }
  if (e.key === 'Escape' && showModal.value) closeModal()
}

// ── Helpers ──
function parseTags(raw) { return raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : [] }
function normalizeTags(raw) { return parseTags(raw).join(',') }
function stripMarkdown(md) {
  if (!md) return ''
  return md.replace(/[#*`_~>\[\]()!]/g, '').replace(/\n+/g, ' ').trim().slice(0, 160)
}
function formatDate(raw) {
  if (!raw) return ''
  return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(() => {
  applyTheme(isDark.value)
  fetchNotes()
  fetchTags()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mousemove', moveDogEyes)
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousemove', moveDogEyes)
  document.removeEventListener('click', onDocClick)
})
</script>

<style>
/* ── CSS Variables ── */
/* ══════════════════════════════════════════
   THEME TOKENS — dark (default) & light
══════════════════════════════════════════ */
html[data-theme="dark"], :root {
  --bg-page:    #08061A;
  --bg-card:    #100D2A;
  --bg-card2:   #14103A;
  --bg-input:   #080618;
  --border-c:   rgba(99,102,241,0.22);
  --border-h:   rgba(139,92,246,0.45);
  --accent:     #818CF8;
  --accent-sat: #6366F1;
  --accent-dim: rgba(99,102,241,0.14);
  --accent-mid: rgba(99,102,241,0.25);
  --text-1:     #EDE9FE;
  --text-2:     #A5B4FC;
  --text-3:     #C4B5FD;
  --text-mute:  #4C4A7E;
  --header-bg:  rgba(8,6,26,0.90);
  --overlay-bg: rgba(2,1,12,0.80);
  --shadow:     rgba(0,0,0,0.55);
  --btn-primary-bg:   linear-gradient(135deg, #6366F1, #8B5CF6);
  --btn-primary-text: #fff;
  --toast-success-bg: #1a1050; --toast-success-c: #A5B4FC; --toast-success-b: rgba(99,102,241,0.3);
  --toast-error-bg:   #2d0a0a; --toast-error-c: #FCA5A5;   --toast-error-b:   rgba(239,68,68,0.3);
}

html[data-theme="light"] {
  --bg-page:    #EEF2FF;
  --bg-card:    rgba(255,255,255,0.72);
  --bg-card2:   rgba(224,231,255,0.6);
  --bg-input:   rgba(255,255,255,0.85);
  --border-c:   rgba(148,163,255,0.25);
  --border-h:   rgba(99,102,241,0.45);
  --accent:     #4F46E5;
  --accent-sat: #4338CA;
  --accent-dim: rgba(99,102,241,0.1);
  --accent-mid: rgba(99,102,241,0.18);
  --text-1:     #1E1B4B;
  --text-2:     #3730A3;
  --text-3:     #6366F1;
  --text-mute:  #818CF8;
  --header-bg:  rgba(224,231,255,0.75);
  --overlay-bg: rgba(30,27,75,0.45);
  --shadow:     rgba(99,102,241,0.1);
  --btn-primary-bg:   linear-gradient(135deg, #6366F1, #8B5CF6);
  --btn-primary-text: #fff;
  --toast-success-bg: rgba(224,231,255,0.95); --toast-success-c: #3730A3; --toast-success-b: rgba(99,102,241,0.2);
  --toast-error-bg:   rgba(254,226,226,0.95); --toast-error-c: #DC2626;   --toast-error-b:   rgba(239,68,68,0.25);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #app {
  min-height: 100vh;
  color: var(--text-1);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 15px; line-height: 1.6;
}

/* Background: 4 corners dark, centre lighter — applied to html so it fills full viewport */
html {
  min-height: 100%;
  background-attachment: fixed;
}
body { margin: 0; min-height: 100vh; }
#app, .app { min-height: 100vh; position: relative; background: transparent; }

html[data-theme="dark"] {
  background-color: #0C0A1E;
  background-image:
    radial-gradient(ellipse 60% 60% at 50% 50%, #180F3A 0%, transparent 65%),
    radial-gradient(ellipse 40% 40% at 0%   0%,   #03020C 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 100% 0%,   #03020C 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 0%   100%, #03020C 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 100% 100%, #03020C 0%, transparent 55%);
}
html[data-theme="light"] {
  background-color: #EEF1FF;
  background-image:
    radial-gradient(ellipse 70% 70% at 50% 40%, #F5F7FF 0%, transparent 70%),
    radial-gradient(ellipse 50% 50% at 0%   0%,   #C5CAFE 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 100% 0%,   #BAD0FF 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 0%   100%, #D4BFFF 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 100% 100%, #BFCCFF 0%, transparent 55%);
  background-attachment: fixed;
}

/* ── Toast ── */
.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 999;
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  border-radius: 10px; font-size: 14px; font-weight: 500;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4); white-space: nowrap;
}
.toast--success { background: var(--toast-success-bg); color: var(--toast-success-c); border: 1px solid var(--toast-success-b); }
.toast--error   { background: var(--toast-error-bg);   color: var(--toast-error-c);   border: 1px solid var(--toast-error-b); }
.toast-enter-active, .toast-leave-active { transition: all 0.35s cubic-bezier(0.34,1.2,0.64,1); }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-28px) scale(0.95); }
.toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.97); }

/* ── Header ── */
.header {
  position: sticky; top: 0; z-index: 100;
  background: var(--header-bg); backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-c);
}
.header-inner {
  max-width: 1140px; margin: 0 auto; padding: 16px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-icon {
  font-size: 20px;
  background: linear-gradient(135deg, #818CF8, #C084FC);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.brand-title { font-size: 35px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-1); }
.note-count {
  font-size: 12px; font-weight: 600;
  background: var(--accent-dim); color: var(--accent);
  border: 1px solid var(--border-c); border-radius: 20px; padding: 2px 9px;
}
.home-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 100%; font-weight: 600; cursor: pointer;
  background: transparent; color: var(--text-mute);
  border: 1px solid var(--border-c); border-radius: 20px; padding: 5px 14px;
  transition: all 0.15s;
}
.home-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: var(--border-h); }
.home-btn--active { background: var(--accent-dim); color: var(--accent); border-color: rgba(34,197,94,0.35); }
.header-actions { display: flex; align-items: center; gap: 10px; }

/* Theme toggle button */
.theme-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--accent-dim); border: 1px solid var(--border-c);
  cursor: pointer; font-size: 16px; transition: background 0.2s, border-color 0.2s, transform 0.15s;
}
.theme-toggle:hover { background: var(--accent-mid); border-color: var(--border-h); transform: rotate(20deg); }

/* Light mode — glassmorphism cards */
html[data-theme="light"] .note-card {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(99,102,241,0.1), 0 1px 4px rgba(99,102,241,0.06);
}
html[data-theme="light"] .note-card:hover {
  box-shadow: 0 8px 32px rgba(99,102,241,0.16), 0 2px 8px rgba(99,102,241,0.08);
}
html[data-theme="light"] .modal {
  background:
    radial-gradient(ellipse 70% 60% at 0%   0%,   #E0E7FF 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 100% 100%, #EDE9FE 0%, transparent 55%),
    #FFFFFF;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 24px 80px rgba(99,102,241,0.15);
}
html[data-theme="light"] .form-input,
html[data-theme="light"] .form-textarea {
  background: #F1F2F6;
  border-color: rgba(148,163,255,0.3);
  color: #1E1B4B;
}
html[data-theme="light"] .form-input:focus,
html[data-theme="light"] .form-textarea:focus {
  background: #ECEEF8;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
html[data-theme="light"] .unsaved-dialog {
  background: #FFFFFF;
  border-color: rgba(239,68,68,0.3);
  box-shadow: 0 16px 48px rgba(99,102,241,0.15);
}
html[data-theme="light"] .unsaved-title { color: #1E1B4B; }
html[data-theme="light"] .unsaved-text  { color: #4338CA; }
html[data-theme="light"] .unsaved-actions .btn-ghost {
  background: rgba(99,102,241,0.1); color: #4338CA; border-color: rgba(99,102,241,0.35);
}
html[data-theme="light"] .unsaved-actions .btn-danger {
  background: rgba(239,68,68,0.08); color: #DC2626; border-color: rgba(239,68,68,0.3);
}
html[data-theme="light"] .header {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
html[data-theme="light"] .search-input {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(255,255,255,0.85);
}
html[data-theme="light"] .skeleton-card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(8px);
}
.btn.active { background: rgba(239,68,68,0.12); color: #FCA5A5; border-color: rgba(239,68,68,0.25); }
.trash-badge {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent-dim); color: var(--text-mute); font-size: 10px; font-weight: 700;
  min-width: 16px; height: 16px; border-radius: 8px; padding: 0 4px; margin-left: 4px;
  transition: background 0.2s, color 0.2s;
}
.trash-badge--active { background: #EF4444; color: #fff; }

/* ── Toolbar ── */
.toolbar { max-width: 1140px; margin: 0 auto; padding: 10px 24px 14px; display: flex; flex-direction: column; gap: 10px; }

/* Search — centered compact, expands on hover/focus */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.search-icon {
  position: absolute;
  left: 50%;
  transform: translateX(calc(-50% - 88px));
  color: var(--text-mute); font-size: 17px; pointer-events: none;
  transition: all 0.75s cubic-bezier(0.25,0.8,0.25,1);
  z-index: 1;
}
.search-wrap.expanded .search-icon {
  left: 12px;
  transform: translateX(0);
}
.search-input {
  width: 220px;
  background: var(--bg-card); border: 1px solid var(--border-c);
  border-radius: 24px; color: var(--text-1); font-size: 14px;
  padding: 9px 20px 9px 36px;
  outline: none;
  transition: width 0.75s cubic-bezier(0.25,0.8,0.25,1),
              border-radius 0.6s ease,
              border-color 0.15s,
              box-shadow 0.15s;
  text-align: center;
}
.search-wrap.expanded .search-input {
  width: 100%;
  border-radius: 10px;
  text-align: left;
}
.search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.search-input::placeholder { color: var(--text-mute); transition: color 0.2s; }
.search-clear {
  position: absolute; right: 10px;
  background: none; border: none; color: var(--text-mute);
  cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 4px;
  transition: color 0.15s;
}
.search-clear:hover { color: var(--text-2); }
.tags-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tags-bar--spacer { min-height: 30px; }

/* Sort control */
.sort-wrap { margin-left: auto; position: relative; }
.sort-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--accent-dim); border: 1px solid var(--border-c);
  color: var(--text-2); cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.sort-btn:hover { background: var(--accent-mid); border-color: var(--border-h); color: var(--accent); }
.sort-menu {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 150;
  background: var(--bg-card2); border: 1px solid var(--border-c);
  border-radius: 10px; box-shadow: 0 8px 24px var(--shadow); min-width: 190px; overflow: hidden;
}
.sort-option {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 10px 14px;
  background: none; border: none; color: var(--text-2);
  font-size: 13px; font-weight: 500; cursor: pointer; text-align: left;
  transition: background 0.12s, color 0.12s;
}
.sort-option:hover { background: var(--accent-dim); color: var(--text-1); }
.sort-option.active { color: var(--accent); background: var(--accent-dim); }
.sort-option-icon { font-size: 14px; width: 18px; text-align: center; }
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.34,1.2,0.64,1); }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from  { opacity: 0; transform: translateY(-6px) scale(0.97); }
.dropdown-leave-to    { opacity: 0; transform: translateY(-4px) scale(0.98); }
.tag-pill {
  background: var(--accent-dim); border: 1px solid var(--border-c);
  color: var(--text-mute); border-radius: 20px; font-size: 14px; font-weight: 500;
  padding: 4px 15px; cursor: pointer; transition: all 0.15s;
}
.tag-pill:hover {
  background: rgba(var(--pill-rgb, 99,102,241), 0.12);
  color: var(--pill-color, var(--accent));
  border-color: rgba(var(--pill-rgb, 99,102,241), 0.4);
}
.tag-pill.active {
  background: rgba(var(--pill-rgb, 99,102,241), 0.18);
  color: var(--pill-color, #4ade80);
  border-color: rgba(var(--pill-rgb, 99,102,241), 0.5);
}

/* Tag chip editable (in modal) */
.tag-chip-editable {
  position: relative; display: inline-flex; align-items: center;
  cursor: pointer; border-radius: 12px; overflow: hidden;
}
.tag-chip-editable input[type="color"] {
  position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; border: none; padding: 0;
}
.tag-chip-pick {
  font-size: 10px; margin-left: 2px; opacity: 0;
  transition: opacity 0.15s;
}
.tag-chip-editable:hover .tag-chip-pick { opacity: 1; }

/* ── Main ── */
.main { max-width: 1140px; margin: 0 auto; padding: 28px 24px 60px; }

/* ── Skeleton loading ── */
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 16px; }
.skeleton-card {
  background: var(--bg-card); border: 1px solid var(--border-c);
  border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 10px;
}
.skeleton-line {
  border-radius: 6px; background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card2) 50%, var(--bg-card) 100%);
  background-size: 200% 100%; animation: shimmer 1.4s ease infinite;
}
.skeleton-title  { height: 18px; width: 70%; }
.skeleton-body   { height: 13px; width: 100%; }
.skeleton-body.short { width: 55%; }
.skeleton-footer { display: flex; gap: 8px; margin-top: 6px; }
.skeleton-tag    { height: 20px; width: 60px; border-radius: 10px; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── State boxes ── */
.state-box {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; min-height: 420px; text-align: center;
}
.state-icon  { font-size: 40px; }
.state-title { font-size: 17px; font-weight: 600; color: var(--text-2); }
.state-text  { font-size: 14px; color: var(--text-mute); }

/* ── Dog empty state ── */
.dog-message {
  font-size: 16px; font-weight: 500; color: var(--accent);
  letter-spacing: 0.02em; margin-bottom: 4px;
}
.dog-container {
  filter: drop-shadow(0 10px 30px rgba(99,102,241,0.3));
  animation: dogFloat 3.2s ease-in-out infinite;
}
@keyframes dogFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-12px); }
}

/* ── Trash ── */
.trash-hint { font-size: 13px; color: var(--text-mute); margin-bottom: 16px; padding: 8px 14px; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.15); border-radius: 8px; }

/* ── Rabbit fixed bottom-right corner ── */
.rabbit-corner {
  position: fixed; bottom: 24px; right: 24px; z-index: 90;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer;
  filter: drop-shadow(0 4px 14px rgba(99,102,241,0.25));
  animation: dogFloat 3.2s ease-in-out infinite;
}
.rabbit-corner:hover { filter: drop-shadow(0 6px 22px rgba(99,102,241,0.5)); }
.dog-sidebar-label {
  font-size: 11px; color: var(--accent); text-align: center; line-height: 1.5;
  background: var(--accent-dim); border: 1px solid var(--border-c);
  border-radius: 8px; padding: 4px 10px; font-weight: 500; white-space: nowrap;
}

/* Rabbit speech bubble — above, arrow pointing down-right */
.rabbit-bubble {
  position: absolute; bottom: 100%; right: 10px; margin-bottom: 8px;
  background: var(--bg-card2); border: 1px solid var(--border-h);
  color: var(--text-2); font-size: 12px; font-weight: 500;
  padding: 7px 13px; border-radius: 12px; white-space: nowrap;
  box-shadow: 0 4px 16px var(--shadow); pointer-events: none;
}
.rabbit-bubble::after {
  content: ''; position: absolute; bottom: -7px; right: 18px;
  border: 6px solid transparent; border-top-color: var(--border-h);
}
.bubble-enter-active { transition: opacity 0.2s, transform 0.2s cubic-bezier(0.34,1.4,0.64,1); }
.bubble-leave-active { transition: opacity 0.2s; }
.bubble-enter-from  { opacity: 0; transform: scale(0.85) translateY(4px); }
.bubble-leave-to    { opacity: 0; }

/* ── Notes Grid — full width ── */
.notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 16px; }
.note-card {
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card2) 100%);
  border: 1px solid var(--border-c);
  border-left: 3px solid transparent; border-radius: 12px;
  display: flex; flex-direction: column; cursor: pointer; overflow: hidden;
  transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s, opacity 0.18s;
  position: relative;
}
.note-card:hover { border-left-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 28px var(--shadow), 0 0 0 1px var(--accent-dim); }
.note-card:hover .drag-handle { opacity: 1; }
.note-card--dragging { opacity: 0.3; transform: scale(0.97); }
.note-card--dragover { border-left-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-mid), 0 8px 28px var(--shadow); transform: translateY(-2px); }
.drag-handle {
  position: absolute; top: 8px; right: 10px;
  font-size: 16px; color: var(--text-mute); cursor: grab; line-height: 1;
  opacity: 0; transition: opacity 0.15s, color 0.15s; user-select: none;
}
.drag-handle:hover { color: var(--accent); }
.drag-handle:active { cursor: grabbing; }
.note-card--trash { cursor: default; opacity: 0.65; }
.note-card--trash:hover { transform: none; border-left-color: #EF4444; }
.note-card-body  { padding: 18px 18px 12px; flex: 1; }
.note-title { font-size: 15px; font-weight: 650; color: var(--text-1); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50%; }
.note-content { font-size: 13px; color: var(--text-mute); line-height: 1.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50%; }
.note-tags   { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.tag-chip    { border-radius: 12px; font-size: 11px; font-weight: 500; padding: 2px 8px; border: 1px solid transparent; }
.note-card-footer { padding: 10px 18px 14px; border-top: 1px solid var(--border-c); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.note-time    { font-size: 11px; color: var(--text-mute); white-space: nowrap; }
.note-actions { display: flex; gap: 5px; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 5px; border: none; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500; padding: 9px 16px; transition: filter 0.15s, background 0.15s, transform 0.1s; white-space: nowrap; }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-ghost { background: var(--accent-dim); color: var(--text-2); border: 1px solid var(--border-c); }
.btn-ghost:hover:not(:disabled) { background: var(--accent-mid); color: var(--text-1); border-color: var(--border-h); }
.btn-danger { background: rgba(239,68,68,0.08); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.btn-sm { font-size: 12px; padding: 5px 11px; border-radius: 6px; }
.btn-lg { font-size: 15px; padding: 12px 28px; border-radius: 10px; }
.btn-icon { font-size: 18px; font-weight: 300; line-height: 1; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: var(--overlay-bg); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 200; }
.modal { background: linear-gradient(160deg, var(--bg-card2) 0%, var(--bg-card) 100%); border: 1px solid var(--border-c); border-radius: 16px; width: 100%; max-width: 640px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); display: flex; flex-direction: column; max-height: 90vh; position: relative; overflow: hidden; }

/* ── Unsaved changes dialog ── */
.unsaved-overlay {
  position: absolute; inset: 0; z-index: 10;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
}
.unsaved-dialog {
  background: #1e1c3a;
  border: 1px solid rgba(239,68,68,0.35);
  border-radius: 14px; padding: 28px 28px 22px;
  max-width: 320px; width: 90%; text-align: center;
  box-shadow: 0 16px 48px rgba(0,0,0,0.35);
}
.unsaved-icon  { font-size: 36px; margin-bottom: 10px; }
.unsaved-title { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 8px; }
.unsaved-text  { font-size: 13px; color: var(--text-2); line-height: 1.6; margin-bottom: 20px; }
.unsaved-actions { display: flex; flex-direction: column; gap: 8px; }
.unsaved-actions .btn { justify-content: center; width: 100%; font-weight: 600; }
.unsaved-actions .btn-ghost {
  background: rgba(99,102,241,0.18);
  color: var(--accent);
  border-color: rgba(99,102,241,0.4);
}
.unsaved-actions .btn-ghost:hover { background: rgba(99,102,241,0.28); color: var(--text-1); }
.unsaved-actions .btn-danger {
  background: rgba(239,68,68,0.15);
  color: #E84545;
  border-color: rgba(239,68,68,0.4);
}
.unsaved-actions .btn-danger:hover { background: rgba(239,68,68,0.25); color: #C0392B; }
.unsaved-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.2,0.64,1); }
.unsaved-fade-leave-active { transition: opacity 0.15s ease; }
.unsaved-fade-enter-from   { opacity: 0; transform: scale(0.9); }
.unsaved-fade-leave-to     { opacity: 0; }
.modal-header { padding: 20px 22px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-c); flex-shrink: 0; }
.modal-title { font-size: 17px; font-weight: 700; color: var(--text-1); }
.modal-header-right { display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; color: var(--text-mute); cursor: pointer; font-size: 17px; padding: 4px 6px; border-radius: 6px; transition: color 0.15s, background 0.15s; }
.modal-close:hover { color: var(--text-2); background: rgba(34,197,94,0.08); }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 22px 18px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-c); flex-shrink: 0; }
.shortcut-hint { font-size: 11.5px; color: var(--text-mute); margin-right: auto; }

/* ── Autosave status ── */

/* ── Form ── */
.form-field { display: flex; flex-direction: column; gap: 7px; }
.form-label { font-size: 12.5px; font-weight: 600; color: var(--text-3); letter-spacing: 0.03em; display: flex; align-items: center; gap: 8px; }
.form-hint { font-weight: 400; color: var(--text-mute); font-size: 11.5px; }
.required  { color: #F87171; }
.form-input, .form-textarea { background: var(--bg-input); border: 1px solid var(--border-c); border-radius: 8px; color: var(--text-1); font-family: inherit; font-size: 14px; padding: 10px 14px; outline: none; resize: vertical; transition: border-color 0.15s, box-shadow 0.15s; }
.form-input:focus, .form-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.form-input.is-error { border-color: #F87171; }
.form-textarea { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 13.5px; line-height: 1.65; }
.form-error { display: flex; align-items: center; gap: 7px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #FCA5A5; border-radius: 8px; font-size: 13px; padding: 8px 12px; }
.tag-preview { display: flex; flex-wrap: wrap; gap: 5px; }

/* ── Markdown Preview ── */
.markdown-preview { display: flex; flex-direction: column; gap: 12px; }
.preview-title { font-size: 22px; font-weight: 700; color: var(--text-1); letter-spacing: -0.3px; }
.md-body { color: var(--text-2); line-height: 1.75; font-size: 14.5px; }
.md-body h1, .md-body h2, .md-body h3 { color: var(--text-1); font-weight: 700; margin: 16px 0 8px; }
.md-body h1 { font-size: 20px; } .md-body h2 { font-size: 17px; } .md-body h3 { font-size: 15px; }
.md-body p { margin-bottom: 10px; }
.md-body strong { color: var(--text-1); }
.md-body em { color: var(--text-3); }
.md-body code { background: rgba(34,197,94,0.1); color: var(--text-3); border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: 'Fira Code', monospace; }
.md-body pre { background: var(--bg-input); border: 1px solid var(--border-c); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin-bottom: 10px; }
.md-body pre code { background: none; padding: 0; }
.md-body ul, .md-body ol { padding-left: 20px; margin-bottom: 10px; }
.md-body li { margin-bottom: 4px; }
.md-body blockquote { border-left: 3px solid var(--accent); padding-left: 14px; color: var(--text-mute); font-style: italic; margin-bottom: 10px; }
.md-body a { color: var(--accent); text-decoration: underline; }
.md-body hr { border: none; border-top: 1px solid var(--border-c); margin: 16px 0; }

/* ── Spinner ── */
.spinner { width: 26px; height: 26px; border: 3px solid var(--accent-dim); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner-sm { width: 13px; height: 13px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tag filter zoom transitions ── */
.notes-grid-wrap { width: 100%; }

/* Selecting a tag: zoom out current → zoom in filtered */
.tag-zoom-in-enter-active  {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.tag-zoom-in-leave-active  {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.tag-zoom-in-enter-from    { opacity: 0; transform: scale(0.75); }
.tag-zoom-in-leave-to      { opacity: 0; transform: scale(0.85); }

/* Going back to All: zoom out filtered → zoom in all */
.tag-zoom-out-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.tag-zoom-out-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.tag-zoom-out-enter-from   { opacity: 0; transform: scale(1.15); }
.tag-zoom-out-leave-to     { opacity: 0; transform: scale(1.08); }

/* ── View transitions (trash ↔ notes) ── */
/* Going into trash: notes fly up out, trash flies up in */
.view-up-enter-active  { transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.25,0.8,0.25,1); }
.view-up-leave-active  { transition: opacity 0.28s ease, transform 0.28s ease; }
.view-up-enter-from    { opacity: 0; transform: translateY(40px); }
.view-up-leave-to      { opacity: 0; transform: translateY(-40px); }

/* Going back to notes: trash flies down out, notes fly down in */
.view-down-enter-active { transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.25,0.8,0.25,1); }
.view-down-leave-active { transition: opacity 0.28s ease, transform 0.28s ease; }
.view-down-enter-from   { opacity: 0; transform: translateY(-40px); }
.view-down-leave-to     { opacity: 0; transform: translateY(40px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active { transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.2,0.64,1); }
.slide-up-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px) scale(0.97); }
.slide-up-leave-to   { opacity: 0; transform: translateY(8px); }

/* ── Responsive ── */
@media (max-width: 900px) {
  .rabbit-corner { bottom: 16px; right: 16px; }
  .rabbit-corner svg { width: 70px; height: 80px; }
}
@media (max-width: 640px) {
  .header-inner { padding: 12px 16px; }
  .toolbar      { padding: 8px 16px 12px; }
  .main         { padding: 20px 16px 48px; }
  .notes-grid   { grid-template-columns: 1fr; }
  .modal        { border-radius: 14px; max-height: 95vh; }
  .shortcut-hint { display: none; }
}
</style>