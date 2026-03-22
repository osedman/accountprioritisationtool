"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { accountsData } from '@/lib/data/accounts'
import { 
  scoreAndRankAccounts, 
  calculatePortfolioMetrics, 
  getUniqueIndustries,
  filterAccounts 
} from '@/lib/priority-scoring'
import { DashboardHeader } from './dashboard-header'
import { PortfolioMetricsCards } from './portfolio-metrics'
import { FilterBar } from './filter-bar'
import { AccountsTable } from './accounts-table'
import { PriorityDistributionChart } from './priority-distribution-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Dashboard() {
  const router = useRouter()

  // Score all accounts once
  const scoredAccounts = useMemo(() => scoreAndRankAccounts(accountsData), [])
  const industries = useMemo(() => getUniqueIndustries(accountsData), [])
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filtered and sorted accounts
  const filteredAccounts = useMemo(() => {
    return filterAccounts(scoredAccounts, {
      industry: selectedIndustries,
      priorityTier: selectedTiers,
      search: searchQuery,
      sortBy: sortBy as 'priority' | 'revenue' | 'renewal' | 'health',
      sortOrder
    })
  }, [scoredAccounts, selectedIndustries, selectedTiers, searchQuery, sortBy, sortOrder])

  // Portfolio metrics (based on all accounts, not filtered)
  const metrics = useMemo(() => calculatePortfolioMetrics(scoredAccounts), [scoredAccounts])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedIndustries([])
    setSelectedTiers([])
    setSortBy('priority')
    setSortOrder('desc')
  }

  // Get top 5 accounts needing attention
  const topPriorityAccounts = scoredAccounts.slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Portfolio Metrics */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Portfolio Overview</h2>
          <PortfolioMetricsCards metrics={metrics} />
        </section>

        {/* Charts and Quick Insights */}
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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        account.priorityTier === 'critical' 
                          ? 'bg-destructive/20 text-destructive' 
                          : account.priorityTier === 'high'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {account.priorityTier.charAt(0).toUpperCase() + account.priorityTier.slice(1)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Filters and Table */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              All Accounts ({filteredAccounts.length})
            </h2>
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
            <AccountsTable accounts={filteredAccounts} />
          </div>
        </section>
      </main>
    </div>
  )
}
