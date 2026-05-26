'use client'

import useSWR from 'swr'
import { getStatus, getApiConfig } from '@/lib/api'
import { Clock, Activity, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clearApiConfig } from '@/lib/api'
import { useRouter } from 'next/navigation'

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function Header() {
  const router = useRouter()
  const isConfigured = getApiConfig() !== null
  
  const { data: status, error, isLoading } = useSWR(
    isConfigured ? '/api/status' : null,
    () => getStatus(),
    { refreshInterval: 10000 }
  )

  const handleDisconnect = () => {
    clearApiConfig()
    router.refresh()
    window.location.reload()
  }

  return (
    <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Status */}
        <div className="flex items-center gap-6">
          {/* Server Status */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : error ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
                <span className="text-sm text-destructive">Disconnected</span>
              </>
            ) : (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-active opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-active" />
                </span>
                <span className="text-sm text-active">Online</span>
              </>
            )}
          </div>

          {/* Uptime */}
          {status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatUptime(status.uptime_seconds)}</span>
            </div>
          )}

          {/* Active Games */}
          {status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>
                <span className="font-mono text-foreground">{status.games.active}</span> active games
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {status && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4">
              <Settings className="h-3.5 w-3.5" />
              <span className="font-mono">WS:{status.server.ws_port}</span>
              <span className="text-border">|</span>
              <span className="font-mono">Dashboard:{status.server.dashboard_port}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>
    </header>
  )
}
