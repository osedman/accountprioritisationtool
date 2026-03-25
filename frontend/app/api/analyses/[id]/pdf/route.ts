function backendBaseUrl(): string {
  const fromEnv =
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    'http://127.0.0.1:8000'
  return fromEnv.replace(/\/$/, '')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysisId = id.replace(/[^\d]/g, '')
  if (!analysisId) {
    return new Response('Invalid analysis id', { status: 400 })
  }

  const url = `${backendBaseUrl()}/api/analyses/${analysisId}/pdf`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    const text = await res.text()
    return new Response(text || 'Failed to fetch PDF from backend', { status: res.status })
  }

  const buf = await res.arrayBuffer()
  const headers = new Headers()
  headers.set('Content-Type', 'application/pdf')
  const cd = res.headers.get('content-disposition')
  if (cd) {
    headers.set('Content-Disposition', cd)
  } else {
    headers.set('Content-Disposition', `attachment; filename="analysis-${analysisId}.pdf"`)
  }

  return new Response(buf, { status: 200, headers })
}
