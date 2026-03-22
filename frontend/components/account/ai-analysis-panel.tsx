"use client"

import { useState } from 'react'
import { AccountWithPriority, PriorityReasoning } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { 
  Sparkles, 
  AlertTriangle, 
  Target, 
  CheckCircle2,
  RefreshCw,
  Download,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface AIAnalysisPanelProps {
  account: AccountWithPriority
  onPreferredActionSelected?: (actionText: string) => void
}

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000'

export function AIAnalysisPanel({ account, onPreferredActionSelected }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<PriorityReasoning | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAnalysisId, setSavedAnalysisId] = useState<number | null>(null)
  const [preferredActionIndex, setPreferredActionIndex] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    factors: true,
    risks: true,
    opportunities: true,
    actions: true
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const runAnalysis = async () => {
    setSavedAnalysisId(null)
    setPreferredActionIndex(null)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account })
      })

      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null)
        const message =
          (maybeJson && typeof maybeJson.error === 'string' && maybeJson.error) ||
          `Analysis failed (${response.status})`
        throw new Error(message)
      }

      const data = await response.json()
      const reasoning: PriorityReasoning = data.reasoning
      setAnalysis(reasoning)
      if (typeof reasoning.preferredActionIndex === 'number') {
        setPreferredActionIndex(reasoning.preferredActionIndex)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate AI analysis. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const saveAnalysis = async (): Promise<number> => {
    if (!analysis) {
      throw new Error('No analysis to save')
    }
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        account_key: account.id,
        analysis: {
          ...analysis,
          preferredActionIndex: preferredActionIndex ?? undefined,
        },
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/analyses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null)
        const message =
          (maybeJson && typeof maybeJson.error === 'string' && maybeJson.error) ||
          `Failed to save analysis (${response.status})`
        throw new Error(message)
      }

      const data = await response.json()
      const id = typeof data.id === 'number' ? data.id : Number(data.id)
      if (!Number.isFinite(id)) {
        throw new Error('Invalid analysis id returned from server')
      }
      setSavedAnalysisId(id)
      return id
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = async () => {
    try {
      await saveAnalysis()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save analysis')
    }
  }

  const handleDownloadPdf = async () => {
    if (!analysis) {
      setError('Generate an analysis before downloading a PDF.')
      return
    }

    setIsDownloading(true)
    setError(null)
    try {
      let id = savedAnalysisId
      if (!id) {
        id = await saveAnalysis()
      }
      const url = `${BACKEND_BASE_URL}/api/analyses/${id}/pdf`
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download analysis PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSelectPreferredAction = (index: number) => {
    setPreferredActionIndex(prev => {
      const next = prev === index ? null : index
      if (analysis && typeof index === 'number' && next === index && onPreferredActionSelected) {
        const actionText = analysis.recommendedActions[index]
        if (actionText) {
          onPreferredActionSelected(actionText)
        }
      }
      return next
    })

    setAnalysis(prev =>
      prev
        ? {
            ...prev,
            preferredActionIndex: prev.preferredActionIndex === index ? undefined : index,
          }
        : prev,
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {analysis && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveClick}
                  disabled={isSaving}
                >
                  <Save className={`h-4 w-4 mr-1 ${isSaving ? 'animate-pulse' : ''}`} />
                  {savedAnalysisId ? 'Saved' : 'Save'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                >
                  <Download className={`h-4 w-4 mr-1 ${isDownloading ? 'animate-pulse' : ''}`} />
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis && !isLoading && (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered insights about this account including risks, opportunities, and recommended actions.
            </p>
            <Button onClick={runAnalysis} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Analysis
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Spinner className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing account data...</p>
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

        {analysis && !isLoading && (
          <div className="space-y-4">
            {/* Summary */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('summary')}
              >
                <span className="text-sm font-medium text-foreground">Summary</span>
                {expandedSections.summary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.summary && (
                <p className="mt-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {analysis.summary}
                </p>
              )}
            </div>

            {/* Key Factors */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('factors')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                  Key Factors
                </span>
                {expandedSections.factors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.factors && (
                <ul className="mt-2 space-y-2">
                  {analysis.keyFactors.map((factor, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-chart-2 mt-1">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Risks */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('risks')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Risks
                </span>
                {expandedSections.risks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.risks && (
                <ul className="mt-2 space-y-2">
                  {analysis.risks.map((risk, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-1">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Opportunities */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('opportunities')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-success" />
                  Opportunities
                </span>
                {expandedSections.opportunities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.opportunities && (
                <ul className="mt-2 space-y-2">
                  {analysis.opportunities.map((opp, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recommended Actions */}
            <div>
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('actions')}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Recommended Actions
                </span>
                {expandedSections.actions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.actions && (
                <div className="mt-2 space-y-2">
                  {analysis.recommendedActions.map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreferredAction(i)}
                      className={`w-full text-left flex items-start gap-2 p-2 rounded-lg border ${
                        preferredActionIndex === i
                          ? 'bg-primary/15 border-primary'
                          : 'bg-primary/10 border-transparent'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium shrink-0 ${
                          preferredActionIndex === i
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/20 text-primary'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <span className="block text-sm text-foreground">{action}</span>
                        {preferredActionIndex === i && (
                          <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Preferred action
                          </span>
                        )}
                      </div>
                    </button>
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
