"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { accountsData } from '@/lib/data/accounts'
import { scoreAccount } from '@/lib/priority-scoring'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  DollarSign, 
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Ticket,
  Clock,
  Heart,
  Target,
  Minus
} from 'lucide-react'
import { AIAnalysisPanel } from './ai-analysis-panel'
import { DecisionRecorder } from './decision-recorder'
import { Decision } from '@/lib/types'

interface AccountDetailProps {
  accountId: string
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A'
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  return `$${(value / 1000).toFixed(0)}K`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getDaysUntilRenewal(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  const renewal = new Date(dateStr)
  return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [decisions, setDecisions] = useState<Decision[]>([])

  // Find and score the account
  const account = useMemo(() => {
    const rawAccount = accountsData.find(a => a.id === accountId)
    if (!rawAccount) return null
    return scoreAccount(rawAccount)
  }, [accountId])

  if (!account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-border bg-card p-8">
          <p className="text-muted-foreground">Account not found</p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  const daysUntilRenewal = getDaysUntilRenewal(account.renewal_date)
  const isRenewalUrgent = daysUntilRenewal !== null && daysUntilRenewal <= 60

  const handleDecisionSaved = (decision: Decision) => {
    setDecisions(prev => [decision, ...prev])
  }

  const handlePreferredActionSelected = (actionText: string) => {
    const decision: Decision = {
      id: `ai-pref-${Date.now()}`,
      accountId: account.id,
      action: actionText,
      reasoning: 'AI-recommended preferred action from analysis panel.',
      createdAt: new Date().toISOString(),
      createdBy: user?.name ?? 'AI Assistant',
    }
    setDecisions(prev => [decision, ...prev])
  }

  const getHealthIcon = (score: number | null) => {
    if (score === null) return Minus
    if (score >= 70) return TrendingUp
    if (score >= 50) return Minus
    return TrendingDown
  }

  const getHealthColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 70) return 'text-success'
    if (score >= 50) return 'text-warning'
    return 'text-destructive'
  }

  const HealthIcon = getHealthIcon(account.product_usage_score)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-foreground">{account.account_name}</h1>
                  <Badge variant={
                    account.priorityTier === 'critical' ? 'destructive' :
                    account.priorityTier === 'high' ? 'default' :
                    account.priorityTier === 'medium' ? 'secondary' : 'outline'
                  }>
                    {account.priorityTier.charAt(0).toUpperCase() + account.priorityTier.slice(1)} Priority
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{account.industry} | {account.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-4">
                <p className="text-sm text-muted-foreground">Priority Score</p>
                <p className="text-2xl font-bold text-foreground">{account.priorityScore.overall}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Contract Value</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatCurrency(account.contract_value)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Renewal</span>
                    {isRenewalUrgent && <AlertTriangle className="h-3 w-3 text-warning" />}
                  </div>
                  <p className={`mt-2 text-2xl font-bold ${isRenewalUrgent ? 'text-warning' : 'text-foreground'}`}>
                    {daysUntilRenewal !== null ? `${daysUntilRenewal}d` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(account.renewal_date)}</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">Health Score</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <HealthIcon className={`h-5 w-5 ${getHealthColor(account.product_usage_score)}`} />
                    <span className={`text-2xl font-bold ${getHealthColor(account.product_usage_score)}`}>
                      {account.product_usage_score ?? 'N/A'}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    <span className="text-xs">Open Tickets</span>
                  </div>
                  <p className={`mt-2 text-2xl font-bold ${
                    (account.support_tickets_open ?? 0) > 5 ? 'text-warning' : 'text-foreground'
                  }`}>
                    {account.support_tickets_open ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Priority Breakdown */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Priority Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Revenue Impact', value: account.priorityScore.revenueImpact, icon: DollarSign, color: 'bg-chart-5' },
                    { label: 'Urgency', value: account.priorityScore.urgency, icon: Clock, color: 'bg-warning' },
                    { label: 'Health Risk', value: account.priorityScore.healthRisk, icon: AlertTriangle, color: 'bg-destructive' },
                    { label: 'Opportunity', value: account.priorityScore.opportunity, icon: Target, color: 'bg-success' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-32">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <div className="flex-1">
                        <Progress value={item.value} className="h-2" />
                      </div>
                      <span className="text-sm font-medium text-foreground w-8">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Industry:</span>
                      <span className="text-sm text-foreground">{account.industry}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Employees:</span>
                      <span className="text-sm text-foreground">{account.employee_count?.toLocaleString() ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Annual Revenue:</span>
                      <span className="text-sm text-foreground">{formatCurrency(account.annual_revenue)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">NPS Score:</span>
                      <span className={`text-sm font-medium ${
                        account.nps_score === null ? 'text-muted-foreground' :
                        account.nps_score >= 8 ? 'text-success' :
                        account.nps_score >= 6 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {account.nps_score ?? 'Not collected'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Feature Adoption:</span>
                      <span className="text-sm text-foreground">{account.feature_adoption_pct ?? 'N/A'}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Weekly Logins:</span>
                      <span className="text-sm text-foreground">{account.login_frequency_weekly ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">CSM: {account.csm_name ?? 'Unassigned'}</p>
                  <p className="text-sm text-muted-foreground mb-1">Last Contact: {formatDate(account.last_contact_date)}</p>
                </div>

                {account.csm_notes && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">CSM Notes</p>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        {account.csm_notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Support Activity */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Support Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{account.support_tickets_open ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Open Tickets</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{account.support_tickets_closed_last_30d ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Closed (30d)</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{account.avg_ticket_resolution_hours ?? 'N/A'}h</p>
                    <p className="text-xs text-muted-foreground">Avg Resolution</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Analysis & Actions */}
          <div className="space-y-6">
            {/* AI Analysis Panel */}
            <AIAnalysisPanel account={account} onPreferredActionSelected={handlePreferredActionSelected} />

            {/* Decision Recorder */}
            <DecisionRecorder 
              account={account} 
              userName={user?.name ?? 'Unknown'} 
              onDecisionSaved={handleDecisionSaved}
            />

            {/* Recent Decisions */}
            {decisions.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Recent Decisions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {decisions.map((decision) => (
                      <div key={decision.id} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium text-foreground">{decision.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{decision.reasoning}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {decision.createdBy} | {new Date(decision.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
