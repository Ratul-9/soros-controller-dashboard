'use client'

import { useState, use } from 'react'
import useSWR from 'swr'
import {
  getGame,
  getPlayer,
  getPlayers,
  getEvents,
  getPlayerNotifications,
  getPlayerActions,
  getApiConfig,
  submitAction,
  addStepsToPlayer,
  type Game,
  type Player,
  type GameEvent,
  type PlayerNotification,
  type PlayerAction,
  type ActionType,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GameIdChip } from '@/components/dashboard/game-id-chip'
import { RoleBadge } from '@/components/dashboard/role-badge'
import { FactionBadge } from '@/components/dashboard/faction-badge'
import { PlayerStatusBadge } from '@/components/dashboard/player-status-badge'
import { PhaseIndicator } from '@/components/dashboard/phase-indicator'
import { renderEvent, formatTime } from '@/components/dashboard/event-log'
import {
  ArrowLeft,
  Footprints,
  Zap,
  Bell,
  Activity,
  VolumeX,
  Megaphone,
  Loader2,
  Drama,
  Vote,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// In-game character name assigned per role — mirrors the Flutter app's
// character_profiles.dart so the operator sees what the player sees.
const CHARACTER_NAMES: Record<string, string> = {
  Doctor:        'AMELIA HART',
  Detective:     'ARTHUR KANE',
  Bodyguard:     'MARCUS COLE',
  Mayor:         'REBECCA SINCLAIR',
  Commoner:      'MARGARET BLACKTHORN',
  MafiaLeader:   'THOMAS REED',
  SilencerMafia: 'SOPHIA VALE',
  VanillaMafia:  'NATHAN GRAVES',
}

const ROLE_ACTIONS: Record<string, { value: ActionType; label: string; needsTarget: boolean }[]> = {
  Doctor:        [{ value: 'DOCTOR_SAVE',           label: 'Save a player',        needsTarget: true }],
  Detective:     [{ value: 'DETECTIVE_INVESTIGATE', label: 'Investigate a player', needsTarget: true }],
  Bodyguard:     [{ value: 'BODYGUARD_PROTECT',     label: 'Protect a player',     needsTarget: true }],
  Mayor:         [{ value: 'MAYOR_REVEAL',          label: 'Reveal as Mayor',      needsTarget: false }],
  Commoner:      [],
  MafiaLeader:   [{ value: 'MAFIA_KILL',            label: 'Eliminate a player',   needsTarget: true }],
  SilencerMafia: [{ value: 'SILENCER_SILENCE',      label: 'Silence a player',     needsTarget: true }],
  VanillaMafia:  [],
}

const ACTION_LABELS: Record<string, string> = {
  CastVote:         'Cast vote',
  RevealAsMayor:    'Revealed as Mayor',
  MafiaKillTarget:  'Mafia kill',
  DoctorSave:       'Doctor save',
  DetectiveInquire: 'Detective investigation',
  BodyguardProtect: 'Bodyguard protection',
  SilencerSilence:  'Silence',
  MafiaLeaderLie:   'Armed a lie',
}

function StatCard({ label, value, sub, icon: Icon }: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-xl font-bold font-mono mt-1">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function PlayerActionControls({ gameId, player, players, onActed }: {
  gameId: string
  player: Player
  players: Player[] | undefined
  onActed: () => void
}) {
  const [actionType, setActionType] = useState<ActionType | ''>('')
  const [targetId, setTargetId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [steps, setSteps] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const available = [
    ...((player.role && ROLE_ACTIONS[player.role]) || []),
    { value: 'VOTE' as ActionType, label: 'Cast vote', needsTarget: true },
    { value: 'SKIP' as ActionType, label: 'Skip / pass', needsTarget: false },
  ]
  const selected = available.find(a => a.value === actionType)
  const needsTarget = selected?.needsTarget ?? false

  const handlePerform = async () => {
    if (!actionType) return
    setIsSubmitting(true)
    try {
      await submitAction(
        gameId,
        player.id,
        actionType,
        needsTarget && targetId ? targetId : undefined
      )
      toast.success('Action applied', {
        description: `${player.name}: ${selected?.label}`,
      })
      setActionType('')
      setTargetId('')
      onActed()
    } catch (error) {
      // The backend now answers synchronously with the exact rule it hit
      // (doctor repeat save, bodyguard self-protect, daily step gate, …).
      toast.error('Action rejected', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSteps = async () => {
    const stepsNum = parseInt(steps)
    if (!steps || stepsNum <= 0) return
    setIsAdding(true)
    try {
      const result = await addStepsToPlayer(gameId, player.id, stepsNum)
      toast.success(`Added ${stepsNum.toLocaleString()} steps`, {
        description: `${player.name} now has ${result.newLifetimeSteps.toLocaleString()} lifetime steps`,
      })
      setSteps('')
      onActed()
    } catch (error) {
      toast.error('Failed to add steps', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Perform Action as {player.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Action ({player.role ?? 'no role yet'})
            </Label>
            <Select value={actionType} onValueChange={(v) => { setActionType(v as ActionType); setTargetId('') }}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Choose what this player does" />
              </SelectTrigger>
              <SelectContent>
                {available.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsTarget && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Target player</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {/* Self-targeting is legal for votes and the Doctor's save
                      (first night only — the backend enforces the day rule),
                      so include the actor themselves for those actions. */}
                  {players
                    ?.filter(p =>
                      p.id !== player.id ||
                      actionType === 'DOCTOR_SAVE' ||
                      actionType === 'VOTE')
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.id === player.id ? ' (self)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full"
            size="sm"
            disabled={!actionType || (needsTarget && !targetId) || isSubmitting}
            onClick={handlePerform}
          >
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
              : <>Perform{selected ? `: ${selected.label}` : ''}</>}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            The backend enforces phase, role, status and game rules — rejections
            show the exact reason (same message the player would see in-app).
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Footprints className="h-4 w-4" />
            Add Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="e.g. 5000"
            min="1"
            className="font-mono text-sm bg-secondary border-border"
          />
          <Button
            onClick={handleAddSteps}
            disabled={!steps || parseInt(steps) <= 0 || isAdding}
            size="sm"
            className="w-full"
          >
            {isAdding
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</>
              : <><Footprints className="h-4 w-4 mr-2" />Add Steps</>}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Steps count toward today&apos;s power threshold and the live tally —
            the app updates immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PlayerDetailPage({ params }: {
  params: Promise<{ gameId: string; playerId: string }>
}) {
  const { gameId, playerId } = use(params)
  const isConfigured = typeof window !== 'undefined' && getApiConfig() !== null

  const { data: game } = useSWR<Game>(
    isConfigured ? `/api/games/${gameId}#detail` : null,
    () => getGame(gameId),
    { refreshInterval: 5000 }
  )
  const { data: player, isLoading: playerLoading, mutate: mutatePlayer } = useSWR<Player>(
    isConfigured ? `/api/games/${gameId}/players/${playerId}` : null,
    () => getPlayer(gameId, playerId),
    { refreshInterval: 4000 }
  )
  const { data: players, mutate: mutatePlayers } = useSWR<Player[]>(
    isConfigured ? `/api/games/${gameId}/players#forplayer` : null,
    () => getPlayers(gameId),
    { refreshInterval: 5000 }
  )
  const { data: events } = useSWR<GameEvent[]>(
    isConfigured ? `/api/games/${gameId}/events#player-${playerId}` : null,
    () => getEvents(gameId, { limit: 1000 }),
    { refreshInterval: 4000 }
  )
  const { data: notifications } = useSWR<PlayerNotification[]>(
    isConfigured ? `/api/games/${gameId}/players/${playerId}/notifications#page` : null,
    () => getPlayerNotifications(gameId, playerId),
    { refreshInterval: 5000 }
  )
  const { data: actions } = useSWR<PlayerAction[]>(
    isConfigured ? `/api/games/${gameId}/players/${playerId}/actions` : null,
    () => getPlayerActions(gameId, playerId),
    { refreshInterval: 5000 }
  )

  if (playerLoading || !player) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const uid = Number(player.userId)
  // Everything that involves this player — as the recipient of a private
  // event or as the subject of a public one (eliminated, resurrected,
  // voted for, investigated, saved, …).
  const playerEvents = (events ?? []).filter(e => {
    if (e.targetUserId === uid) return true
    const p = e.payload as Record<string, unknown>
    return (
      p.playerId === player.id ||
      p.playerName === player.name ||
      p.targetPlayerId === player.id ||
      p.targetPlayerName === player.name ||
      p.inquiredAboutPlayerId === player.id ||
      p.inquiredAboutPlayerName === player.name
    )
  })

  const characterName = player.role ? CHARACTER_NAMES[player.role] ?? null : null
  const refreshAll = () => { mutatePlayer(); mutatePlayers() }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/games/${gameId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Game
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold">{player.name}</h1>
          <RoleBadge role={player.role} />
          <FactionBadge faction={player.faction} />
          <PlayerStatusBadge status={player.status} />
          {player.isSilenced && (
            <Badge variant="outline" className="text-orange-400 border-orange-400/50">
              <VolumeX className="h-3 w-3 mr-1" />
              Silenced today
            </Badge>
          )}
          {player.mayorRevealed && (
            <Badge variant="outline" className="text-amber-400 border-amber-400/50">
              <Megaphone className="h-3 w-3 mr-1" />
              Mayor revealed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
          <GameIdChip id={gameId} />
          {game?.status === 'ACTIVE' && <PhaseIndicator phase={game.phase} />}
          {game && game.status !== 'LOBBY' && (
            <span className="font-mono">Day {game.day}</span>
          )}
        </div>
      </div>

      {/* Identity strip */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {characterName && (
          <span className="inline-flex items-center gap-1.5">
            <Drama className="h-3.5 w-3.5" />
            Character: <span className="text-foreground font-medium">{characterName}</span>
          </span>
        )}
        <span className="font-mono">player {player.id}</span>
        <span className="font-mono">user {player.userId}</span>
      </div>

      {/* Step + vote stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Steps today"
          value={player.stepsToday.toLocaleString()}
          sub="resets each morning — powers unlock at 6,000"
          icon={Footprints}
        />
        <StatCard
          label="Game steps"
          value={player.activeSteps.toLocaleString()}
          sub="scored toward the faction tally"
          icon={Footprints}
        />
        <StatCard
          label="Lifetime steps"
          value={player.lifetimeSteps.toLocaleString()}
          icon={Footprints}
        />
        <StatCard
          label="Vote power against"
          value={String(player.votesReceived)}
          sub={player.votersAgainstMe.map(v => v.name).join(', ') || 'no voters'}
          icon={Vote}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Logs */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Player Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="activity">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="activity">
                    <Activity className="h-3.5 w-3.5 mr-1" />
                    Activity ({playerEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="powers">
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Powers used ({actions?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="notifs">
                    <Bell className="h-3.5 w-3.5 mr-1" />
                    Notifications ({notifications?.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                {/* Activity */}
                <TabsContent value="activity" className="pt-3">
                  <ScrollArea className="h-[420px] pr-2">
                    {playerEvents.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No activity recorded for this player yet.
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {playerEvents.map(e => {
                          const r = renderEvent(e, players)
                          const Icon = r.icon
                          return (
                            <li key={e.id} className="flex items-start gap-2 text-sm">
                              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${r.color}`} />
                              <div className="min-w-0">
                                <div className="leading-snug">{r.message}</div>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  Day {e.dayNumber} · {formatTime(e.occurredAtMs)}
                                </span>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Powers used */}
                <TabsContent value="powers" className="pt-3">
                  <ScrollArea className="h-[420px] pr-2">
                    {!actions || actions.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        This player hasn&apos;t used any powers yet.
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {actions.map(a => (
                          <li key={a.id} className="rounded border border-border p-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-sm font-medium">
                                {ACTION_LABELS[a.type] ?? a.type}
                              </span>
                              {a.targetPlayerName && (
                                <span className="text-sm text-muted-foreground">
                                  → {a.targetPlayerName}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Day {a.dayNumber} · {new Date(a.submittedAtMs).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifs" className="pt-3">
                  <ScrollArea className="h-[420px] pr-2">
                    {!notifications || notifications.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No notifications sent to this player yet.
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {notifications.map(n => (
                          <li key={n.id} className="rounded border border-border p-2">
                            <div className="flex items-center gap-2">
                              <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-sm font-medium">{n.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(n.sentAtMs).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="lg:col-span-2">
          <PlayerActionControls
            gameId={gameId}
            player={player}
            players={players}
            onActed={refreshAll}
          />
        </div>
      </div>
    </div>
  )
}
