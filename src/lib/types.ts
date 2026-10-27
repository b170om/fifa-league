export type Side = 'a' | 'b'
export type Rotation = 'winner_stays' | 'fair' | 'pairs'
export type SessionStatus = 'live' | 'closed'
export type RecapSource = 'model' | 'fallback'
export type MatchMode = '1v1' | '2v2'

export interface Player {
  id: string
  name: string
  elo: number
  archivedAt: string | null
  createdAt: string
}

export interface MatchPlayer {
  playerId: string
  side: Side
  eloBefore: number
  eloAfter: number
  pnl: number
}

export interface Match {
  id: string
  playedAt: string
  createdAt: string
  mode: MatchMode
  sessionId: string | null
  teamA: string[]
  teamB: string[]
  scoreA: number
  scoreB: number
  stake: number
  predA: number | null
  modelVersion: string | null
  deletedAt: string | null
  players: MatchPlayer[]
}

export interface Session {
  id: string
  title: string
  startedAt: string
  endedAt: string | null
  stake: number
  rotation: Rotation
  status: SessionStatus
  lockedPairs: [string, string][] | null
  playerIds: string[]
  aiRecap: string | null
  aiRecapSource: RecapSource | null
  aiModel: string | null
  deletedAt: string | null
}

export interface Settings {
  defaultStake: number
  eloK: number
  eloStart: number
  currency: string
}

export interface AuditEntry {
  id: string
  entity: string
  entityId: string | null
  action: string
  summary: string
  createdAt: string
}

export interface LeagueData {
  players: Player[]
  matches: Match[]
  sessions: Session[]
  settings: Settings
  audit: AuditEntry[]
}

export const MODEL_VERSION = 'elo-avg-v1'
