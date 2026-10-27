const JERUSALEM = 'Asia/Jerusalem'

export function formatDay(input: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: JERUSALEM,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(input instanceof Date ? input : new Date(input))
}

export function formatTime(input: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: JERUSALEM,
    hour: '2-digit',
    minute: '2-digit',
  }).format(input instanceof Date ? input : new Date(input))
}

export function formatDayTime(input: string | Date): string {
  return `${formatDay(input)} · ${formatTime(input)}`
}

/** Signed shekel amount. The minus is the typographic minus, not a hyphen. */
export function shekel(amount: number, opts?: { signed?: boolean }): string {
  const n = Math.round(amount)
  const abs = Math.abs(n).toLocaleString('he-IL')
  if (opts?.signed) {
    if (n > 0) return `+₪${abs}`
    if (n < 0) return `−₪${abs}`
    return `₪${abs}`
  }
  return n < 0 ? `−₪${abs}` : `₪${abs}`
}

export function pct(probability: number, digits = 0): string {
  const value = probability * 100
  return `${value.toFixed(digits)}%`
}

export function playerName(players: { id: string; name: string }[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? 'שחקן'
}

export function joinNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} ו${names[1]}`
  return `${names.slice(0, -1).join(', ')} ו${names[names.length - 1]}`
}

export function teamLabel(ids: string[], players: { id: string; name: string }[]): string {
  return ids.map((id) => playerName(players, id)).join(' · ')
}

export function initial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 1) : '?'
}

const SWATCHES = ['#d6ff3f', '#ffc14a', '#8ee7ff', '#ff8bd2', '#ff5d3a', '#c9b6ff', '#7dffc3', '#ffe38a']

export function swatch(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return SWATCHES[hash % SWATCHES.length]
}

export function swatches(): readonly string[] {
  return SWATCHES
}
