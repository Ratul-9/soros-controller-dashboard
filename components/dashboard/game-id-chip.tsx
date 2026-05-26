'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface GameIdChipProps {
  id: string
  className?: string
}

export function GameIdChip({ id, className }: GameIdChipProps) {
  const [copied, setCopied] = useState(false)
  const truncated = id.slice(0, 8)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 bg-secondary rounded font-mono text-xs text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer",
              className
            )}
          >
            <span>{truncated}</span>
            {copied ? (
              <Check className="h-3 w-3 text-active" />
            ) : (
              <Copy className="h-3 w-3 opacity-50" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">
          <p>{id}</p>
          <p className="text-muted-foreground mt-1">Click to copy</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
