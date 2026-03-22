// Account data types based on CSV schema
export interface Account {
  id: string
  account_name: string
  industry: string
  employee_count: number | null
  annual_revenue: number | null
  contract_value: number | null
  renewal_date: string | null
  last_contact_date: string | null
  nps_score: number | null
  support_tickets_open: number | null
  support_tickets_closed_last_30d: number | null
  avg_ticket_resolution_hours: number | null
  product_usage_score: number | null
  feature_adoption_pct: number | null
  login_frequency_weekly: number | null
  csm_name: string | null
  csm_notes: string | null
}

// Priority scoring
export interface PriorityScore {
  overall: number
  revenueImpact: number
  urgency: number
  healthRisk: number
  opportunity: number
}

export interface PriorityReasoning {
  summary: string
  keyFactors: string[]
  risks: string[]
  opportunities: string[]
  recommendedActions: string[]
  // Optional user-selected preferred action index (0-based).
  preferredActionIndex?: number
}

export interface AccountWithPriority extends Account {
  priorityScore: PriorityScore
  priorityTier: 'critical' | 'high' | 'medium' | 'low'
  reasoning?: PriorityReasoning
}

// Decisions/Actions
export interface Decision {
  id: string
  accountId: string
  action: string
  reasoning: string
  createdAt: string
  createdBy: string
}

// Dashboard metrics
export interface PortfolioMetrics {
  totalAccounts: number
  totalContractValue: number
  avgHealthScore: number
  criticalAccounts: number
  highPriorityAccounts: number
  upcomingRenewals: number
  openTickets: number
}

// Filter state
export interface FilterState {
  industry: string[]
  priorityTier: string[]
  search: string
  sortBy: 'priority' | 'revenue' | 'renewal' | 'health'
  sortOrder: 'asc' | 'desc'
}

// Auth
export interface User {
  id: string
  name: string
  email: string
  role: 'csm' | 'manager' | 'admin'
}
