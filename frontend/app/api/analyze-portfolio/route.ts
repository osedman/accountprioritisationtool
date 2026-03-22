import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const portfolioInsightsSchema = z.object({
  summary: z.string().describe('A 2-3 sentence executive summary of the overall portfolio health and status'),
  healthOverview: z.string().describe('Brief assessment of overall portfolio health'),
  keyRisks: z.array(z.string()).describe('3-5 major risks across the portfolio that need attention'),
  topOpportunities: z.array(z.string()).describe('3-5 top expansion or improvement opportunities'),
  recommendedFocus: z.array(z.string()).describe('3-5 strategic focus areas for the team'),
  trendAnalysis: z.string().describe('1-2 sentence analysis of portfolio trends'),
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

    const { accounts, metrics } = await req.json()

    if (!accounts || !metrics) {
      return Response.json({ error: 'Accounts and metrics data required' }, { status: 400 })
    }

    // Format portfolio summary
    const portfolioSummary = `
PORTFOLIO METRICS:
- Total Accounts: ${metrics.totalAccounts}
- Total Contract Value: $${(metrics.totalContractValue / 1000000).toFixed(2)}M
- Average Health Score: ${metrics.avgHealthScore}%
- Critical Accounts: ${metrics.criticalAccounts}
- High Priority Accounts: ${metrics.highPriorityAccounts}
- Upcoming Renewals (90 days): ${metrics.upcomingRenewals}
- Open Support Tickets: ${metrics.openTickets}

TOP ACCOUNTS BY PRIORITY:
${accounts.slice(0, 10).map((acc: Record<string, unknown>, i: number) => {
  const account = acc as {
    account_name: string;
    industry: string;
    priorityTier: string;
    priorityScore: { overall: number };
    contract_value: number | null;
    product_usage_score: number | null;
    renewal_date: string | null;
    support_tickets_open: number | null;
  }
  return `${i + 1}. ${account.account_name} (${account.industry})
   - Priority: ${account.priorityTier} (Score: ${account.priorityScore.overall})
   - Contract: $${account.contract_value ? (account.contract_value / 1000).toFixed(0) : 0}K
   - Health: ${account.product_usage_score ?? 'N/A'}%
   - Renewal: ${account.renewal_date ?? 'Unknown'}
   - Open Tickets: ${account.support_tickets_open ?? 0}`
}).join('\n\n')}

INDUSTRY BREAKDOWN:
${Object.entries(
  accounts.reduce((acc: Record<string, number>, curr: Record<string, unknown>) => {
    const industry = curr.industry as string
    acc[industry] = (acc[industry] || 0) + 1
    return acc
  }, {} as Record<string, number>)
).map(([industry, count]) => `- ${industry}: ${count} accounts`).join('\n')}
`.trim()

    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        schema: portfolioInsightsSchema,
      }),
      messages: [
        {
          role: 'system',
          content: `You are an expert Customer Success Director analyst. Your job is to analyze portfolio-level data and provide strategic insights to help CS leadership understand portfolio health, identify risks, and prioritize team efforts.

Be specific and actionable in your recommendations. Consider:
- Overall portfolio health trends
- Concentration risks (revenue, industry, health)
- Renewal pipeline health
- Support burden patterns
- Strategic expansion opportunities
- Team resource allocation needs

Provide strategic, high-level insights that inform portfolio management decisions.`
        },
        {
          role: 'user',
          content: `Analyze this customer portfolio and provide strategic insights, risks, opportunities, and recommended focus areas:

${portfolioSummary}`
        }
      ],
    })

    return Response.json({ insights: output })
  } catch (error) {
    console.error('Portfolio AI Analysis Error:', error)
    return Response.json(
      { error: 'Failed to generate portfolio analysis' }, 
      { status: 500 }
    )
  }
}
