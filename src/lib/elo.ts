/**
 * Elo where a side's strength is the average of its players.
 *
 *   P(A wins) = 1 / (1 + 10 ^ ((Rb - Ra) / 400))
 *
 * After the match every player on a side moves by the same amount:
 *
 *   delta = K * (actual - expected)
 *
 * actual is 1 for a win and 0 for a loss. There is no draw outcome.
 * K and the starting rating live in league_settings (defaults 32 and 1500).
 *
 * The database function public.recompute_league() is the source of truth
 * for stored ratings and predictions. This module is the same formula,
 * used for the pre-match preview and for the evaluation metrics.
 */

export interface ScoredPrediction {
  predA: number
  scoreA: number
  scoreB: number
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Expected score of `rating` against `opponent`, on the 0–1 scale. */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400))
}

export function teamWinProb(elosA: number[], elosB: number[]): number {
  return expectedScore(average(elosA), average(elosB))
}

export function eloDelta(k: number, expected: number, actual: 0 | 1): number {
  return k * (actual - expected)
}

export function brierScore(matches: ScoredPrediction[]): number | null {
  const rows = matches.filter((m) => m.scoreA !== m.scoreB && Number.isFinite(m.predA))
  if (rows.length === 0) return null
  const total = rows.reduce((sum, m) => {
    const outcome = m.scoreA > m.scoreB ? 1 : 0
    return sum + (m.predA - outcome) ** 2
  }, 0)
  return total / rows.length
}

/** Skill relative to a coin flip (Brier 0.25). 1 is perfect, 0 matches a coin, negative is worse. */
export function brierSkill(brier: number | null): number | null {
  if (brier == null) return null
  return 1 - brier / 0.25
}

export interface HitRate {
  hits: number
  decided: number
  rate: number | null
}

/** How often the side given more than 50% actually won. Toss-ups are excluded. */
export function hitRate(matches: ScoredPrediction[]): HitRate {
  let hits = 0
  let decided = 0
  for (const match of matches) {
    if (match.scoreA === match.scoreB || !Number.isFinite(match.predA)) continue
    if (Math.abs(match.predA - 0.5) < 1e-9) continue
    decided += 1
    const favoriteIsA = match.predA > 0.5
    const aWon = match.scoreA > match.scoreB
    if (favoriteIsA === aWon) hits += 1
  }
  return { hits, decided, rate: decided === 0 ? null : hits / decided }
}

export interface CalibrationBin {
  from: number
  to: number
  count: number
  avgPred: number | null
  avgActual: number | null
}

export function calibration(
  matches: ScoredPrediction[],
  edges: number[] = [0, 0.2, 0.4, 0.6, 0.8, 1],
): CalibrationBin[] {
  const bins: CalibrationBin[] = []
  for (let i = 0; i < edges.length - 1; i += 1) {
    const from = edges[i]
    const to = edges[i + 1]
    const last = i === edges.length - 2
    const rows = matches.filter((m) => {
      if (m.scoreA === m.scoreB || !Number.isFinite(m.predA)) return false
      return m.predA >= from && (last ? m.predA <= to : m.predA < to)
    })
    bins.push({
      from,
      to,
      count: rows.length,
      avgPred: rows.length ? average(rows.map((m) => m.predA)) : null,
      avgActual: rows.length ? average(rows.map((m) => (m.scoreA > m.scoreB ? 1 : 0))) : null,
    })
  }
  return bins
}
