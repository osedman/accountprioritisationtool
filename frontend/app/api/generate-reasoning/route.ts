import OpenAI from 'openai'
import { z } from 'zod'

const requestSchema = z.object({
  account_name: z.string().min(1).optional(),
  risk_score: z.number().optional(),
  growth_score: z.number().optional(),
  recent_support_summary: z.string().optional(),
  usage_trend: z.string().optional(),
})

const responseSchema = z.object({
  reasoning: z.string().min(1),
  evidence: z.array(z.string().min(1)).length(2),
})

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'Missing OPENAI_API_KEY. Set it in frontend/.env.local and restart the dev server.' },
        { status: 500 },
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid JSON body. Expected account fields like account_name, risk_score, growth_score, recent_support_summary, usage_trend.' },
        { status: 400 },
      )
    }

    const account = parsed.data

    const client = new OpenAI({ apiKey })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generate_account_reasoning',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              reasoning: { type: 'string', description: '1-sentence AI Reasoning explaining why this account needs attention.' },
              evidence: {
                type: 'array',
                minItems: 2,
                maxItems: 2,
                items: { type: 'string' },
                description: 'Exactly 2 concise bullet points citing the provided metrics.',
              },
            },
            required: ['reasoning', 'evidence'],
          },
          strict: true,
        },
      },
      messages: [
        {
          role: 'system',
          content:
            "You are a Senior Customer Success Portfolio Manager. Given account metrics, write (1) a single-sentence 'AI Reasoning' explaining why the account needs attention, and (2) exactly two short evidence bullets. Be specific and reference the provided metrics; do not invent data. Return only valid JSON matching the schema.",
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              account_name: account.account_name,
              risk_score: account.risk_score,
              growth_score: account.growth_score,
              recent_support_summary: account.recent_support_summary,
              usage_trend: account.usage_trend,
            },
            null,
            2,
          ),
        },
      ],
      temperature: 0.2,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return Response.json({ error: 'No content returned from model' }, { status: 502 })
    }

    let json: unknown
    try {
      json = JSON.parse(content)
    } catch {
      return Response.json({ error: 'Model returned non-JSON content' }, { status: 502 })
    }

    const validated = responseSchema.safeParse(json)
    if (!validated.success) {
      return Response.json({ error: 'Model returned invalid JSON shape' }, { status: 502 })
    }

    return Response.json(validated.data)
  } catch (error) {
    console.error('Generate Reasoning Error:', error)
    return Response.json({ error: 'Failed to generate reasoning' }, { status: 500 })
  }
}

