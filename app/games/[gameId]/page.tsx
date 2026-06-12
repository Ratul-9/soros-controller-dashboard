'use client'

import { useState, use } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  getGame,
  getPlayers,
  getTally,
  getApiConfig,
  joinGame,
  submitAction,
  addStepsToPlayer,
  forcePhase,
  deleteGame,
  type Game,
  type Player,
  type GameTally,
  type ActionType,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { GameIdChip } from '@/components/dashboard/game-id-chip'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { PhaseIndicator } from '@/components/dashboard/phase-indicator'
import { RoleBadge } from '@/components/dashboard/role-badge'
import { FactionBadge } from '@/components/dashboard/faction-badge'
import { PlayerStatusBadge } from '@/components/dashboard/player-status-badge'
import { WinnerBadge } from '@/components/dashboard/winner-badge'
import { EventLog } from '@/components/dashboard/event-log'
import {
  ArrowLeft,
  Footprints,
  ChevronDown,
  AlertTriangle,
  UserPlus,
  Zap,
  Sun,
  Moon,
  Clock,
  Trash2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Which actions each role can perform. Vote + Skip are appended for everyone.
// (The backend still enforces phase/role/status — we show all, submit, and let
// it validate.)
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

function actionsForPlayer(player: Player): { value: ActionType; label: string; needsTarget: boolean }[] {
  const roleActions = (player.role && ROLE_ACTIONS[player.role]) || []
  return [
    ...roleActions,
    { value: 'VOTE', label: 'Cast vote', needsTarget: true },
    { value: 'SKIP', label: 'Skip / pass', needsTarget: false },
  ]
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'VOTE', label: 'Vote' },
  { value: 'MAFIA_KILL', label: 'Mafia Kill' },
  { value: 'DOCTOR_SAVE', label: 'Doctor Save' },
  { value: 'DETECTIVE_INVESTIGATE', label: 'Detective Investigate' },
  { value: 'BODYGUARD_PROTECT', label: 'Bodyguard Protect' },
  { value: 'SILENCER_SILENCE', label: 'Silencer Silence' },
  { value: 'MAYOR_REVEAL', label: 'Mayor Reveal' },
  { value: 'SKIP', label: 'Skip' },
]

