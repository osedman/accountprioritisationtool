console.log('ENV CHECK:', process.env.OPENAI_API_KEY);

import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const priorityReasoningSchema = z.object({
  summary: z.string().describe('A 2-3 sentence executive summary of this account\'s priority status'),
  keyFactors: z.array(z.string()).describe('3-5 key factors driving the priority score'),
  risks: z.array(z.string()).describe('2-4 identified risks or concerns for this account'),
  opportunities: z.array(z.string()).describe('2-4 growth or expansion opportunities'),
  recommendedActions: z.array(z.string()).describe('3-5 specific, actionable next steps the CSM should take'),
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

    // Format account data for the prompt
    const accountSummary = `
Account: ${account.account_name} (${account.id})
Industry: ${account.industry}
Employee Count: ${account.employee_count?.toLocaleString() ?? 'Unknown'}
Annual Revenue: ${account.annual_revenue ? `$${(account.annual_revenue / 1000000).toFixed(1)}M` : 'Unknown'}
Contract Value: ${account.contract_value ? `$${(account.contract_value / 1000).toFixed(0)}K` : 'Unknown'}
Renewal Date: ${account.renewal_date ?? 'Unknown'}
Last Contact: ${account.last_contact_date ?? 'Unknown'}
NPS Score: ${account.nps_score ?? 'Not collected'}
Open Support Tickets: ${account.support_tickets_open ?? 0}
Tickets Closed (30d): ${account.support_tickets_closed_last_30d ?? 0}
Avg Ticket Resolution: ${account.avg_ticket_resolution_hours ?? 'Unknown'} hours
Product Usage Score: ${account.product_usage_score ?? 'Unknown'}%
Feature Adoption: ${account.feature_adoption_pct ?? 'Unknown'}%
Weekly Logins: ${account.login_frequency_weekly ?? 'Unknown'}
CSM: ${account.csm_name ?? 'Unassigned'}
CSM Notes: ${account.csm_notes ?? 'No notes'}

Priority Scores:
- Overall: ${account.priorityScore?.overall}
- Revenue Impact: ${account.priorityScore?.revenueImpact}
- Urgency: ${account.priorityScore?.urgency}
- Health Risk: ${account.priorityScore?.healthRisk}
- Opportunity: ${account.priorityScore?.opportunity}
Priority Tier: ${account.priorityTier}
`.trim()

    const { object } = await generateText({
      model: openai('gpt-4o-mini'), // ✅ FIXED
      output: Output.object({
        schema: priorityReasoningSchema,
      }),
      messages: [
        {
          role: 'system',
          content: `You are an expert Customer Success Manager analyst. Your job is to analyze account data and provide actionable insights to help CSMs prioritize their work and take effective action.

Be specific and actionable in your recommendations. Reference the actual data points when making observations. Consider:
- Renewal timeline and urgency
- Customer health signals (NPS, usage, adoption)
- Support burden and ticket patterns
- Revenue at risk vs. expansion opportunity
- CSM notes and relationship context

Provide practical, concrete recommendations that a CSM can act on immediately.`
        },
        {
          role: 'user',
          content: `Analyze this customer account and provide priority reasoning, risks, opportunities, and recommended actions:

${accountSummary}`
        }
      ],
    })

    return Response.json({ reasoning: object }) // ✅ FIXED
  } catch (error) {
    console.error('AI Analysis Error:', error)

    return Response.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
