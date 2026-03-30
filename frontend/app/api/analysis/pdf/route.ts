import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PriorityReasoning } from '@/lib/types'

export const runtime = 'nodejs'

const MARGIN = 50
const LINE = 13
const MAX_WIDTH = 495

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!w) continue
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= maxChars) {
      cur = next
    } else {
      if (cur) lines.push(cur)
      cur = w.length > maxChars ? w.slice(0, maxChars) : w
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const accountName = typeof body.accountName === 'string' ? body.accountName : 'Account'
    const accountId = typeof body.accountId === 'string' ? body.accountId : ''
    const analysis = body.analysis as PriorityReasoning | undefined
    const preferredIdx =
      typeof body.preferredActionIndex === 'number' ? body.preferredActionIndex : null

    if (!analysis || typeof analysis.summary !== 'string') {
      return Response.json({ error: 'Invalid analysis payload' }, { status: 400 })
    }

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    let y = height - MARGIN

    const drawParagraph = (title: string, lines: string[], boldTitle = true) => {
      if (y < MARGIN + LINE * 6) {
        page = pdfDoc.addPage()
        y = height - MARGIN
      }
      page.drawText(title, {
        x: MARGIN,
        y,
        size: 12,
        font: boldTitle ? fontBold : font,
        color: rgb(0, 0, 0),
      })
      y -= LINE + 2
      for (const line of lines) {
        if (y < MARGIN + LINE) {
          page = pdfDoc.addPage()
          y = height - MARGIN
        }
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 10,
          font,
          color: rgb(0.15, 0.15, 0.15),
          maxWidth: MAX_WIDTH,
        })
        y -= LINE
      }
      y -= 8
    }

    page.drawText('AI Analysis', {
      x: MARGIN,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    y -= LINE * 2
    page.drawText(`${accountName} (${accountId})`, {
      x: MARGIN,
      y,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
    y -= LINE * 2

    drawParagraph('Summary', wrapText(analysis.summary, 85))

    if (analysis.keyFactors?.length) {
      drawParagraph(
        'Key factors',
        analysis.keyFactors.map((f) => `• ${f}`),
      )
    }

    if (analysis.risks?.length) {
      const flat = analysis.risks.map((r) => `• ${r}`)
      drawParagraph('Risks', flat)
    }

    if (analysis.opportunities?.length) {
      const flat = analysis.opportunities.map((o) => `• ${o}`)
      drawParagraph('Opportunities', flat)
    }

    if (analysis.recommendedActions?.length) {
      const flat = analysis.recommendedActions.map((a, i) => {
        const mark = preferredIdx === i ? ' (preferred)' : ''
        return `${i + 1}. ${a}${mark}`
      })
      drawParagraph('Recommended actions', flat)
    }

    const pdfBytes = await pdfDoc.save()
    const safeName = accountId.replace(/[^a-zA-Z0-9._-]+/g, '-') || 'analysis'
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}-analysis.pdf"`,
      },
    })
  } catch (e) {
    console.error('analysis pdf:', e)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
