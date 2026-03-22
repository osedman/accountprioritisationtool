"use client"

import { useRouter } from 'next/navigation'
import { AccountWithPriority } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { ArrowUpRight, AlertCircle, TrendingUp, Minus, TrendingDown, Calendar, DollarSign, HeartPulse, Ticket, Info, ShieldAlert, Clock, AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AccountsTableProps {
  accounts: AccountWithPriority[]
}

function getPriorityBadgeVariant(tier: string): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    default:
      return 'outline'
  }
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-'
  return `$${(value / 1000).toFixed(0)}K`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysUntilRenewal(dateStr: string | null): { days: number | null; urgent: boolean } {
  if (!dateStr) return { days: null, urgent: false }
  const today = new Date()
  const renewal = new Date(dateStr)
  const days = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return { days, urgent: days <= 30 }
}

function getHealthIndicator(score: number | null) {
  if (score === null) return { icon: Minus, color: 'text-muted-foreground', label: 'N/A' }
  if (score >= 70) return { icon: TrendingUp, color: 'text-success', label: 'Healthy' }
  if (score >= 50) return { icon: Minus, color: 'text-warning', label: 'At Risk' }
  return { icon: TrendingDown, color: 'text-destructive', label: 'Critical' }
}

function getPriorityDefensibility(account: AccountWithPriority): { reason: string; factors: string[] } {
  const factors: string[] = []
  const { priorityScore, priorityTier } = account
  const renewal = getDaysUntilRenewal(account.renewal_date)
  
  // Revenue impact factors
  if (account.contract_value && account.contract_value >= 200000) {
    factors.push(`High-value contract ($${(account.contract_value / 1000).toFixed(0)}K)`)
  } else if (account.contract_value && account.contract_value >= 100000) {
    factors.push(`Significant contract value ($${(account.contract_value / 1000).toFixed(0)}K)`)
  }
  
  // Urgency factors
  if (renewal.days !== null && renewal.days <= 30) {
    factors.push(`Renewal imminent (${renewal.days} days)`)
  } else if (renewal.days !== null && renewal.days <= 60) {
    factors.push(`Renewal approaching (${renewal.days} days)`)
  }
  
  // Health risk factors
  if (account.product_usage_score !== null && account.product_usage_score < 40) {
    factors.push(`Critical usage decline (${account.product_usage_score}%)`)
  } else if (account.product_usage_score !== null && account.product_usage_score < 60) {
    factors.push(`Usage below target (${account.product_usage_score}%)`)
  }
  
  if (account.nps_score !== null && account.nps_score <= 5) {
    factors.push(`Detractor NPS score (${account.nps_score})`)
  } else if (account.nps_score !== null && account.nps_score <= 7) {
    factors.push(`Passive NPS score (${account.nps_score})`)
  }
  
  if (account.support_tickets_open && account.support_tickets_open >= 8) {
    factors.push(`High ticket volume (${account.support_tickets_open} open)`)
  } else if (account.support_tickets_open && account.support_tickets_open >= 5) {
    factors.push(`Elevated tickets (${account.support_tickets_open} open)`)
  }
  
  if (account.feature_adoption_pct !== null && account.feature_adoption_pct < 30) {
    factors.push(`Low feature adoption (${account.feature_adoption_pct}%)`)
  }
  
  // Generate summary reason based on tier
  let reason = ''
  switch (priorityTier) {
    case 'critical':
      reason = 'Immediate attention required due to high risk of churn combined with significant revenue impact.'
      break
    case 'high':
      reason = 'Elevated priority due to multiple risk indicators or high business value requiring proactive engagement.'
      break
    case 'medium':
      reason = 'Standard priority with moderate risk factors. Monitor and engage per normal cadence.'
      break
    case 'low':
      reason = 'Account is stable with minimal immediate concerns. Maintain relationship.'
      break
  }
  
  return { reason, factors: factors.slice(0, 4) }
}

