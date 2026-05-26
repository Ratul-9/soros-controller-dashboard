'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setApiConfig, getStatus } from '@/lib/api'
import { Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react'

interface SetupModalProps {
  open: boolean
  onConfigured: () => void
}

export function SetupModal({ open, onConfigured }: SetupModalProps) {
  const [backendUrl, setBackendUrl] = useState('http://localhost:9090')
  const [secret, setSecret] = useState('')
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const testConnection = async () => {
    setStatus('testing')
    setErrorMessage('')
    
    // Temporarily set config to test
    setApiConfig({ backendUrl, secret })
    
    try {
      const result = await getStatus()
      if (result.ok) {
        setStatus('success')
        setTimeout(() => {
          onConfigured()
        }, 1000)
      } else {
        setStatus('error')
        setErrorMessage('Server returned not OK')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="bg-card border-border sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Shadow of Soros</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Configure your connection to the game server dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="backend-url">Backend URL</Label>
            <Input
              id="backend-url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://BACKEND_IP:9090"
              className="font-mono text-sm bg-secondary border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secret">Dashboard Secret</Label>
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your secret token"
              className="font-mono text-sm bg-secondary border-border"
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-active/10 border border-active/20 rounded-lg text-active text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Connected successfully!</span>
            </div>
          )}

          <Button 
            onClick={testConnection} 
            className="w-full"
            disabled={!backendUrl || !secret || status === 'testing'}
          >
            {status === 'testing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              'Connect to Server'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
