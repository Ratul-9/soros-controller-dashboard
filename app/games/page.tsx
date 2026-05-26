'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { getGames, getApiConfig, createGame, type Game } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { GameIdChip } from '@/components/dashboard/game-id-chip'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { PhaseIndicator } from '@/components/dashboard/phase-indicator'
import { WinnerBadge } from '@/components/dashboard/winner-badge'
import { Plus, Gamepad2, Users, Calendar, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function GameCard({ game }: { game: Game }) {
  const playerProgress = (game.players / game.maxPlayers) * 100

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <GameIdChip id={game.id} />
          <div className="flex items-center gap-2">
            <StatusBadge status={game.status} />
            {game.status === 'ACTIVE' && <PhaseIndicator phase={game.phase} />}
          </div>
        </div>

        <div className="space-y-4">
          {/* Player Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Players</span>
              </div>
              <span className="font-mono">{game.players}/{game.maxPlayers}</span>
            </div>
            <Progress value={playerProgress} className="h-2" />
          </div>

          {/* Day Number */}
          {game.status !== 'LOBBY' && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Day</span>
              </div>
              <span className="font-mono">{game.day}</span>
            </div>
          )}

          {/* Winner (if game over) */}
          {game.status === 'GAMEOVER' && game.winner && (
            <div className="pt-2">
              <WinnerBadge winner={game.winner} />
            </div>
          )}
        </div>

        {/* Open Button */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="secondary" size="sm" className="w-full" asChild>
            <Link href={`/games/${game.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function GameCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Gamepad2 className="h-16 w-16 mb-4 opacity-30" />
      <p className="text-lg font-medium">No {filter.toLowerCase()} games</p>
      <p className="text-sm">Games will appear here when available</p>
    </div>
  )
}

export default function GamesPage() {
  const [isCreating, setIsCreating] = useState(false)
  const isConfigured = typeof window !== 'undefined' && getApiConfig() !== null
  
  const { data: games, isLoading, mutate } = useSWR<Game[]>(
    isConfigured ? '/api/games' : null,
    () => getGames(),
    { refreshInterval: 10000 }
  )

  const handleCreateGame = async () => {
    setIsCreating(true)
    try {
      const newGame = await createGame()
      toast.success('Game Created', {
        description: `Game ${newGame.id.slice(0, 8)}... is ready in the lobby`,
      })
      mutate()
    } catch (error) {
      toast.error('Failed to create game', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const filterGames = (filter: string) => {
    if (!games) return []
    switch (filter) {
      case 'lobby':
        return games.filter(g => g.status === 'LOBBY')
      case 'active':
        return games.filter(g => g.status === 'ACTIVE')
      case 'finished':
        return games.filter(g => g.status === 'GAMEOVER')
      default:
        return games
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Games</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and monitor all game sessions
          </p>
        </div>
        <Button onClick={handleCreateGame} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="lobby">Lobby</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="finished">Finished</TabsTrigger>
        </TabsList>

        {['all', 'lobby', 'active', 'finished'].map((filter) => (
          <TabsContent key={filter} value={filter} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoading ? (
                [...Array(4)].map((_, i) => <GameCardSkeleton key={i} />)
              ) : filterGames(filter).length === 0 ? (
                <EmptyState filter={filter === 'all' ? '' : filter} />
              ) : (
                filterGames(filter).map((game) => (
                  <GameCard key={game.id} game={game} />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
