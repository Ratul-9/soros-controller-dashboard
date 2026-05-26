import { Sun, Moon, Clock, Circle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Phase = 'PreGame' | 'Morning' | 'Night' | 'NightResolution' | 'PostGame'

interface PhaseIndicatorProps {
  phase: Phase
  className?: string
}

const phaseConfig = {
  PreGame: {
    icon: Circle,
    label: 'Pre-Game',
    className: 'bg-muted text-muted-foreground',
  },
  Morning: {
    icon: Sun,
    label: 'Morning',
    className: 'bg-morning/20 text-morning border border-morning/30',
  },
  Night: {
    icon: Moon,
    label: 'Night',
    className: 'bg-night/20 text-night border border-night/30',
  },
  NightResolution: {
    icon: Clock,
    label: 'Resolution',
    className: 'bg-night-resolution/20 text-night-resolution border border-night-resolution/30',
    spin: true,
  },
  PostGame: {
    icon: CheckCircle,
    label: 'Game Over',
    className: 'bg-muted text-muted-foreground',
  },
}

export function PhaseIndicator({ phase, className }: PhaseIndicatorProps) {
  const config = phaseConfig[phase]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", 'spin' in config && config.spin && "animate-spin-slow")} />
      {config.label}
    </span>
  )
}
