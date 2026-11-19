// Helpers for day notes: a one-day timetable with time slots down the left and columns across the top.

export const DEFAULT_COLUMNS = [
  { id: 'setup', name: 'Default setup' },
  { id: 'task', name: 'Assigned task' },
  { id: 'venue', name: 'Venue' },
]
export const DEFAULT_START = '07:00'
export const DEFAULT_END = '18:00'

export const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function localISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function blankDayNote() {
  return {
    title: '',
    day: localISODate(),
    data: {
      start: DEFAULT_START,
      end: DEFAULT_END,
      columns: DEFAULT_COLUMNS.map(c => ({ ...c })),
      extraTimes: [],
      cells: {},
    },
  }
}

const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// Every hour from start to end (both included), plus any extra slots such as 08:45, in order.
export function timesOf(data, start = data.start, end = data.end) {
  const set = new Set()
  for (let m = toMin(start); m <= toMin(end); m += 60) set.add(toTime(m))
  for (const t of data.extraTimes || []) if (t >= start && t <= end) set.add(t)
  return [...set].sort()
}

export function entriesIn(data, time, colId) {
  return data.cells?.[time]?.[colId] || []
}

export function allEntries(data) {
  const out = []
  for (const [time, row] of Object.entries(data.cells || {}))
    for (const [colId, list] of Object.entries(row)) for (const e of list) out.push({ time, colId, ...e })
  return out.sort((a, b) => a.time.localeCompare(b.time))
}

export function formatDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
