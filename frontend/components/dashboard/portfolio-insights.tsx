"use client"

import { useMemo } from "react"
import { AccountWithPriority } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calendar, Ticket } from "lucide-react"

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A"
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  return `$${(value / 1000).toFixed(0)}K`
}

export function PortfolioInsights({ accounts }: { accounts: AccountWithPriority[] }) {
  const insights = useMemo(() => {
    const withRenewal = accounts
      .map((a) => ({ a, days: daysUntil(a.renewal_date) }))
      .filter((x) => x.days !== null)
      .sort((x, y) => (x.days as number) - (y.days as number))

    const renew30 = withRenewal.filter((x) => (x.days as number) <= 30).length
    const renew60 = withRenewal.filter((x) => (x.days as number) <= 60).length
    const renew90 = withRenewal.filter((x) => (x.days as number) <= 90).length
    const topRenewals = withRenewal.slice(0, 3)

    const totalContract = accounts.reduce((sum, a) => sum + (a.contract_value ?? 0), 0)
    const atRisk = accounts.filter((a) => a.priorityTier === "critical" || a.priorityTier === "high")
    const atRiskContract = atRisk.reduce((sum, a) => sum + (a.contract_value ?? 0), 0)
    const atRiskPct = totalContract > 0 ? Math.round((atRiskContract / totalContract) * 100) : 0

    const openTickets = accounts.reduce((sum, a) => sum + (a.support_tickets_open ?? 0), 0)
    const ticketOutliers = [...accounts]
      .filter((a) => (a.support_tickets_open ?? 0) > 5)
      .sort((a, b) => (b.support_tickets_open ?? 0) - (a.support_tickets_open ?? 0))
      .slice(0, 3)

    return {
      renew30,
      renew60,
      renew90,
      topRenewals,
      atRiskCount: atRisk.length,
      atRiskPct,
      atRiskContract,
      openTickets,
      ticketOutliers,
    }
  }, [accounts])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Renewals at risk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{insights.renew30} ≤30d</Badge>
            <Badge variant="secondary">{insights.renew60} ≤60d</Badge>
            <Badge variant="secondary">{insights.renew90} ≤90d</Badge>
          </div>
          <div className="space-y-2">
            {insights.topRenewals.map(({ a, days }) => (
              <div key={a.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.account_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.industry}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{days}d</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(a.contract_value)}</p>
                </div>
              </div>
            ))}
            {insights.topRenewals.length === 0 && (
              <p className="text-sm text-muted-foreground">No renewal dates available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Risk concentration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground">{insights.atRiskPct}%</p>
            <p className="text-xs text-muted-foreground">of contract value in high/critical</p>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
            <p className="text-sm text-muted-foreground">High/Critical accounts</p>
            <p className="text-sm font-semibold text-foreground">{insights.atRiskCount}</p>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
            <p className="text-sm text-muted-foreground">At-risk contract value</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(insights.atRiskContract)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Support load
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground">{insights.openTickets}</p>
            <p className="text-xs text-muted-foreground">total open tickets</p>
          </div>
          <div className="space-y-2">
            {insights.ticketOutliers.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.account_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.industry}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {a.support_tickets_open ?? 0} open
                </Badge>
              </div>
            ))}
            {insights.ticketOutliers.length === 0 && (
              <p className="text-sm text-muted-foreground">No ticket outliers detected.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

