import { NextRequest, NextResponse } from 'next/server'

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Prefer server-side env vars; fall back to headers sent by the browser client
  // (the client reads these from localStorage where the user stored the config).
  const backendUrl = (
    process.env.BACKEND_URL?.replace(/\/$/, '') ||
    req.headers.get('x-backend-url')?.replace(/\/$/, '')
  )
  const secret = (
    process.env.BACKEND_SECRET ||
    req.headers.get('x-backend-secret')
  )

  if (!backendUrl || !secret) {
    return NextResponse.json(
      { error: 'Backend not configured — set BACKEND_URL + BACKEND_SECRET on Vercel, or configure the dashboard via the setup screen.' },
      { status: 503 }
    )
  }

  const { path } = await params
  const search    = req.nextUrl.search
  const target    = `${backendUrl}/api/${path.join('/')}${search}`

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method:  req.method,
      headers: {
        'content-type':                'application/json',
        'authorization':               `Bearer ${secret}`,
        'ngrok-skip-browser-warning':  'true',
      },
      body,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not reach backend', detail: String(err) },
      { status: 502 }
    )
  }

  const text        = await upstream.text()
  const contentType = upstream.headers.get('content-type') ?? 'application/json'

  return new NextResponse(text, {
    status:  upstream.status,
    headers: { 'content-type': contentType },
  })
}

export const GET    = handler
export const POST   = handler
export const PUT    = handler
export const PATCH  = handler
export const DELETE = handler
