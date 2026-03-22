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
import { ArrowUpRight, AlertCircle, TrendingUp, Minus, TrendingDown, Calendar, DollarSign, HeartPulse, Ticket, Info } from 'lucide-react'

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
                  <div className="flex flex-col gap-1">
                    <Badge variant={getPriorityBadgeVariant(account.priorityTier)}>
                      {account.priorityTier.charAt(0).toUpperCase() + account.priorityTier.slice(1)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={account.priorityScore.overall} 
                        className="h-1 w-16" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {account.priorityScore.overall}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {formatCurrency(account.contract_value)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {renewal.urgent && <AlertCircle className="h-3 w-3 text-warning" />}
                    <span className={renewal.urgent ? 'text-warning' : 'text-muted-foreground'}>
                      {renewal.days !== null ? `${renewal.days}d` : '-'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(account.renewal_date)}
                  </span>
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
