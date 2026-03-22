"use client"

import { Card, CardContent } from '@/components/ui/card'
import { PortfolioMetrics } from '@/lib/types'
import { 
  Building2, 
  DollarSign, 
  Heart, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Ticket
} from 'lucide-react'

interface PortfolioMetricsCardsProps {
  metrics: PortfolioMetrics
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return `$${(value / 1000).toFixed(0)}K`
}

export function PortfolioMetricsCards({ metrics }: PortfolioMetricsCardsProps) {
  const cards = [
    {
      title: 'Total Accounts',
      value: metrics.totalAccounts,
      icon: Building2,
      color: 'text-chart-2'
    },
    {
      title: 'Contract Value',
      value: formatCurrency(metrics.totalContractValue),
      icon: DollarSign,
      color: 'text-chart-5'
    },
    {
      title: 'Avg Health Score',
      value: `${metrics.avgHealthScore}%`,
      icon: Heart,
      color: metrics.avgHealthScore >= 70 ? 'text-success' : metrics.avgHealthScore >= 50 ? 'text-warning' : 'text-destructive'
    },
    {
      title: 'Critical Accounts',
      value: metrics.criticalAccounts,
      icon: AlertTriangle,
      color: 'text-destructive'
    },
    {
      title: 'High Priority',
      value: metrics.highPriorityAccounts,
      icon: TrendingUp,
      color: 'text-warning'
    },
    {
      title: 'Renewals (90d)',
      value: metrics.upcomingRenewals,
      icon: Calendar,
      color: 'text-chart-1'
    },
    {
      title: 'Open Tickets',
      value: metrics.openTickets,
      icon: Ticket,
      color: metrics.openTickets > 50 ? 'text-warning' : 'text-muted-foreground'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      {cards.map((card) => (
        <Card key={card.title} className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.title}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
