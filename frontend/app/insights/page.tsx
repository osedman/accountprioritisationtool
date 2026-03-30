'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { scoreAndRankAccounts } from '@/lib/priority-scoring'
import { supabase } from '@/lib/supabase'
import { useMergedAccounts } from '@/hooks/use-merged-accounts'
import type { AccountWithPriority } from '@/lib/types'

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#b91c1c',
  high: '#dc2626',
  medium: '#ea580c',
  low: '#16a34a',
}

const TASK_PRIORITY_COLORS: Record<string, string> = {
  High: '#dc2626',
  Medium: '#ea580c',
  Low: '#16a34a',
}

type TaskRow = {
  id: string
  account_id: string
  title: string
  status: string
  priority: string
}

type Selection =
  | { chart: 'priority'; key: string }
  | { chart: 'tasks'; key: string }
  | { chart: 'scores'; key: string }
  | null

export default function InsightsPage() {
  const accountsRaw = useMergedAccounts()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [selection, setSelection] = useState<Selection>(null)

  const scored = useMemo(() => scoreAndRankAccounts(accountsRaw), [accountsRaw])

  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const a of scored) {
      counts[a.priorityTier] = (counts[a.priorityTier] ?? 0) + 1
    }
    return (['critical', 'high', 'medium', 'low'] as const).map((tier) => ({
      name: tier,
      label: tier.charAt(0).toUpperCase() + tier.slice(1),
      count: counts[tier] ?? 0,
      fill: PRIORITY_COLORS[tier] ?? '#888',
    }))
  }, [scored])

  const taskStatusData = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks) {
      const s = t.status || 'Unknown'
      m.set(s, (m.get(s) ?? 0) + 1)
    }
    return Array.from(m.entries()).map(([name, count]) => ({ name, count, fill: '#6366f1' }))
  }, [tasks])

  const scoreBuckets = useMemo(() => {
    const ranges = [
      { key: '0-25', min: 0, max: 25, count: 0, fill: '#94a3b8' },
      { key: '26-50', min: 26, max: 50, count: 0, fill: '#f59e0b' },
      { key: '51-75', min: 51, max: 75, count: 0, fill: '#ea580c' },
      { key: '76-100', min: 76, max: 100, count: 0, fill: '#16a34a' },
    ]
    for (const a of scored) {
      const v = a.priorityScore.overall
      for (const r of ranges) {
        if (v >= r.min && v <= r.max) {
          r.count += 1
          break
        }
      }
    }
    return ranges.map((r) => ({ name: r.key, count: r.count, fill: r.fill }))
  }, [scored])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.from('tasks').select('id, account_id, title, status, priority')
      if (!cancelled) {
        if (!error && data) {
          setTasks(data as TaskRow[])
        } else {
          setTasks([])
        }
        setLoadingTasks(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredAccounts = useMemo(() => {
    if (!selection || selection.chart !== 'priority') return null
    const tier = selection.key as AccountWithPriority['priorityTier']
    return scored.filter((a) => a.priorityTier === tier)
  }, [scored, selection])

  const filteredTasks = useMemo(() => {
    if (!selection || selection.chart !== 'tasks') return null
    return tasks.filter((t) => t.status === selection.key)
  }, [tasks, selection])

  const filteredByScore = useMemo(() => {
    if (!selection || selection.chart !== 'scores') return null
    const parts = selection.key.split('-').map(Number)
    const min = parts[0] ?? 0
    const max = parts[1] ?? 100
    return scored.filter((a) => a.priorityScore.overall >= min && a.priorityScore.overall <= max)
  }, [scored, selection])

  const tierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'critical':
        return 'text-red-700 dark:text-red-400'
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-orange-600'
      default:
        return 'text-green-600'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
            <p className="text-sm text-muted-foreground">
              Interactive charts — click a bar to filter the detail below.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
        </div>

        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Portfolio overview, task pipeline, and score distribution (includes imported accounts).
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Priority distribution (accounts)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      onClick={(_, index) => {
                        const row = priorityChartData[index]
                        if (row) setSelection({ chart: 'priority', key: row.name })
                      }}
                    >
                      {priorityChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} cursor="pointer" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">Click a bar to list accounts in that tier.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Tasks by status</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {loadingTasks ? (
                  <p className="text-sm text-muted-foreground">Loading tasks…</p>
                ) : taskStatusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks in Supabase.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskStatusData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        onClick={(_, index) => {
                          const row = taskStatusData[index]
                          if (row) setSelection({ chart: 'tasks', key: row.name })
                        }}
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} cursor="pointer" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <p className="text-xs text-muted-foreground mt-2">Click a bar to filter tasks by status.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Accounts by priority score</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreBuckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      onClick={(_, index) => {
                        const row = scoreBuckets[index]
                        if (row) setSelection({ chart: 'scores', key: row.name })
                      }}
                    >
                      {scoreBuckets.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} cursor="pointer" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Ranges use overall priority score (0–100). Click to filter accounts.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">All accounts ({scored.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Priority tier</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scored.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link
                          href={`/account/${a.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {a.account_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.industry}</TableCell>
                      <TableCell className={tierBadgeClass(a.priorityTier)}>
                        {a.priorityTier.charAt(0).toUpperCase() + a.priorityTier.slice(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{a.priorityScore.overall}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Filtered detail</CardTitle>
              {selection && (
                <Button variant="ghost" size="sm" onClick={() => setSelection(null)}>
                  Clear selection
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selection && (
                <p className="text-sm text-muted-foreground">Select a bar on any chart above.</p>
              )}
              {selection?.chart === 'priority' && filteredAccounts && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link href={`/account/${a.id}`} className="text-primary hover:underline">
                            {a.account_name}
                          </Link>
                        </TableCell>
                        <TableCell>{a.priorityTier}</TableCell>
                        <TableCell>{a.priorityScore.overall}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {selection?.chart === 'tasks' && filteredTasks && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>{t.status}</TableCell>
                        <TableCell>
                          <span style={{ color: TASK_PRIORITY_COLORS[t.priority] ?? 'inherit' }}>
                            {t.priority}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {selection?.chart === 'scores' && filteredByScore && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredByScore.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link href={`/account/${a.id}`} className="text-primary hover:underline">
                            {a.account_name}
                          </Link>
                        </TableCell>
                        <TableCell>{a.priorityScore.overall}</TableCell>
                        <TableCell>{a.priorityTier}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