function getQuickInsight(account: AccountWithPriority): { label: string; type: 'warning' | 'info' | 'success' }[] {
  const insights: { label: string; type: 'warning' | 'info' | 'success' }[] = []
  
  // Renewal urgency
  const renewal = getDaysUntilRenewal(account.renewal_date)
  if (renewal.days !== null && renewal.days <= 30) {
    insights.push({ label: `Renewal in ${renewal.days} days - urgent attention needed`, type: 'warning' })
  } else if (renewal.days !== null && renewal.days <= 60) {
    insights.push({ label: `Renewal in ${renewal.days} days - start preparation`, type: 'info' })
  }
  
  // Health concerns
  if (account.product_usage_score !== null && account.product_usage_score < 50) {
    insights.push({ label: `Low usage score (${account.product_usage_score}%) - risk of churn`, type: 'warning' })
  }
  
  // Support issues
  if (account.support_tickets_open && account.support_tickets_open > 5) {
    insights.push({ label: `${account.support_tickets_open} open tickets - customer may be frustrated`, type: 'warning' })
  }
  
  // NPS
  if (account.nps_score !== null && account.nps_score < 7) {
    insights.push({ label: `Low NPS (${account.nps_score}) - requires relationship repair`, type: 'warning' })
  } else if (account.nps_score !== null && account.nps_score >= 9) {
    insights.push({ label: `High NPS (${account.nps_score}) - expansion opportunity`, type: 'success' })
  }
  
  // Feature adoption
  if (account.feature_adoption_pct !== null && account.feature_adoption_pct < 30) {
    insights.push({ label: `Low feature adoption (${account.feature_adoption_pct}%) - training opportunity`, type: 'info' })
  }
  
  // Good standing
  if (insights.length === 0) {
    insights.push({ label: 'Account in good standing', type: 'success' })
  }
  
  return insights.slice(0, 3) // Max 3 insights
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-muted-foreground">Account</TableHead>
            <TableHead className="text-muted-foreground">Industry</TableHead>
            <TableHead className="text-muted-foreground">Priority</TableHead>
            <TableHead className="text-muted-foreground">Contract</TableHead>
            <TableHead className="text-muted-foreground">Renewal</TableHead>
            <TableHead className="text-muted-foreground">Health</TableHead>
            <TableHead className="text-muted-foreground">Tickets</TableHead>
            <TableHead className="text-muted-foreground">CSM</TableHead>
            <TableHead className="text-right text-muted-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const renewal = getDaysUntilRenewal(account.renewal_date)
            const health = getHealthIndicator(account.product_usage_score)
            const HealthIcon = health.icon

            return (
              <TableRow 
                key={account.id} 
                className="border-border cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/account/${account.id}`)}
              >
                <TableCell>
                  <HoverCard openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col cursor-pointer group">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                          {account.account_name}
                          <Info className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </span>
                        <span className="text-xs text-muted-foreground">{account.id}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80" side="right" align="start">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground">{account.account_name}</h4>
                          <Badge variant={getPriorityBadgeVariant(account.priorityTier)} className="text-xs">
                            {account.priorityTier}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatCurrency(account.contract_value)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{getDaysUntilRenewal(account.renewal_date).days !== null ? `${getDaysUntilRenewal(account.renewal_date).days}d to renewal` : 'No renewal'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <HeartPulse className="h-3 w-3" />
                            <span>Health: {account.product_usage_score ?? 'N/A'}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Ticket className="h-3 w-3" />
                            <span>{account.support_tickets_open ?? 0} open tickets</span>
                          </div>
                        </div>
                        
                        <div className="border-t border-border pt-2 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Quick Insights</p>
                          {getQuickInsight(account).map((insight, i) => (
                            <div 
                              key={i} 
                              className={`text-xs p-1.5 rounded ${
                                insight.type === 'warning' 
                                  ? 'bg-destructive/10 text-destructive' 
                                  : insight.type === 'success' 
                                  ? 'bg-chart-2/10 text-chart-2' 
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {insight.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
                <TableCell className="text-muted-foreground">{account.industry}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col gap-1.5 cursor-help">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                            account.priorityTier === 'critical' 
                              ? 'bg-red-600 text-white shadow-sm shadow-red-200' 
                              : account.priorityTier === 'high'
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                              : account.priorityTier === 'medium'
                              ? 'bg-amber-400 text-amber-900 shadow-sm shadow-amber-100'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {account.priorityTier === 'critical' && <ShieldAlert className="h-3.5 w-3.5" />}
                            {account.priorityTier.charAt(0).toUpperCase() + account.priorityTier.slice(1)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={account.priorityScore.overall} 
                              className={`h-1.5 w-16 ${
                                account.priorityTier === 'critical' ? '[&>div]:bg-red-600' :
                                account.priorityTier === 'high' ? '[&>div]:bg-orange-500' :
                                account.priorityTier === 'medium' ? '[&>div]:bg-amber-400' :
                                '[&>div]:bg-emerald-500'
                              }`}
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              {account.priorityScore.overall}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs p-3 bg-card border border-border">
                        {(() => {
                          const defensibility = getPriorityDefensibility(account)
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <ShieldAlert className={`h-4 w-4 ${
                                  account.priorityTier === 'critical' ? 'text-red-600' :
                                  account.priorityTier === 'high' ? 'text-orange-500' :
                                  account.priorityTier === 'medium' ? 'text-amber-500' :
                                  'text-emerald-500'
                                }`} />
                                <span className="font-semibold text-foreground">Why {account.priorityTier}?</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{defensibility.reason}</p>
                              {defensibility.factors.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-border">
                                  <p className="text-xs font-medium text-foreground">Key factors:</p>
                                  <ul className="space-y-0.5">
                                    {defensibility.factors.map((factor, i) => (
                                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                        <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                          account.priorityTier === 'critical' ? 'bg-red-500' :
                                          account.priorityTier === 'high' ? 'bg-orange-500' :
                                          account.priorityTier === 'medium' ? 'bg-amber-500' :
                                          'bg-emerald-500'
                                        }`} />
                                        {factor}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {formatCurrency(account.contract_value)}
                </TableCell>
                <TableCell>
                  {renewal.days !== null && renewal.days <= 30 ? (
                    <div className="flex flex-col gap-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white animate-pulse">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">{renewal.days}d</span>
                      </div>
                      <span className="text-xs text-red-600 font-medium">
                        {formatDate(account.renewal_date)}
                      </span>
                    </div>
                  ) : renewal.days !== null && renewal.days <= 60 ? (
                    <div className="flex flex-col gap-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500 text-white">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">{renewal.days}d</span>
                      </div>
                      <span className="text-xs text-orange-600 font-medium">
                        {formatDate(account.renewal_date)}
                      </span>
                    </div>
                  ) : renewal.days !== null && renewal.days <= 90 ? (
                    <div className="flex flex-col gap-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">{renewal.days}d</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(account.renewal_date)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground">
                        {renewal.days !== null ? `${renewal.days}d` : '-'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(account.renewal_date)}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <HealthIcon className={`h-4 w-4 ${health.color}`} />
                    <span className={`text-sm ${health.color}`}>
                      {account.product_usage_score ?? '-'}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className={account.support_tickets_open && account.support_tickets_open > 5 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                      {account.support_tickets_open ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">open</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {account.csm_name?.split(' ')[0] ?? '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/account/${account.id}`)
                    }}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
