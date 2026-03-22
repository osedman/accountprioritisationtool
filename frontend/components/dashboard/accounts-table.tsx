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
import { ArrowUpRight, AlertCircle, TrendingUp, Minus, TrendingDown } from 'lucide-react'

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
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{account.account_name}</span>
                    <span className="text-xs text-muted-foreground">{account.id}</span>
                  </div>
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
