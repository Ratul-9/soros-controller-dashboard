import { cn } from '@/lib/utils'

type Status = 'LOBBY' | 'ACTIVE' | 'GAMEOVER'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusConfig = {
  LOBBY: {
    label: 'Lobby',
    className: 'bg-lobby/20 text-lobby border border-lobby/30',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-active/20 text-active border border-active/30',
    pulse: true,
  },
  GAMEOVER: {
    label: 'Finished',
    className: 'bg-finished/20 text-finished border border-finished/30',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  if (!config) {
    return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-muted-foreground", className)}>{status}</span>
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
        config.className,
        className
      )}
    >
      {'pulse' in config && config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-active opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-active" />
        </span>
      )}
      {config.label}
    </span>
  )
}
