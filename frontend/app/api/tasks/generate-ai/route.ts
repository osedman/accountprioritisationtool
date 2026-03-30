import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const suggestedTaskSchema = z.object({
  title: z.string().max(200).describe('Short actionable task title'),
  description: z
    .string()
    .describe('1–3 sentences: what to do and why, for the CSM'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('Urgency for this task'),
})

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'Missing OPENAI_API_KEY. Set it in frontend/.env.local and restart the dev server.' },
        { status: 500 },
      )
    }

    const { account } = await req.json()
    if (!account) {
      return Response.json({ error: 'Account data required' }, { status: 400 })
    }

    const summary = `
Account: ${account.account_name} (${account.id})
Industry: ${account.industry}
Contract: ${account.contract_value ?? 'N/A'}
Renewal: ${account.renewal_date ?? 'Unknown'}
NPS: ${account.nps_score ?? 'N/A'}
Open tickets: ${account.support_tickets_open ?? 0}
Usage %: ${account.product_usage_score ?? 'N/A'}
Priority tier: ${account.priorityTier}
Overall score: ${account.priorityScore?.overall}
`.trim()

    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({ schema: suggestedTaskSchema }),
      messages: [
        {
          role: 'system',
          content: `You suggest a single concrete follow-up task for a Customer Success Manager.
Return a clear title, short description, and priority (High/Medium/Low) based on risk and opportunity.`,
        },
        {
          role: 'user',
          content: `Propose ONE next task for this account:\n\n${summary}`,
        },
      ],
    })

    return Response.json({ task: output })
  } catch (error) {
    console.error('generate-ai task:', error)
    return Response.json({ error: 'Failed to generate task' }, { status: 500 })
  }
}
