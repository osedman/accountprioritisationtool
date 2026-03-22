"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountWithPriority } from '@/lib/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PriorityDistributionChartProps {
  accounts: AccountWithPriority[]
}

export function PriorityDistributionChart({ accounts }: PriorityDistributionChartProps) {
  const distribution = [
    { 
      name: 'Critical', 
      value: accounts.filter(a => a.priorityTier === 'critical').length,
      color: 'hsl(var(--destructive))'
    },
    { 
      name: 'High', 
      value: accounts.filter(a => a.priorityTier === 'high').length,
      color: 'hsl(var(--warning))'
    },
    { 
      name: 'Medium', 
      value: accounts.filter(a => a.priorityTier === 'medium').length,
      color: 'hsl(var(--chart-1))'
    },
    { 
      name: 'Low', 
      value: accounts.filter(a => a.priorityTier === 'low').length,
      color: 'hsl(var(--chart-2))'
    },
  ].filter(d => d.value > 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Priority Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend 
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
