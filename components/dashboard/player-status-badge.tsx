import { cn } from '@/lib/utils'
import { Skull, Sparkles, Heart } from 'lucide-react'
import type { Player } from '@/lib/api'

interface PlayerStatusBadgeProps {
  status: Player['status']
  className?: string
}

const statusConfig = {
  Alive: {
    icon: Heart,
    label: 'Alive',
    className: 'text-active',
    pulse: true,
  },
  Eliminated: {
    icon: Skull,
    label: 'Eliminated',
    className: 'text-muted-foreground line-through',
  },
  Resurrected: {
    icon: Sparkles,
    label: 'Resurrected',
    className: 'text-amber-400',
    shimmer: true,
  },
  DeadForever: {
    icon: Skull,
    label: 'Dead Forever',
    className: 'text-red-900',
  },
}

export function PlayerStatusBadge({ status, className }: PlayerStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        config.className,
        'shimmer' in config && config.shimmer && "animate-pulse",
        className
      )}
    >
      {'pulse' in config && config.pulse && (
        <span className="relative flex h-2 w-2 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-active opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-active" />
        </span>
      )}
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
    </span>
  )
}
