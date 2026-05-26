import { NextRequest, NextResponse } from 'next/server'

// Set these on Vercel: Settings → Environment Variables
const BACKEND_URL    = process.env.BACKEND_URL?.replace(/\/$/, '')
const BACKEND_SECRET = process.env.BACKEND_SECRET

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!BACKEND_URL || !BACKEND_SECRET) {
    return NextResponse.json(
      {
        error: 'Backend not configured on server',
        fix: 'Add BACKEND_URL and BACKEND_SECRET to Vercel environment variables',
      },
      { status: 503 }
    )
  }

  const { path } = await params
  const search    = req.nextUrl.search
  const target    = `${BACKEND_URL}/api/${path.join('/')}${search}`

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method:  req.method,
      headers: {
        'Content-Type':                'application/json',
        'Authorization':               `Bearer ${BACKEND_SECRET}`,
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
