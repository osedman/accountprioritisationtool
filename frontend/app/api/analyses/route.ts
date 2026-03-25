function backendBaseUrl(): string {
  const fromEnv =
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    'http://127.0.0.1:8000'
  return fromEnv.replace(/\/$/, '')
}

export async function POST(req: Request) {
  const body = await req.text()
  const url = `${backendBaseUrl()}/api/analyses`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })

  const text = await res.text()
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    try {
      return Response.json(JSON.parse(text), { status: res.status })
    } catch {
      return new Response(text, { status: res.status })
    }
  }
  return new Response(text, { status: res.status })
}
