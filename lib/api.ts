// API client for Shadow of Soros backend

export interface ServerStatus {
  ok: boolean
  uptime_seconds: number
  games: {
    lobby: number
    active: number
    gameover: number
    total: number
  }
  server: {
    ws_port: number
    dashboard_port: number
  }
}

export interface GameConfig {
  match_shape: {
    min_players: number
    max_players: number
    mafia_ratio: number
  }
  role_distribution: {
    [key: string]: number
  }
  phase_timing: {
    morning_start: number
    night_start: number
    night_resolution_start: number
  }
  step_thresholds: {
    town_win: number
    mafia_win: number
  }
  voting_rules: {
    min_votes_to_eliminate: number
    mayor_vote_weight: number
  }
  win_condition: string
}

export interface Game {
  id: string
  status: 'LOBBY' | 'ACTIVE' | 'GAMEOVER'
  phase: 'PreGame' | 'Morning' | 'Night' | 'NightResolution' | 'PostGame'
  day: number
  players: number
  maxPlayers: number
  winner?: 'TOWN' | 'MAFIA' | null
  createdAt?: string
}

export interface Player {
  id: number
  name: string
  role: 'Doctor' | 'Detective' | 'Bodyguard' | 'Mayor' | 'Commoner' | 'MafiaLeader' | 'SilencerMafia' | 'VanillaMafia'
  faction: 'TOWN' | 'MAFIA'
  status: 'Alive' | 'Eliminated' | 'Resurrected' | 'DeadForever'
  lifetimeSteps: number
  mayorRevealed: boolean
}

export interface GameTally {
  townSteps: number
  mafiaSteps: number
  totalSteps: number
  townPercentage: number
  mafiaPercentage: number
}

export type ActionType = 
  | 'VOTE'
  | 'MAFIA_KILL'
  | 'DOCTOR_SAVE'
  | 'DETECTIVE_INVESTIGATE'
  | 'BODYGUARD_PROTECT'
  | 'SILENCER_SILENCE'
  | 'MAYOR_REVEAL'
  | 'SKIP'

export interface ApiConfig {
  backendUrl: string
  secret: string
}

const CONFIG_KEY = 'shadow_of_soros_config'

export function getApiConfig(): ApiConfig | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(CONFIG_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function setApiConfig(config: ApiConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearApiConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config = getApiConfig()
  if (!config) {
    throw new Error('API not configured')
  }

  const url = `${config.backendUrl}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.secret}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// API Functions
export async function getStatus(): Promise<ServerStatus> {
  return apiFetch<ServerStatus>('/api/status')
}

export async function getConfig(): Promise<GameConfig> {
  return apiFetch<GameConfig>('/api/config')
}

export async function getGames(): Promise<Game[]> {
  return apiFetch<Game[]>('/api/games')
}

export async function getGame(gameId: string): Promise<Game> {
  return apiFetch<Game>(`/api/games/${gameId}`)
}

export async function createGame(): Promise<Game> {
  return apiFetch<Game>('/api/games', { method: 'POST' })
}

export async function getPlayers(gameId: string): Promise<Player[]> {
  return apiFetch<Player[]>(`/api/games/${gameId}/players`)
}

export async function getTally(gameId: string): Promise<GameTally> {
  return apiFetch<GameTally>(`/api/games/${gameId}/tally`)
}

export async function joinGame(gameId: string, userId: number): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/games/${gameId}/join`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function submitAction(
  gameId: string,
  actorId: number,
  actionType: ActionType,
  targetId?: number
): Promise<void> {
  await apiFetch(`/api/games/${gameId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ actorId, actionType, targetId }),
  })
}

// SWR fetcher
export const fetcher = async <T>(endpoint: string): Promise<T> => {
  return apiFetch<T>(endpoint)
}
