'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { getStatus, getGames, getApiConfig, getEvents, type Game, type ServerStatus, type GameEvent } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GameIdChip } from '@/components/dashboard/game-id-chip'
import { PhaseIndicator } from '@/components/dashboard/phase-indicator'
import { Users, Gamepad2, Clock, Trophy, Eye, Activity } from 'lucide-react'

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  pulse = false,
  isLoading = false 
}: { 
  title: string
  value: number | string
  icon: React.ElementType
  color: 'yellow' | 'green' | 'gray' | 'purple'
  pulse?: boolean
  isLoading?: boolean
}) {
  const colorClasses = {
    yellow: 'text-lobby bg-lobby/10 border-lobby/20',
    green: 'text-active bg-active/10 border-active/20',
    gray: 'text-finished bg-finished/10 border-finished/20',
    purple: 'text-town bg-town/10 border-town/20',
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold font-mono">{value}</p>
            )}
          </div>
          <div className={`relative p-3 rounded-xl border ${colorClasses[color]}`}>
            {pulse && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-active opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-active" />
              </span>
            )}
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentActivityFeed({ events, isLoading }: { events: GameEvent[] | undefined; isLoading: boolean }) {
  const formatEventType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'CastVote': 'Voted',
      'MafiaKillTarget': 'Kill targeted',
      'DoctorSave': 'Saved',
      'DetectiveInquire': 'Investigated',
      'BodyguardProtect': 'Protected',
      'SilencerSilence': 'Silenced',
      'RevealAsMayor': 'Revealed as Mayor',
      'PlayerEliminated': 'Eliminated',
      'PhaseChanged': 'Phase changed',
    }
    return typeMap[type] || type
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const displayEvents = events?.slice(0, 20) || []

  if (displayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayEvents.map((event) => (
        <div key={event.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
          <div className="flex-1">
            <p className="text-sm font-medium">
              <span className="text-primary">{formatEventType(event.type)}</span>
              <span className="text-muted-foreground text-xs ml-2">
                Day {event.dayNumber}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {event.visibility === 'Public' ? '🌐 Public' : '🔒 Private'}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {new Date(event.occurredAtMs).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function ActiveGamesTable({ games, isLoading }: { games: Game[] | undefined; isLoading: boolean }) {
  const activeGames = games?.filter(g => g.status === 'ACTIVE') || []

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (activeGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Gamepad2 className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">No active games</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground min-w-[200px]">Game Name</TableHead>
            <TableHead className="text-muted-foreground min-w-[120px]">Game ID</TableHead>
            <TableHead className="text-muted-foreground min-w-[100px]">Phase</TableHead>
            <TableHead className="text-muted-foreground min-w-[80px]">Day</TableHead>
            <TableHead className="text-muted-foreground min-w-[100px]">Players</TableHead>
            <TableHead className="text-muted-foreground text-right min-w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeGames.map((game) => (
            <TableRow key={game.id} className="border-border hover:bg-secondary/50">
              <TableCell>
                <span className="font-medium">{game.name || `Game ${game.id.substring(0, 8)}`}</span>
              </TableCell>
              <TableCell>
                <GameIdChip id={game.id} />
              </TableCell>
              <TableCell>
                <PhaseIndicator phase={game.phase} />
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">Day {game.day}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{game.players}/{game.maxPlayers}</span>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/games/${game.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function OverviewPage() {
  const isConfigured = typeof window !== 'undefined' && getApiConfig() !== null

  const { data: status, isLoading: statusLoading } = useSWR<ServerStatus>(
    isConfigured ? '/api/status' : null,
    () => getStatus(),
    { refreshInterval: 10000 }
  )

  const { data: games, isLoading: gamesLoading } = useSWR<Game[]>(
    isConfigured ? '/api/games' : null,
    () => getGames(),
    { refreshInterval: 10000 }
  )

  // Fetch events for first active game
  const activeGameId = games?.find(g => g.status === 'ACTIVE')?.id
  const { data: events, isLoading: eventsLoading } = useSWR<GameEvent[]>(
    isConfigured && activeGameId ? `/api/games/${activeGameId}/events` : null,
    () => activeGameId ? getEvents(activeGameId, { limit: 100 }) : Promise.resolve([]),
    { refreshInterval: 5000 }
  )

  // Calculate total players across active games
  const totalPlayers = games
    ?.filter(g => g.status === 'ACTIVE')
    .reduce((sum, g) => sum + g.players, 0) || 0

  // Sort events by time (newest first)
  const sortedEvents = events?.sort((a, b) => b.occurredAtMs - a.occurredAtMs) || []

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time server status and game monitoring
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <StatCard
          title="Lobby Games"
          value={status?.games.lobby ?? '-'}
          icon={Clock}
          color="yellow"
          isLoading={statusLoading}
        />
        <StatCard
          title="Active Games"
          value={status?.games.active ?? '-'}
          icon={Gamepad2}
          color="green"
          pulse={!!status?.games.active}
          isLoading={statusLoading}
        />
        <StatCard
          title="Finished Games"
          value={status?.games.gameover ?? '-'}
          icon={Trophy}
          color="gray"
          isLoading={statusLoading}
        />
        <StatCard
          title="Total Players"
          value={totalPlayers}
          icon={Users}
          color="purple"
          isLoading={gamesLoading}
        />
      </div>

      {/* Active Games Table - Full Width */}
      <div className="w-full">
        <Card className="bg-card border-border w-full">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Games</CardTitle>
              <span className="text-xs text-muted-foreground">Auto-refreshes every 10s</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 w-full">
            <ActiveGamesTable games={games} isLoading={gamesLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <div className="w-full">
        <Card className="bg-card border-border w-full">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">Auto-refreshes every 5s</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 w-full">
            <RecentActivityFeed events={sortedEvents} isLoading={eventsLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
