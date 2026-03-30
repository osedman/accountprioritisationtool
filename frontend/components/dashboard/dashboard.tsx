"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  scoreAndRankAccounts,
  calculatePortfolioMetrics,
  getUniqueIndustries,
  filterAccounts,
} from '@/lib/priority-scoring'
import { useMergedAccounts } from '@/hooks/use-merged-accounts'
import { DashboardHeader } from './dashboard-header'
import { PortfolioMetricsCards } from './portfolio-metrics'
import { PortfolioInsights } from './portfolio-insights'
import { FilterBar } from './filter-bar'
import { AccountsTable } from './accounts-table'
import { PriorityDistributionChart } from './priority-distribution-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export function Dashboard() {
  const router = useRouter()
  const accountsRaw = useMergedAccounts()

  const scoredAccounts = useMemo(() => scoreAndRankAccounts(accountsRaw), [accountsRaw])
  const industries = useMemo(() => getUniqueIndustries(accountsRaw), [accountsRaw])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)

  const filteredAccounts = useMemo(() => {
    return filterAccounts(scoredAccounts, {
      industry: selectedIndustries,
      priorityTier: selectedTiers,
      search: searchQuery,
      sortBy: sortBy as 'priority' | 'revenue' | 'renewal' | 'health',
      sortOrder,
    })
  }, [scoredAccounts, selectedIndustries, selectedTiers, searchQuery, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize))

  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredAccounts.slice(start, start + pageSize)
  }, [filteredAccounts, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedIndustries, selectedTiers, sortBy, sortOrder, pageSize, filteredAccounts.length])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const metrics = useMemo(() => calculatePortfolioMetrics(scoredAccounts), [scoredAccounts])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedIndustries([])
    setSelectedTiers([])
    setSortBy('priority')
    setSortOrder('desc')
  }

  const topPriorityAccounts = scoredAccounts.slice(0, 5)

  const rangeStart = filteredAccounts.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, filteredAccounts.length)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Portfolio Overview</h2>
          <PortfolioMetricsCards metrics={metrics} />
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Insights</h2>
          <PortfolioInsights accounts={scoredAccounts} />
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <PriorityDistributionChart accounts={scoredAccounts} />

          <Card className="md:col-span-2 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Priority Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPriorityAccounts.map((account, index) => (
                  <button
                    key={account.id}
                    type="button"
                    className="w-full text-left flex items-center justify-between rounded-lg bg-muted/30 p-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => router.push(`/account/${account.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.industry} | Score: {account.priorityScore.overall}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          account.priorityTier === 'critical'
                            ? 'bg-destructive/20 text-destructive'
                            : account.priorityTier === 'high'
                              ? 'bg-warning/20 text-warning'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {account.priorityTier.charAt(0).toUpperCase() + account.priorityTier.slice(1)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              All Accounts ({filteredAccounts.length})
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="hidden sm:inline">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v) as (typeof PAGE_SIZE_OPTIONS)[number])}
              >
                <SelectTrigger className="w-[110px] h-8 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FilterBar
            industries={industries}
            selectedIndustries={selectedIndustries}
            selectedTiers={selectedTiers}
            searchQuery={searchQuery}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onIndustryChange={setSelectedIndustries}
            onTierChange={setSelectedTiers}
            onSearchChange={setSearchQuery}
            onSortChange={setSortBy}
            onSortOrderChange={setSortOrder}
            onClearFilters={clearFilters}
          />

          <div className="mt-4">
            <AccountsTable accounts={paginatedAccounts} />
          </div>

          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredAccounts.length === 0
                ? 'No accounts to show'
                : `Showing ${rangeStart}–${rangeEnd} of ${filteredAccounts.length}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
