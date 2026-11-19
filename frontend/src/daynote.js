// Helpers for day notes: a one-day program flow. Each row is a session (time + name),
// and each session has entries in three columns: Default setup, Assigned task, Venue.

export const DEFAULT_COLUMNS = [
  { id: 'setup', name: 'Default setup' },
  { id: 'task', name: 'Assigned task' },
  { id: 'venue', name: 'Venue' },
]
export const FORMATS = ['', 'combined', 'split']

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function localISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const nowHHMM = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export function blankDayNote() {
  return {
    title: '',
    day: localISODate(),
    data: { columns: DEFAULT_COLUMNS.map(c => ({ ...c })), sessions: [], venueContact: '' },
  }
}

// Notes saved before sessions existed had hourly time slots; turn each slot with entries into a session.
export function normalizeData(data) {
  const d = JSON.parse(JSON.stringify(data || {}))
  if (!Array.isArray(d.columns) || !d.columns.length) d.columns = DEFAULT_COLUMNS.map(c => ({ ...c }))
  if (!Array.isArray(d.sessions)) {
    d.sessions = Object.keys(d.cells || {}).sort().map(time => ({ id: uid(), time, name: '', format: '', hall: '', cells: d.cells[time] }))
  }
  for (const s of d.sessions) {
    s.cells ||= {}
    for (const list of Object.values(s.cells)) for (const e of list) e.status = e.status === 'done' ? 'done' : 'waiting'
  }
  d.venueContact ||= ''
  delete d.cells; delete d.start; delete d.end; delete d.extraTimes
  return d
}

export const sessionsOf = data => (Array.isArray(data?.sessions) ? data.sessions : normalizeData(data).sessions)

export const sortSessions =list => list.sort((a, b) => a.time.localeCompare(b.time))

export function entriesIn(session, colId) {
  return session.cells?.[colId] || []
}

// Every entry with its session, in time order.
export function allEntries(data) {
  const out = []
  for (const s of sessionsOf(data))
    for (const [colId, list] of Object.entries(s.cells || {})) for (const e of list) out.push({ ...e, colId, session: s, time: s.time })
  return out.sort((a, b) => a.time.localeCompare(b.time))
}

// An entry is overdue when it is still waiting and its deadline has passed:
// setup must be ready when the session starts; tasks and venue items when the session ends
// (the next session's start, or one hour after the last one).
export function isOverdue(entry, colId, session, sessions, day, now = new Date()) {
  if (entry.status === 'done') return false
  const today = localISODate(now)
  if (day < today) return true
  if (day > today) return false
  const nowM = toMin(nowHHMM(now))
  if (colId === 'setup') return nowM >= toMin(session.time)
  const next = sessions.find(s => s.time > session.time)
  const end = next ? toMin(next.time) : toMin(session.time) + 60
  return nowM >= end
}

// Splits text so @names can be shown as highlighted chips.
export function textParts(text) {
  return text.split(/(@[\p{L}\p{N}_.-]+)/u).filter(Boolean).map(p => ({ text: p, name: p.startsWith('@') }))
}

export function formatDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
