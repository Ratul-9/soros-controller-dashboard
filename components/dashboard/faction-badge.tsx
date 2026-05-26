import { cn } from '@/lib/utils'
import type { Player } from '@/lib/api'

interface FactionBadgeProps {
  faction: Player['faction']
  className?: string
}

export function FactionBadge({ faction, className }: FactionBadgeProps) {
  const isTown = faction === 'TOWN'

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
        isTown 
          ? "bg-town/20 text-town border border-town/30" 
          : "bg-mafia/20 text-mafia border border-mafia/30",
        className
      )}
    >
      {faction}
    </span>
  )
}
