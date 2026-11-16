<template>
  <div class="re">
    <div v-if="editor" class="re-toolbar" role="toolbar" aria-label="Formatting">
      <template v-for="(group, gi) in groups" :key="gi">
        <span v-if="gi" class="re-sep" />
        <button
          v-for="b in group" :key="b.id"
          type="button"
          class="re-btn"
          :class="{ active: tick >= 0 && b.active?.() }"
          :title="b.title"
          :aria-label="b.title"
          @mousedown.prevent
          @click="b.run()"
        >
          <span v-if="b.text" class="re-txt" :style="b.style">{{ b.text }}</span>
          <svg v-else viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" v-html="b.icon" />
        </button>
      </template>
    </div>
    <EditorContent :editor="editor" class="re-content prose" />
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Start writing…' },
})
const emit = defineEmits(['update:modelValue', 'save'])

const tick = ref(0)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: props.placeholder }),
    Highlight,
  ],
  editorProps: {
    attributes: { class: 're-pm', spellcheck: 'true' },
    handleKeyDown: (_view, e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); emit('save'); return true }
      return false
    },
  },
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
  onTransaction: () => { tick.value++ },
})

onBeforeUnmount(() => editor.value?.destroy())

const chain = () => editor.value.chain().focus()
const is = (name, attrs) => () => editor.value?.isActive(name, attrs)

function setLink() {
  const prev = editor.value.getAttributes('link').href || ''
  const url = window.prompt('Link URL (leave empty to remove)', prev)
  if (url === null) return
  if (!url.trim()) chain().extendMarkRange('link').unsetLink().run()
  else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
}

const groups = [
  [
    { id: 'h1', title: 'Heading 1', text: 'H1', run: () => chain().toggleHeading({ level: 1 }).run(), active: is('heading', { level: 1 }) },
    { id: 'h2', title: 'Heading 2', text: 'H2', run: () => chain().toggleHeading({ level: 2 }).run(), active: is('heading', { level: 2 }) },
    { id: 'h3', title: 'Heading 3', text: 'H3', run: () => chain().toggleHeading({ level: 3 }).run(), active: is('heading', { level: 3 }) },
  ],
  [
    { id: 'b', title: 'Bold (Ctrl+B)', text: 'B', style: 'font-weight:700', run: () => chain().toggleBold().run(), active: is('bold') },
    { id: 'i', title: 'Italic (Ctrl+I)', text: 'I', style: 'font-style:italic;font-family:Georgia,serif', run: () => chain().toggleItalic().run(), active: is('italic') },
    { id: 'u', title: 'Underline (Ctrl+U)', text: 'U', style: 'text-decoration:underline', run: () => chain().toggleUnderline().run(), active: is('underline') },
    { id: 's', title: 'Strikethrough', text: 'S', style: 'text-decoration:line-through', run: () => chain().toggleStrike().run(), active: is('strike') },
    { id: 'hl', title: 'Highlight', icon: '<path d="M3 13h10"/><path d="M5 10.5l5.5-6.5 2 1.8L7 12.2H5z"/>', run: () => chain().toggleHighlight().run(), active: is('highlight') },
    { id: 'code', title: 'Inline code', icon: '<path d="M6 4.5L2.5 8 6 11.5M10 4.5L13.5 8 10 11.5"/>', run: () => chain().toggleCode().run(), active: is('code') },
    { id: 'link', title: 'Link', icon: '<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.6.6"/><path d="M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.6-.6"/>', run: setLink, active: is('link') },
  ],
  [
    { id: 'ul', title: 'Bullet list', icon: '<circle cx="3" cy="4.5" r=".7" fill="currentColor"/><circle cx="3" cy="8" r=".7" fill="currentColor"/><circle cx="3" cy="11.5" r=".7" fill="currentColor"/><path d="M6 4.5h7.5M6 8h7.5M6 11.5h7.5"/>', run: () => chain().toggleBulletList().run(), active: is('bulletList') },
    { id: 'ol', title: 'Numbered list', icon: '<path d="M6 4.5h7.5M6 8h7.5M6 11.5h7.5"/><path d="M2.3 3.5h1v2.5M2.2 9.2c.3-.6 1.5-.6 1.5.2 0 .6-1.5 1-1.5 1.6h1.6" stroke-width="1.1"/>', run: () => chain().toggleOrderedList().run(), active: is('orderedList') },
    { id: 'task', title: 'Checklist', icon: '<rect x="2" y="2.5" width="4.5" height="4.5" rx="1"/><path d="M3 4.8l.9.9 1.6-1.7" stroke-width="1.2"/><rect x="2" y="9" width="4.5" height="4.5" rx="1"/><path d="M9 4.8h5M9 11.2h5"/>', run: () => chain().toggleTaskList().run(), active: is('taskList') },
    { id: 'quote', title: 'Quote', icon: '<path d="M3 3v10"/><path d="M6.5 5h7M6.5 8h7M6.5 11h4.5"/>', run: () => chain().toggleBlockquote().run(), active: is('blockquote') },
    { id: 'pre', title: 'Code block', icon: '<rect x="1.8" y="2.5" width="12.4" height="11" rx="2"/><path d="M6 6.5L4.5 8 6 9.5M10 6.5l1.5 1.5L10 9.5"/>', run: () => chain().toggleCodeBlock().run(), active: is('codeBlock') },
    { id: 'hr', title: 'Divider', icon: '<path d="M2 8h12"/>', run: () => chain().setHorizontalRule().run() },
  ],
  [
    { id: 'undo', title: 'Undo (Ctrl+Z)', icon: '<path d="M5 3.5L2.5 6 5 8.5"/><path d="M2.5 6h7a3.5 3.5 0 0 1 0 7H7"/>', run: () => chain().undo().run() },
    { id: 'redo', title: 'Redo (Ctrl+Shift+Z)', icon: '<path d="M11 3.5L13.5 6 11 8.5"/><path d="M13.5 6h-7a3.5 3.5 0 0 0 0 7H9"/>', run: () => chain().redo().run() },
  ],
]

defineExpose({
  focus: () => {
    if (!editor.value) return
    editor.value.view.dom.focus() // move focus synchronously; TipTap's focus() defers to the next frame
    editor.value.commands.focus('end')
  },
})
</script>

<style scoped>
.re { display: flex; flex-direction: column; min-height: 0; }
.re-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
  padding: 6px; border: 1px solid var(--border); border-radius: 9px;
  background: var(--bg-elev-2);
  position: sticky; top: 0; z-index: 2;
}
.re-sep { width: 1px; height: 18px; background: var(--border-strong); margin: 0 4px; }
.re-btn {
  width: 30px; height: 28px; display: grid; place-items: center;
  border: 0; border-radius: 6px; background: transparent; color: var(--text-2);
  transition: background .1s, color .1s;
}
.re-btn:hover { background: var(--bg-hover); color: var(--text); }
.re-btn.active { background: var(--accent-bg); color: var(--accent); }
.re-txt { font-size: 13px; font-weight: 600; line-height: 1; }
.re-content { flex: 1; padding: 16px 2px 8px; }
.re-content :deep(.re-pm) { outline: none; min-height: 220px; }
</style>
