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
    player_count: number    // total slots (min = max = this value)
    mafia_count: number
    mafia_ratio: number     // 0–1 fraction
    duration_days: number
  }
  role_distribution: {      // PascalCase role name → count
    [role: string]: number
  }
  phase_timing: {
    morning_start: number           // 0–23 hour
    night_start: number
    night_resolution_start: number
    timezone: string
  }
  step_thresholds: {
    power_use: number       // steps required to unlock special powers
    resurrection: number    // steps required for resurrection
  }
  voting_rules: {
    vote_power_per_step: number    // fractional vote power per step
    mayor_vote_multiplier: number  // Mayor's bonus multiplier
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

export interface VoterEntry {
  userId: string
  name: string
}

export interface Player {
  id: string
  userId: string
  name: string
  role: 'Doctor' | 'Detective' | 'Bodyguard' | 'Mayor' | 'Commoner' | 'MafiaLeader' | 'SilencerMafia' | 'VanillaMafia' | null
  faction: 'TOWN' | 'MAFIA' | null
  status: 'Alive' | 'Eliminated' | 'Resurrected' | 'DeadForever'
  lifetimeSteps: number
  activeSteps: number
  mayorRevealed: boolean
  votesReceived: number
  votersAgainstMe: VoterEntry[]
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

// =============================================================================
// Backend → frontend normalisation maps
//
// The C++ toString() helpers emit SCREAMING_SNAKE_CASE.
// All badge components use PascalCase keys, so we normalise here once
// instead of touching every component.
// =============================================================================

const PHASE_MAP: Record<string, Game['phase']> = {
  PRE_GAME:         'PreGame',
  MORNING:          'Morning',
  NIGHT:            'Night',
  NIGHT_RESOLUTION: 'NightResolution',
  POST_GAME:        'PostGame',
}

const ROLE_MAP: Record<string, Player['role']> = {
  DOCTOR:         'Doctor',
  DETECTIVE:      'Detective',
  BODYGUARD:      'Bodyguard',
  MAYOR:          'Mayor',
  COMMONER:       'Commoner',
  MAFIA_LEADER:   'MafiaLeader',
  SILENCER_MAFIA: 'SilencerMafia',
  VANILLA_MAFIA:  'VanillaMafia',
}

const PLAYER_STATUS_MAP: Record<string, Player['status']> = {
  ALIVE:        'Alive',
  ELIMINATED:   'Eliminated',
  RESURRECTED:  'Resurrected',
  DEAD_FOREVER: 'DeadForever',
}

interface RawGame {
  id: string
  status: string
  phase: string
  dayNumber: number
  playerCount: number
  capacity: number
  winner?: string | null
  createdAt?: string
}

function mapGame(g: RawGame): Game {
  return {
    id:         g.id,
    status:     g.status as Game['status'],
    phase:      PHASE_MAP[g.phase] ?? g.phase as Game['phase'],
    day:        g.dayNumber,
    players:    g.playerCount,
    maxPlayers: g.capacity,
    winner:     g.winner as Game['winner'],
    createdAt:  g.createdAt,
  }
}

interface RawPlayer {
  id: string
  userId: number
  displayName: string
  role: string | null
  faction: string | null
  status: string
  lifetimeSteps: number
  activeSteps: number
  mayorRevealed: boolean
  votesReceived: number
  votersAgainstMe: { userId: number; name: string }[]
}

// Maps dashboard ActionType → backend action type string
const ACTION_TYPE_MAP: Record<ActionType, string> = {
  VOTE:                  'CastVote',
  MAFIA_KILL:            'MafiaKillTarget',
  DOCTOR_SAVE:           'DoctorSave',
  DETECTIVE_INVESTIGATE: 'DetectiveInquire',
  BODYGUARD_PROTECT:     'BodyguardProtect',
  SILENCER_SILENCE:      'SilencerSilence',
  MAYOR_REVEAL:          'RevealAsMayor',
  SKIP:                  'Skip',
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config = getApiConfig()
  if (!config) throw new Error('API not configured')

  // All requests go through the Next.js proxy route (/api/proxy/...).
  // The proxy runs server-side so there is no CORS preflight and no ngrok
  // browser-warning interstitial. We pass the backend URL + secret as headers
  // so the proxy can forward them without needing Vercel env vars.
  const url = `/api/proxy${endpoint}`
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      'content-type':      'application/json',
      'x-backend-url':     config.backendUrl,
      'x-backend-secret':  config.secret,
      ...(options.headers as Record<string, string>),
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

interface RawConfig {
  rules: {
    durationDays: number
    playerCount: number
    mafiaCount: number
    roles: {
      mafiaLeader: number
      silencerMafia: number
      vanillaMafia: number
      doctor: number
      detective: number
      bodyguard: number
      mayor: number
      commoner: number
    }
    phases: {
      morningStartHour: number
      nightStartHour: number
      nightResolutionHour: number
      timezone: string
    }
    steps: {
      powerUseThreshold: number
      resurrectionThreshold: number
    }
    voting: {
      votePowerPerStep: number
      mayorVoteMultiplier: number
    }
    winCondition: {
      earlyEndIfFactionWiped: boolean
    }
  }
  network: {
    wsPort: number
    dashboardPort: number
    prismaBaseUrl: string
  }
  notifications: {
    fcmEnabled: boolean
    eventHistoryDays: number
  }
}

export async function getConfig(): Promise<GameConfig> {
  const raw = await apiFetch<RawConfig>('/api/config')
  const r = raw.rules
  return {
    match_shape: {
      player_count:  r.playerCount,
      mafia_count:   r.mafiaCount,
      mafia_ratio:   r.playerCount > 0 ? r.mafiaCount / r.playerCount : 0,
      duration_days: r.durationDays,
    },
    role_distribution: {
      Doctor:        r.roles.doctor,
      Detective:     r.roles.detective,
      Bodyguard:     r.roles.bodyguard,
      Mayor:         r.roles.mayor,
      Commoner:      r.roles.commoner,
      MafiaLeader:   r.roles.mafiaLeader,
      SilencerMafia: r.roles.silencerMafia,
      VanillaMafia:  r.roles.vanillaMafia,
    },
    phase_timing: {
      morning_start:          r.phases.morningStartHour,
      night_start:            r.phases.nightStartHour,
      night_resolution_start: r.phases.nightResolutionHour,
      timezone:               r.phases.timezone,
    },
    step_thresholds: {
      power_use:    r.steps.powerUseThreshold,
      resurrection: r.steps.resurrectionThreshold,
    },
    voting_rules: {
      vote_power_per_step:   r.voting.votePowerPerStep,
      mayor_vote_multiplier: r.voting.mayorVoteMultiplier,
    },
    win_condition: r.winCondition.earlyEndIfFactionWiped
      ? 'Game ends immediately when all members of a faction are eliminated.'
      : 'Game plays to full duration — faction wipe does not trigger early end.',
  }
}

export async function getGames(): Promise<Game[]> {
  const res = await apiFetch<{ games: RawGame[] }>('/api/games')
  return res.games.map(mapGame)
}

export async function getGame(gameId: string): Promise<Game> {
  const raw = await apiFetch<RawGame>(`/api/games/${gameId}`)
  return mapGame(raw)
}

export async function createGame(): Promise<Game> {
  // Backend returns { gameId: string } — fetch the full game object afterwards
  const { gameId } = await apiFetch<{ gameId: string }>('/api/games', { method: 'POST' })
  return getGame(gameId)
}

export async function getPlayers(gameId: string): Promise<Player[]> {
  const res = await apiFetch<{ gameId: string; players: RawPlayer[] }>(`/api/games/${gameId}/players`)
  return res.players.map(p => ({
    id:            p.id,
    userId:        String(p.userId),
    name:          p.displayName,
    role:          p.role != null ? (ROLE_MAP[p.role] ?? null) : null,
    faction:       (p.faction as Player['faction']) ?? null,
    status:        PLAYER_STATUS_MAP[p.status] ?? p.status as Player['status'],
    lifetimeSteps:    p.lifetimeSteps,
    activeSteps:      p.activeSteps,
    mayorRevealed:    p.mayorRevealed,
    votesReceived:    p.votesReceived ?? 0,
    votersAgainstMe:  (p.votersAgainstMe ?? []).map(v => ({
      userId: String(v.userId),
      name:   v.name,
    })),
  }))
}

interface RawTally {
  gameId: string
  townTotal: number
  mafiaTotal: number
  aliveTownCount: number
  aliveMafiaCount: number
  townLeading: boolean
}

export async function getTally(gameId: string): Promise<GameTally> {
  // Backend returns townTotal/mafiaTotal — map to the GameTally shape and
  // compute percentages so the StepTallyBar never calls .toFixed() on undefined.
  const raw = await apiFetch<RawTally>(`/api/games/${gameId}/tally`)
  const total = raw.townTotal + raw.mafiaTotal
  return {
    townSteps:       raw.townTotal,
    mafiaSteps:      raw.mafiaTotal,
    totalSteps:      total,
    townPercentage:  total > 0 ? (raw.townTotal  / total) * 100 : 50,
    mafiaPercentage: total > 0 ? (raw.mafiaTotal / total) * 100 : 50,
  }
}

export async function joinGame(gameId: string, userId: number): Promise<{ status: string }> {
  // Backend returns { result, gameId, userId } — map 'result' → 'status'
  const res = await apiFetch<{ result: string; gameId: string; userId: number }>(
    `/api/games/${gameId}/join`,
    { method: 'POST', body: JSON.stringify({ userId }) }
  )
  return { status: res.result }
}

export async function addStepsToPlayer(
  gameId: string,
  playerId: string,
  steps: number
): Promise<{ newLifetimeSteps: number }> {
  return apiFetch(`/api/games/${gameId}/players/${playerId}/steps`, {
    method: 'PATCH',
    body: JSON.stringify({ steps }),
  })
}

export async function submitAction(
  gameId: string,
  actorPlayerId: string,   // PlayerId string (e.g. "player_abc123"), not userId int
  actionType: ActionType,
  targetPlayerId?: string  // PlayerId string, optional
): Promise<void> {
  // Backend expects { actorPlayerId, type, targetPlayerId? }
  // 'type' uses backend-native names (CastVote, MafiaKillTarget, …)
  const body: Record<string, string> = {
    actorPlayerId,
    type: ACTION_TYPE_MAP[actionType],
  }
  if (targetPlayerId) body.targetPlayerId = targetPlayerId
  await apiFetch(`/api/games/${gameId}/actions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// SWR fetcher
export const fetcher = async <T>(endpoint: string): Promise<T> => {
  return apiFetch<T>(endpoint)
}
