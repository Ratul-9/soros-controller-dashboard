'use client'

import useSWR from 'swr'
import { getConfig, getApiConfig, type GameConfig } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Clock, Vote, Trophy, Percent, Target } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const ROLE_COLORS: Record<string, string> = {
  Doctor:        '#22d3ee',
  Detective:     '#60a5fa',
  Bodyguard:     '#2dd4bf',
  Mayor:         '#fbbf24',
  Commoner:      '#94a3b8',
  MafiaLeader:   '#ef4444',
  SilencerMafia: '#f97316',
  VanillaMafia:  '#f87171',
}

function ConfigSection({
  title,
  icon: Icon,
  children,
  isLoading = false
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  isLoading?: boolean
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function ConfigItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  )
}

function RoleDistributionChart({ distribution }: { distribution: Record<string, number> }) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: ROLE_COLORS[name] ?? '#6b7280',
    }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#13131a',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => <span className="text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function PhaseTimeline({ timing }: { timing: GameConfig['phase_timing'] }) {
  const phases = [
    { name: 'Morning',    start: timing.morning_start,          color: 'bg-morning',          icon: '☀️' },
    { name: 'Night',      start: timing.night_start,            color: 'bg-night',             icon: '🌙' },
    { name: 'Resolution', start: timing.night_resolution_start, color: 'bg-night-resolution',  icon: '⏰' },
  ]

  const formatTime = (hour: number) => {
    const h = hour % 24
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:00 ${ampm}`
  }

  return (
    <div className="space-y-3">
      {phases.map((phase, index) => (
        <div key={phase.name} className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${phase.color}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{phase.icon} {phase.name}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {formatTime(phase.start)}
              </span>
            </div>
            {index < phases.length - 1 && (
              <div className="ml-1.5 mt-1 mb-1 w-px h-4 bg-border" />
            )}
          </div>
        </div>
      ))}
      {timing.timezone && (
        <p className="text-xs text-muted-foreground pt-1 border-t border-border">
          Timezone: {timing.timezone}
        </p>
      )}
    </div>
  )
}

export default function ConfigPage() {
  const isConfigured = typeof window !== 'undefined' && getApiConfig() !== null

  const { data: config, isLoading } = useSWR<GameConfig>(
    isConfigured ? '/api/config' : null,
    () => getConfig(),
    { revalidateOnFocus: false }
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Server game rules and settings (read-only)
        </p>
      </div>

      {/* Config Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Match Shape */}
        <ConfigSection title="Match Shape" icon={Users} isLoading={isLoading}>
          {config && (
            <>
              <ConfigItem label="Player Count"  value={config.match_shape.player_count} />
              <ConfigItem label="Mafia Count"   value={config.match_shape.mafia_count} />
              <ConfigItem label="Mafia Ratio"   value={`${(config.match_shape.mafia_ratio * 100).toFixed(0)}%`} />
              <ConfigItem label="Duration"      value={`${config.match_shape.duration_days} days`} />
            </>
          )}
        </ConfigSection>

        {/* Role Distribution */}
        <ConfigSection title="Role Distribution" icon={Target} isLoading={isLoading}>
          {config && <RoleDistributionChart distribution={config.role_distribution} />}
        </ConfigSection>

        {/* Phase Timing */}
        <ConfigSection title="Phase Timing" icon={Clock} isLoading={isLoading}>
          {config && <PhaseTimeline timing={config.phase_timing} />}
        </ConfigSection>

        {/* Step Thresholds */}
        <ConfigSection title="Step Thresholds" icon={Percent} isLoading={isLoading}>
          {config && (
            <>
              <ConfigItem
                label="Power Use Unlock"
                value={`${config.step_thresholds.power_use.toLocaleString()} steps`}
              />
              <ConfigItem
                label="Resurrection Unlock"
                value={`${config.step_thresholds.resurrection.toLocaleString()} steps`}
              />
            </>
          )}
        </ConfigSection>

        {/* Voting Rules */}
        <ConfigSection title="Voting Rules" icon={Vote} isLoading={isLoading}>
          {config && (
            <>
              <ConfigItem
                label="Vote Power / Step"
                value={config.voting_rules.vote_power_per_step}
              />
              <ConfigItem
                label="Mayor Multiplier"
                value={`${config.voting_rules.mayor_vote_multiplier}x`}
              />
            </>
          )}
        </ConfigSection>

        {/* Win Condition */}
        <ConfigSection title="Win Condition" icon={Trophy} isLoading={isLoading}>
          {config && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {config.win_condition}
            </p>
          )}
        </ConfigSection>

      </div>
    </div>
  )
}
