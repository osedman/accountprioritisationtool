"use client"

import { useState } from 'react'
import { AccountWithPriority, PortfolioMetrics } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { 
  Sparkles, 
  AlertTriangle, 
  Target, 
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface PortfolioAIAnalysisProps {
  accounts: AccountWithPriority[]
  metrics: PortfolioMetrics
}

interface PortfolioInsights {
  summary: string
  healthOverview: string
  keyRisks: string[]
  topOpportunities: string[]
  recommendedFocus: string[]
  trendAnalysis: string
}

export function PortfolioAIAnalysis({ accounts, metrics }: PortfolioAIAnalysisProps) {
  const [insights, setInsights] = useState<PortfolioInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    risks: true,
    opportunities: true,
    focus: true
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const runAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accounts: accounts.slice(0, 20), // Send top 20 accounts for context
          metrics 
        })
      })

      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null)
        const message =
          (maybeJson && typeof maybeJson.error === 'string' && maybeJson.error) ||
          `Analysis failed (${response.status})`
        throw new Error(message)
      }

      const data = await response.json()
      setInsights(data.insights)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate portfolio analysis. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Portfolio AI Insights
          </CardTitle>
          {insights && (
            <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!insights && !isLoading && (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered insights across your entire portfolio including risk analysis, opportunities, and strategic recommendations.
            </p>
            <Button onClick={runAnalysis} className="w-full max-w-xs">
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Portfolio
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Spinner className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing {accounts.length} accounts...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={runAnalysis} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {insights && !isLoading && (
          <div className="space-y-4">
            {/* Summary */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('summary')}
              >
                <span className="text-sm font-medium text-foreground">Portfolio Summary</span>
                {expandedSections.summary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.summary && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    {insights.summary}
                  </p>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-chart-2 shrink-0" />
                    <p>{insights.trendAnalysis}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Key Risks */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('risks')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Portfolio Risks ({insights.keyRisks.length})
                </span>
                {expandedSections.risks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.risks && (
                <ul className="mt-2 space-y-2">
                  {insights.keyRisks.map((risk, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 bg-destructive/5 p-2 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top Opportunities */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('opportunities')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-chart-2" />
                  Top Opportunities ({insights.topOpportunities.length})
                </span>
                {expandedSections.opportunities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.opportunities && (
                <ul className="mt-2 space-y-2">
                  {insights.topOpportunities.map((opp, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 bg-chart-2/5 p-2 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 shrink-0" />
                      {opp}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recommended Focus Areas */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('focus')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Recommended Focus Areas
                </span>
                {expandedSections.focus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.focus && (
                <div className="mt-2 space-y-2">
                  {insights.recommendedFocus.map((focus, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">{focus}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
