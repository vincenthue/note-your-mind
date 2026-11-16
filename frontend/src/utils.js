import { reactive } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// ── Content (old notes are Markdown, new ones are HTML) ──
export function isHtml(content) {
  return /^\s*</.test(content || '')
}

export function toHtml(content) {
  if (!content) return ''
  const html = isHtml(content) ? content : marked.parse(content)
  return DOMPurify.sanitize(html)
}

export function toPlainText(content, max = 220) {
  if (!content) return ''
  const doc = new DOMParser().parseFromString(toHtml(content), 'text/html')
  doc.querySelectorAll('li, p, h1, h2, h3, blockquote, pre').forEach(el => el.append(' '))
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function checklistProgress(content) {
  if (!content || !isHtml(content)) return null
  const total = (content.match(/data-type="taskItem"/g) || []).length
  if (!total) return null
  const done = (content.match(/data-checked="true"/g) || []).length
  return { done, total }
}

export function isEmptyHtml(html) {
  return !html || !html.replace(/<p><\/p>/g, '').trim()
}

// ── Tags ──
export function parseTags(raw) {
  return raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : []
}
export function joinTags(list) {
  return [...new Set(list.map(t => t.trim()).filter(Boolean))].join(',')
}

const PALETTE = ['#7C83FF', '#4CB782', '#F2C94C', '#F2994A', '#EB5757', '#BB87FC', '#4EA7FC', '#E879B9', '#26B5CE', '#95A2B3']
const STORAGE_KEY = 'notes_tag_colors'

function loadColors() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
export const tagColors = reactive(loadColors())

export function tagColor(tag) {
  if (tagColors[tag]) return tagColors[tag]
  let h = 0
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}
export function setTagColor(tag, color) {
  tagColors[tag] = color
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...tagColors })) } catch { /* ignore */ }
}
export const TAG_PALETTE = PALETTE

// ── Status ──
export const STATUSES = [
  { value: 'todo',  label: 'To do' },
  { value: 'doing', label: 'In progress' },
  { value: 'done',  label: 'Done' },
]
export const statusLabel = v => STATUSES.find(s => s.value === v)?.label || 'To do'

// ── Dates (SQLite CURRENT_TIMESTAMP is UTC without a zone) ──
export function parseDate(raw) {
  if (!raw) return null
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : raw.replace(' ', 'T') + 'Z')
}

export function relativeDate(raw) {
  const d = parseDate(raw)
  if (!d) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}
