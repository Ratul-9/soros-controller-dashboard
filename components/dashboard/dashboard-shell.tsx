'use client'

import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { SetupModal } from '@/components/dashboard/setup-modal'
import { getApiConfig } from '@/lib/api'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    setIsConfigured(getApiConfig() !== null)
  }, [])

  // Show nothing while checking config to prevent flash
  if (isConfigured === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <SetupModal open={!isConfigured} onConfigured={() => setIsConfigured(true)} />
      
      {isConfigured && (
        <div className="min-h-screen bg-background">
          <Sidebar />
          <Header />
          <main className="ml-64 pt-16 min-h-screen">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      )}
      
      <Toaster position="top-right" />
    </>
  )
}
