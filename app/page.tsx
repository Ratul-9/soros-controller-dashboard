'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { getStatus, getGames, getApiConfig, getPlayers, type Game, type ServerStatus, type Player } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GameIdChip } from '@/components/dashboard/game-id-chip'
import { PhaseIndicator } from '@/components/dashboard/phase-indicator'
import { Users, Gamepad2, Clock, Trophy, Eye } from 'lucide-react'

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

function ActiveGamesPlayersTable({ gameId, isLoading }: { gameId: string | undefined; isLoading: boolean }) {
  const { data: players } = useSWR<Player[]>(
    gameId ? `/api/games/${gameId}/players` : null,
    () => gameId ? getPlayers(gameId) : Promise.resolve([]),
    { refreshInterval: 5000 }
  )

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">No players</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Player Name</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Votes Against</TableHead>
            <TableHead className="text-muted-foreground">Steps</TableHead>
            <TableHead className="text-muted-foreground">Votes Cast</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id} className="border-border hover:bg-secondary/50">
              <TableCell>
                <span className="font-medium">{player.name}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs px-2 py-1 bg-secondary rounded">
                  {player.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">
                    {player.votesReceived}
                  </span>
                  {player.votersAgainstMe && player.votersAgainstMe.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {player.votersAgainstMe.map(v => v.name).join(', ')}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{player.lifetimeSteps}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs">
                  {player.votersAgainstMe?.length || 0}
                </span>
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

  // Calculate total players across active games
  const totalPlayers = games
    ?.filter(g => g.status === 'ACTIVE')
    .reduce((sum, g) => sum + g.players, 0) || 0

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

      {/* Active Games with Player Votes */}
      {games?.filter(g => g.status === 'ACTIVE').map((game) => (
        <div key={game.id} className="w-full">
          <Card className="bg-card border-border w-full">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-lg">{game.name || `Game ${game.id.substring(0, 8)}`}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Phase: {game.phase} • Day {game.day} • {game.players}/{game.maxPlayers} Players
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground">Auto-refreshes every 5s</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/games/${game.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 w-full">
              <ActiveGamesPlayersTable gameId={game.id} isLoading={gamesLoading} />
            </CardContent>
          </Card>
        </div>
      ))}

    </div>
  )
}