function StepTallyBar({ tally }: { tally: GameTally | undefined }) {
  if (!tally) {
    return <Skeleton className="h-10 w-full" />
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-town font-medium">Town: {tally.townPercentage.toFixed(1)}%</span>
        <span className="text-mafia font-medium">Mafia: {tally.mafiaPercentage.toFixed(1)}%</span>
      </div>
      <div className="h-6 rounded-full overflow-hidden bg-secondary flex">
        <div 
          className="bg-town h-full transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${tally.townPercentage}%` }}
        >
          {tally.townPercentage > 10 && (
            <span className="text-xs font-mono text-white">{tally.townSteps}</span>
          )}
        </div>
        <div 
          className="bg-mafia h-full transition-all duration-500 flex items-center pl-2"
          style={{ width: `${tally.mafiaPercentage}%` }}
        >
          {tally.mafiaPercentage > 10 && (
            <span className="text-xs font-mono text-white">{tally.mafiaSteps}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayersTable({ players, isLoading, showVotes, onPlayerClick }: { players: Player[] | undefined; isLoading: boolean; showVotes: boolean; onPlayerClick: (p: Player) => void }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No players in this game yet
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground">Name</TableHead>
          <TableHead className="text-muted-foreground">Role</TableHead>
          <TableHead className="text-muted-foreground">Faction</TableHead>
          <TableHead className="text-muted-foreground">Status</TableHead>
          <TableHead className="text-muted-foreground">Steps</TableHead>
          <TableHead className="text-muted-foreground">Today</TableHead>
          {showVotes && <TableHead className="text-muted-foreground">Votes Against</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const isMafia = player.faction === 'MAFIA'
          const isDead = player.status === 'Eliminated' || player.status === 'DeadForever'
          const hasVotes = player.votesReceived > 0

          return (
            <TableRow
              key={player.id}
              onClick={() => onPlayerClick(player)}
              className={cn(
                "border-border cursor-pointer hover:bg-secondary/40",
                isMafia && "bg-mafia/5",
                isDead && "opacity-50"
              )}
            >
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell><RoleBadge role={player.role} /></TableCell>
              <TableCell><FactionBadge faction={player.faction} /></TableCell>
              <TableCell><PlayerStatusBadge status={player.status} /></TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1 font-mono text-sm">
                  <Footprints className="h-4 w-4 text-muted-foreground" />
                  {player.lifetimeSteps}
                </span>
              </TableCell>
              <TableCell>
                <span className={cn(
                  "font-mono text-sm",
                  player.stepsToday >= 6000 ? "text-active font-semibold" : "text-muted-foreground"
                )}>
                  {player.stepsToday.toLocaleString()}
                </span>
              </TableCell>
              {showVotes && (
                <TableCell>
                  {hasVotes ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-destructive">
                        {player.votesReceived} pts
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {player.votersAgainstMe.map(v => (
                          <span
                            key={v.userId}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive"
                          >
                            {v.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function AddStepsSection({ gameId, players, onSuccess }: { gameId: string; players: Player[] | undefined; onSuccess: () => void }) {
  const [playerId, setPlayerId] = useState('')
  const [steps, setSteps] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddSteps = async () => {
    const stepsNum = parseInt(steps)
    if (!playerId || !steps || stepsNum <= 0) return
    setIsAdding(true)

    try {
      const result = await addStepsToPlayer(gameId, playerId, stepsNum)
      const player = players?.find(p => p.id === playerId)
      toast.success(`Added ${stepsNum.toLocaleString()} steps`, {
        description: `${player?.name ?? 'Player'} now has ${result.newLifetimeSteps.toLocaleString()} lifetime steps`,
      })
      setSteps('')
      onSuccess()
    } catch (error) {
      toast.error('Failed to add steps', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Footprints className="h-4 w-4" />
          Add Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Player</Label>
          <Select value={playerId} onValueChange={setPlayerId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {p.lifetimeSteps.toLocaleString()} steps
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stepsToAdd" className="text-xs text-muted-foreground">Steps to Add</Label>
          <Input
            id="stepsToAdd"
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="e.g. 5000"
            min="1"
            className="font-mono text-sm bg-secondary border-border"
          />
        </div>
        <Button
          onClick={handleAddSteps}
          disabled={!playerId || !steps || parseInt(steps) <= 0 || isAdding}
          size="sm"
          className="w-full"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Footprints className="h-4 w-4 mr-2" />
              Add Steps
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function AddPlayerSection({ gameId, onSuccess }: { gameId: string; onSuccess: () => void }) {
  const [userId, setUserId] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [resultStatus, setResultStatus] = useState<string | null>(null)

  const handleAddPlayer = async () => {
    if (!userId) return
    setIsAdding(true)
    setResultStatus(null)
    
    try {
      const result = await joinGame(gameId, parseInt(userId))
      setResultStatus(result.status)
      if (result.status === 'Joined') {
        toast.success('Player added to lobby')
        setUserId('')
        onSuccess()
      } else {
        toast.warning(result.status)
      }
    } catch (error) {
      toast.error('Failed to add player', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Player
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="userId" className="text-xs text-muted-foreground">User ID</Label>
          <Input
            id="userId"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="font-mono text-sm bg-secondary border-border"
          />
        </div>
        <Button 
          onClick={handleAddPlayer} 
          disabled={!userId || isAdding}
          size="sm"
          className="w-full"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            'Add to Lobby'
          )}
        </Button>
        {resultStatus && (
          <div className={cn(
            "text-xs px-2 py-1 rounded",
            resultStatus === 'Joined' ? "bg-active/10 text-active" : "bg-lobby/10 text-lobby"
          )}>
            {resultStatus}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SubmitActionSection({ gameId, players }: { gameId: string; players: Player[] | undefined }) {
  const [isOpen, setIsOpen] = useState(false)
  const [actorId, setActorId] = useState('')
  const [actionType, setActionType] = useState<ActionType | ''>('')
  const [targetId, setTargetId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const needsTarget = actionType && !['MAYOR_REVEAL', 'SKIP'].includes(actionType)

  const handleSubmit = async () => {
    if (!actorId || !actionType) return
    setIsSubmitting(true)
    
    try {
      await submitAction(
        gameId,
        actorId,                                    // already a string PlayerId
        actionType,
        needsTarget && targetId ? targetId : undefined  // already a string PlayerId
      )
      toast.success('Action submitted', {
        description: 'Action accepted (202)',
      })
      setActorId('')
      setActionType('')
      setTargetId('')
    } catch (error) {
      toast.error('Failed to submit action', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-secondary/50 rounded-t-lg transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Submit Action
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Actor Player</Label>
              <Select value={actorId} onValueChange={setActorId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.role ? `(${p.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Action Type</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsTarget && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Target Player</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.filter(p => p.id !== actorId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              onClick={handleSubmit} 
              disabled={!actorId || !actionType || isSubmitting}
              size="sm"
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Action'
              )}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function AdminOverridesSection({ gameId, game, onChanged }: { gameId: string; game: Game; onChanged: () => void }) {
  const [forcing, setForcing] = useState<string | null>(null)
  const isActive = game.status === 'ACTIVE'

  const handleForcePhase = async (to: 'Morning' | 'Night' | 'NightResolution') => {
    setForcing(to)
    try {
      await forcePhase(gameId, to)
      toast.success(`Forcing → ${to}`, {
        description: 'Auto-scheduler paused. Refreshing game state…',
      })
      // Give the async worker a moment, then refresh.
      setTimeout(onChanged, 600)
    } catch (error) {
      toast.error('Failed to force phase', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setTimeout(() => setForcing(null), 600)
    }
  }

  return (
    <Card className="bg-secondary/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          Phase Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current</span>
          <span className="font-mono">
            Day {game.day} · {game.phase}
          </span>
        </div>

        {/* Force Phase — advances (rolling the day) and pauses auto-scheduler */}
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" disabled={!isActive || forcing !== null}
              onClick={() => handleForcePhase('Morning')}>
              {forcing === 'Morning' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sun className="h-4 w-4 mr-1" />}
              Morning
            </Button>
            <Button variant="outline" size="sm" disabled={!isActive || forcing !== null}
              onClick={() => handleForcePhase('Night')}>
              {forcing === 'Night' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Moon className="h-4 w-4 mr-1" />}
              Night
            </Button>
            <Button variant="outline" size="sm" disabled={!isActive || forcing !== null}
              onClick={() => handleForcePhase('NightResolution')}>
              {forcing === 'NightResolution' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4 mr-1" />}
              Compute
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {isActive
              ? 'Forcing a phase pauses the auto real-time scheduler. Night → Morning rolls to the next day.'
              : 'Game must be Active to force phases.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Danger zone: force-delete the game from memory + database ────────────────
function DangerZoneSection({ gameId, game, onDeleted }: { gameId: string; game: Game; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteGame(gameId)
      toast.success('Game deleted', {
        description: 'Removed from memory and the database.',
      })
      onDeleted()
    } catch (error) {
      toast.error('Failed to delete game', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setDeleting(false)
    }
  }

  return (
    <Card className="bg-destructive/5 border-destructive/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full" disabled={deleting}>
              {deleting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
                : <><Trash2 className="h-4 w-4 mr-2" />Force Delete Game</>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Force delete this game?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes{' '}
                <span className="font-semibold">{game.name || gameId.slice(0, 8)}</span>{' '}
                from memory <span className="font-semibold">and the database</span> —
                players, events, votes and notifications are all erased. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Stops the game and wipes it everywhere. Irreversible.
        </p>
      </CardContent>
    </Card>
  )
}

export default function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params)
  const router = useRouter()
  const isConfigured = typeof window !== 'undefined' && getApiConfig() !== null

  const { data: game, isLoading: gameLoading, mutate: mutateGame } = useSWR<Game>(
    isConfigured ? `/api/games/${gameId}` : null,
    () => getGame(gameId),
    { refreshInterval: 5000 }
  )

  const { data: players, isLoading: playersLoading, mutate: mutatePlayers } = useSWR<Player[]>(
    isConfigured ? `/api/games/${gameId}/players` : null,
    () => getPlayers(gameId),
    { refreshInterval: 5000 }
  )

  const { data: tally } = useSWR<GameTally>(
    isConfigured && game?.status === 'ACTIVE' ? `/api/games/${gameId}/tally` : null,
    () => getTally(gameId),
    { refreshInterval: 5000 }
  )

  if (gameLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground mb-4">Game not found</p>
        <Button variant="outline" onClick={() => router.push('/games')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/games">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          {game.name && <h1 className="text-lg font-bold mr-1">{game.name}</h1>}
          <GameIdChip id={game.id} />
          <StatusBadge status={game.status} />
          {game.status === 'ACTIVE' && <PhaseIndicator phase={game.phase} />}
          {game.status !== 'LOBBY' && (
            <span className="font-mono text-sm text-muted-foreground">Day {game.day}</span>
          )}
          {game.status === 'GAMEOVER' && game.winner && (
            <WinnerBadge winner={game.winner} />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - 60% */}
        <div className="lg:col-span-3 space-y-6">
          {/* Step Tally (Active games only) */}
          {game.status === 'ACTIVE' && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Step Tally</CardTitle>
              </CardHeader>
              <CardContent>
                <StepTallyBar tally={tally} />
              </CardContent>
            </Card>
          )}

          {/* Players Table */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Players ({players?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PlayersTable
                players={players}
                isLoading={playersLoading}
                showVotes={game.phase === 'Morning'}
                onPlayerClick={(p) => router.push(`/games/${gameId}/players/${p.id}`)}
              />
            </CardContent>
          </Card>

          {/* Activity Log — full audit feed for this game */}
          <EventLog
            gameId={gameId}
            players={players}
            isConfigured={isConfigured}
          />
        </div>

        {/* Right Panel - 40% Admin Controls */}
        <div className="lg:col-span-2 space-y-4">
          <AddPlayerSection gameId={gameId} onSuccess={() => mutatePlayers()} />
          <AddStepsSection gameId={gameId} players={players} onSuccess={() => mutatePlayers()} />
          <SubmitActionSection gameId={gameId} players={players} />
          <AdminOverridesSection
            gameId={gameId}
            game={game}
            onChanged={() => { mutateGame(); mutatePlayers() }}
          />
          <DangerZoneSection
            gameId={gameId}
            game={game}
            onDeleted={() => router.push('/games')}
          />
        </div>
      </div>
    </div>
  )
}