'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { getEvents, type GameEvent, type Player } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Vote,
  Skull,
  Heart,
  Search,
  Shield,
  VolumeX,
  Crown,
  Sunrise,
  Moon,
  Sparkles,
  Trophy,
  Sword,
  AlertCircle,
  Activity,
} from 'lucide-react'

// ── Role label (backend role enum int → readable name) ──────────────────────
function roleLabel(role: unknown): string {
  switch (role) {
    case 0:   return 'Doctor'
    case 1:   return 'Detective'
    case 2:   return 'Bodyguard'
    case 3:   return 'Mayor'
    case 4:   return 'Commoner'
    case 100: return 'Mafia Leader'
    case 101: return 'Silencer'
    case 102: return 'Vanilla Mafia'
    default:  return String(role ?? 'Unknown')
  }
}

interface RenderedEvent {
  icon: React.ComponentType<{ className?: string }>
  color: string
  message: React.ReactNode
  meta?: string
}

// Looks up a player name in the live players list using a userId.
function nameForUser(players: Player[] | undefined, uid: unknown): string | null {
  if (uid == null || !players) return null
  const u = String(uid)
  return players.find((p) => p.userId === u)?.name ?? null
}

// Convert one event → renderable bits.
function renderEvent(e: GameEvent, players: Player[] | undefined): RenderedEvent {
  const p = e.payload as Record<string, unknown>

  const playerName = (p.playerName as string | undefined) ?? 'A player'
  const targetName = (p.targetPlayerName as string | undefined) ?? 'someone'
  const inquired   = (p.inquiredAboutPlayerName as string | undefined) ?? 'someone'
  const targetUid  = e.targetUserId
  const targetUser =
    nameForUser(players, targetUid) ?? (targetUid != null ? `User ${targetUid}` : 'a player')

  switch (e.type) {
    case 'GameStarted':
      return {
        icon: Sparkles,
        color: 'text-amber-400',
        message: (
          <span>
            <strong>Game started</strong> — Day 1 begins
          </span>
        ),
      }
    case 'GameEnded': {
      const w = p.winningFaction === 1 ? 'MAFIA' : 'TOWN'
      return {
        icon: Trophy,
        color: 'text-yellow-400',
        message: (
          <span>
            <strong>{w}</strong> wins the game
          </span>
        ),
      }
    }
    case 'PhaseChanged': {
      const to = String(p.toPhase ?? '')
      const isMorning = to === 'MORNING' || to === 'Morning' || to === '1'
      return {
        icon: isMorning ? Sunrise : Moon,
        color: isMorning ? 'text-amber-300' : 'text-indigo-300',
        message: (
          <span>
            Phase change: <strong>{String(p.fromPhase ?? '?')}</strong> →{' '}
            <strong>{String(p.toPhase ?? '?')}</strong>
          </span>
        ),
      }
    }
    case 'PlayerEliminated': {
      const byVote = p.causeWasVote === true
      return {
        icon: Skull,
        color: 'text-red-400',
        message: (
          <span>
            <strong>{playerName}</strong>{' '}
            was {byVote ? 'voted out' : 'killed in the night'}
          </span>
        ),
      }
    }
    case 'PlayerResurrected':
      return {
        icon: Heart,
        color: 'text-emerald-400',
        message: (
          <span>
            <strong>{playerName}</strong> returned from the dead
          </span>
        ),
      }
    case 'MayorRevealed':
      return {
        icon: Crown,
        color: 'text-yellow-400',
        message: (
          <span>
            <strong>{playerName}</strong> revealed themselves as the{' '}
            <strong>Mayor</strong>
          </span>
        ),
      }
    case 'NoEliminationTie':
      return {
        icon: AlertCircle,
        color: 'text-zinc-400',
        message: <span>Vote tied — no one eliminated this morning</span>,
      }
    case 'VoteTallyAnnounced':
      return {
        icon: Vote,
        color: 'text-zinc-300',
        message: <span>Morning vote tally announced</span>,
      }
    case 'YourVoteRecorded': {
      const power = Number(p.votePowerUsed ?? 0)
      const tgt = (p.targetPlayerName as string | undefined) ?? targetUser
      return {
        icon: Vote,
        color: 'text-orange-300',
        message: (
          <span>
            <strong>{targetUser}</strong> voted against{' '}
            <strong>{tgt}</strong>
            {power > 0 ? ` (${power} power)` : ''}
          </span>
        ),
      }
    }
    case 'MafiaKillDecided':
      return {
        icon: Sword,
        color: 'text-red-300',
        message: (
          <span>
            Mafia decided to eliminate <strong>{targetName}</strong>
          </span>
        ),
      }
    case 'YourRoleAssigned':
      return {
        icon: Sparkles,
        color: 'text-blue-300',
        message: (
          <span>
            <strong>{targetUser}</strong> assigned role:{' '}
            <strong>{roleLabel(p.assignedRole)}</strong>
          </span>
        ),
      }
    case 'YouWereSilenced':
      return {
        icon: VolumeX,
        color: 'text-orange-400',
        message: (
          <span>
            <strong>{targetUser}</strong> was silenced for this morning
          </span>
        ),
      }
    case 'YouWereSaved':
      return {
        icon: Heart,
        color: 'text-emerald-300',
        message: (
          <span>
            <strong>{targetUser}</strong> was saved by the Doctor
          </span>
        ),
      }
    case 'YouWereProtected':
      return {
        icon: Shield,
        color: 'text-cyan-300',
        message: (
          <span>
            <strong>{targetUser}</strong> was protected by the Bodyguard
          </span>
        ),
      }
    case 'YouSavedPlayer':
      return {
        icon: Heart,
        color: 'text-emerald-300',
        message: (
          <span>
            <strong>{targetUser}</strong> (Doctor) saved <strong>{playerName}</strong>
          </span>
        ),
      }
    case 'YouProtectedPlayer':
      return {
        icon: Shield,
        color: 'text-cyan-300',
        message: (
          <span>
            <strong>{targetUser}</strong> (Bodyguard) protected{' '}
            <strong>{playerName}</strong>
          </span>
        ),
      }
    case 'YouSilencedPlayer':
      return {
        icon: VolumeX,
        color: 'text-orange-300',
        message: (
          <span>
            <strong>{targetUser}</strong> (Silencer) silenced{' '}
            <strong>{playerName}</strong>
          </span>
        ),
      }
    case 'DetectiveResult': {
      const isMafia = p.reportedAsMafia === true
      return {
        icon: Search,
        color: 'text-blue-300',
        message: (
          <span>
            <strong>{targetUser}</strong> (Detective) investigated{' '}
            <strong>{inquired}</strong> → reported as{' '}
            <strong className={isMafia ? 'text-red-400' : 'text-emerald-400'}>
              {isMafia ? 'MAFIA' : 'NOT MAFIA'}
            </strong>
          </span>
        ),
      }
    }
    case 'YouAreResurrected':
      return {
        icon: Sparkles,
        color: 'text-emerald-300',
        message: (
          <span>
            <strong>{targetUser}</strong> resurrected
          </span>
        ),
      }
    case 'YouWereEliminated':
      return {
        icon: Skull,
        color: 'text-red-400',
        message: (
          <span>
            <strong>{targetUser}</strong> was eliminated
          </span>
        ),
      }
    case 'VotesAgainstYouUpdate':
      return {
        icon: Vote,
        color: 'text-zinc-400',
        message: (
          <span>
            Vote-power against <strong>{targetUser}</strong>:{' '}
            <strong>{String(p.totalVotePowerAgainstMe ?? 0)}</strong>
          </span>
        ),
      }
    case 'MafiaChatMessage':
      return {
        icon: Sword,
        color: 'text-red-300',
        message: <span>Mafia chat: {String(p.text ?? '')}</span>,
      }
    case 'StepTallyUpdate':
      return {
        icon: Activity,
        color: 'text-zinc-400',
        message: <span>Step tally updated</span>,
      }
    default:
      return {
        icon: Activity,
        color: 'text-zinc-400',
        message: <span>{e.type}</span>,
      }
  }
}

function formatTime(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface Props {
  gameId: string
  players: Player[] | undefined
  isConfigured: boolean
}

export function EventLog({ gameId, players, isConfigured }: Props) {
  const { data: events, isLoading } = useSWR<GameEvent[]>(
    isConfigured ? `/api/games/${gameId}/events` : null,
    () => getEvents(gameId, { limit: 300 }),
    { refreshInterval: 3000 }
  )

  const items = useMemo(() => {
    if (!events) return []
    // Backend returns newest first — keep that order so latest sits on top.
    return events.map((e) => ({ event: e, ...renderEvent(e, players) }))
  }, [events, players])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Activity Log
          {events && events.length > 0 && (
            <Badge variant="secondary" className="ml-auto font-mono">
              {events.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No events yet. Activity will appear here as the game progresses.
          </div>
        ) : (
          <ScrollArea className="h-[480px]">
            <ol className="divide-y divide-border">
              {items.map(({ event, icon: Icon, color, message }) => (
                <li
                  key={event.id}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-secondary/30 transition-colors"
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug">{message}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Day {event.dayNumber} · {formatTime(event.occurredAtMs)}
                      </span>
                      {event.visibility !== 'Public' && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1.5 h-4"
                        >
                          {event.visibility}
                        </Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
