import { cn } from '@/lib/utils'
import { Stethoscope, Search, Shield, Crown, User, Skull, VolumeX, Sword } from 'lucide-react'
import type { Player } from '@/lib/api'

interface RoleBadgeProps {
  role: Player['role']
  className?: string
}

const roleConfig = {
  Doctor: {
    icon: Stethoscope,
    label: 'Doctor',
    className: 'text-cyan-400',
  },
  Detective: {
    icon: Search,
    label: 'Detective',
    className: 'text-blue-400',
  },
  Bodyguard: {
    icon: Shield,
    label: 'Bodyguard',
    className: 'text-teal-400',
  },
  Mayor: {
    icon: Crown,
    label: 'Mayor',
    className: 'text-amber-400',
  },
  Commoner: {
    icon: User,
    label: 'Commoner',
    className: 'text-slate-400',
  },
  MafiaLeader: {
    icon: Skull,
    label: 'Mafia Leader',
    className: 'text-red-500',
  },
  SilencerMafia: {
    icon: VolumeX,
    label: 'Silencer',
    className: 'text-orange-500',
  },
  VanillaMafia: {
    icon: Sword,
    label: 'Vanilla Mafia',
    className: 'text-red-400',
  },
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  // Role is null in LOBBY (not yet assigned) — render a placeholder
  if (!role) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
        —
      </span>
    )
  }

  const config = roleConfig[role]
  // Guard against any unrecognised string from the backend
  if (!config) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
        {role}
      </span>
    )
  }

  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        config.className,
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
    </span>
  )
}
