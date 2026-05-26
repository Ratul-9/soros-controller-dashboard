import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

interface WinnerBadgeProps {
  winner: 'TOWN' | 'MAFIA'
  className?: string
}

export function WinnerBadge({ winner, className }: WinnerBadgeProps) {
  const isTown = winner === 'TOWN'

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider",
        isTown 
          ? "bg-town/20 text-town border border-town/30" 
          : "bg-mafia/20 text-mafia border border-mafia/30",
        className
      )}
    >
      <Trophy className="h-3.5 w-3.5" />
      {winner} WINS
    </span>
  )
}
