import { Account, AccountWithPriority, PriorityScore, PortfolioMetrics } from './types'

// Calculate days until renewal
function daysUntilRenewal(renewalDate: string | null): number | null {
  if (!renewalDate) return null
  const today = new Date()
  const renewal = new Date(renewalDate)
  const diffTime = renewal.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Calculate days since last contact
function daysSinceContact(lastContactDate: string | null): number | null {
  if (!lastContactDate) return null
  const today = new Date()
  const lastContact = new Date(lastContactDate)
  const diffTime = today.getTime() - lastContact.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Normalize a value to 0-100 scale
function normalize(value: number | null, min: number, max: number, invert = false): number {
  if (value === null) return 50 // Default to middle for missing data
  const clamped = Math.max(min, Math.min(max, value))
  const normalized = ((clamped - min) / (max - min)) * 100
  return invert ? 100 - normalized : normalized
}

// Calculate Revenue Impact Score (0-100)
function calculateRevenueImpact(account: Account): number {
  const contractScore = normalize(account.contract_value, 10000, 350000)
  const companySize = normalize(account.annual_revenue, 1000000, 800000000)
  return Math.round(contractScore * 0.7 + companySize * 0.3)
}

// Calculate Urgency Score (0-100)
function calculateUrgency(account: Account): number {
  const days = daysUntilRenewal(account.renewal_date)
  const daysSinceContactVal = daysSinceContact(account.last_contact_date)
  
  // Closer renewal = higher urgency
  const renewalUrgency = days !== null 
    ? normalize(days, 0, 365, true) 
    : 50
  
  // More days since contact = higher urgency
  const contactUrgency = daysSinceContactVal !== null
    ? normalize(daysSinceContactVal, 0, 60)
    : 50
  
  // Open tickets add urgency
  const ticketUrgency = normalize(account.support_tickets_open, 0, 15)
  
  return Math.round(renewalUrgency * 0.5 + contactUrgency * 0.25 + ticketUrgency * 0.25)
}

// Calculate Health Risk Score (0-100, higher = more at risk)
function calculateHealthRisk(account: Account): number {
  // Lower NPS = higher risk
  const npsRisk = account.nps_score !== null 
    ? normalize(account.nps_score, 0, 10, true)
    : 60 // Missing NPS is moderately risky
  
  // Lower usage = higher risk
  const usageRisk = normalize(account.product_usage_score, 0, 100, true)
  
  // Lower adoption = higher risk  
  const adoptionRisk = normalize(account.feature_adoption_pct, 0, 100, true)
  
  // More open tickets = higher risk
  const ticketRisk = normalize(account.support_tickets_open, 0, 15)
  
  // Slower resolution = higher risk
  const resolutionRisk = normalize(account.avg_ticket_resolution_hours, 0, 72)
  
  return Math.round(
    npsRisk * 0.25 + 
    usageRisk * 0.25 + 
    adoptionRisk * 0.2 + 
    ticketRisk * 0.15 + 
    resolutionRisk * 0.15
  )
}

// Calculate Opportunity Score (0-100)
function calculateOpportunity(account: Account): number {
  // High NPS = high opportunity
  const npsOpp = account.nps_score !== null 
    ? normalize(account.nps_score, 0, 10)
    : 30
  
  // High usage = high opportunity
  const usageOpp = normalize(account.product_usage_score, 0, 100)
  
  // High adoption = high opportunity
  const adoptionOpp = normalize(account.feature_adoption_pct, 0, 100)
  
  // Company size = expansion potential
  const sizeOpp = normalize(account.employee_count, 0, 5000)
  
  return Math.round(
    npsOpp * 0.3 +
    usageOpp * 0.25 +
    adoptionOpp * 0.25 +
    sizeOpp * 0.2
  )
}

// Calculate overall priority score
function calculateOverallPriority(scores: Omit<PriorityScore, 'overall'>): number {
  // Weight: Urgency and Health Risk matter most for prioritization
  return Math.round(
    scores.revenueImpact * 0.25 +
    scores.urgency * 0.30 +
    scores.healthRisk * 0.30 +
    scores.opportunity * 0.15
  )
}

// Determine priority tier
function determinePriorityTier(overallScore: number): 'critical' | 'high' | 'medium' | 'low' {
  if (overallScore >= 75) return 'critical'
  if (overallScore >= 55) return 'high'
  if (overallScore >= 35) return 'medium'
  return 'low'
}

// Main function to score an account
export function scoreAccount(account: Account): AccountWithPriority {
  const revenueImpact = calculateRevenueImpact(account)
  const urgency = calculateUrgency(account)
  const healthRisk = calculateHealthRisk(account)
  const opportunity = calculateOpportunity(account)
  
  const overall = calculateOverallPriority({ revenueImpact, urgency, healthRisk, opportunity })
  
  return {
    ...account,
    priorityScore: {
      overall,
      revenueImpact,
      urgency,
      healthRisk,
      opportunity
    },
    priorityTier: determinePriorityTier(overall)
  }
}

// Score all accounts and sort by priority
export function scoreAndRankAccounts(accounts: Account[]): AccountWithPriority[] {
  return accounts
    .map(scoreAccount)
    .sort((a, b) => b.priorityScore.overall - a.priorityScore.overall)
}

// Calculate portfolio-level metrics
export function calculatePortfolioMetrics(accounts: AccountWithPriority[]): PortfolioMetrics {
  const totalAccounts = accounts.length
  const totalContractValue = accounts.reduce((sum, a) => sum + (a.contract_value || 0), 0)
  
  const healthScores = accounts
    .filter(a => a.product_usage_score !== null)
    .map(a => a.product_usage_score as number)
  const avgHealthScore = healthScores.length > 0 
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : 0
  
  const criticalAccounts = accounts.filter(a => a.priorityTier === 'critical').length
  const highPriorityAccounts = accounts.filter(a => a.priorityTier === 'high').length
  
  // Accounts renewing in next 90 days
  const today = new Date()
  const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  const upcomingRenewals = accounts.filter(a => {
    if (!a.renewal_date) return false
    const renewalDate = new Date(a.renewal_date)
    return renewalDate >= today && renewalDate <= in90Days
  }).length
  
  const openTickets = accounts.reduce((sum, a) => sum + (a.support_tickets_open || 0), 0)
  
  return {
    totalAccounts,
    totalContractValue,
    avgHealthScore,
    criticalAccounts,
    highPriorityAccounts,
    upcomingRenewals,
    openTickets
  }
}

// Get unique industries from accounts
export function getUniqueIndustries(accounts: Account[]): string[] {
  return [...new Set(accounts.map(a => a.industry))].sort()
}

// Filter and sort accounts
export function filterAccounts(
  accounts: AccountWithPriority[],
  filters: {
    industry?: string[]
    priorityTier?: string[]
    search?: string
    sortBy?: 'priority' | 'revenue' | 'renewal' | 'health'
    sortOrder?: 'asc' | 'desc'
  }
): AccountWithPriority[] {
  let filtered = [...accounts]
  
  // Filter by industry
  if (filters.industry && filters.industry.length > 0) {
    filtered = filtered.filter(a => filters.industry!.includes(a.industry))
  }
  
  // Filter by priority tier
  if (filters.priorityTier && filters.priorityTier.length > 0) {
    filtered = filtered.filter(a => filters.priorityTier!.includes(a.priorityTier))
  }
  
  // Search by name or notes
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(a => 
      a.account_name.toLowerCase().includes(searchLower) ||
      (a.csm_notes && a.csm_notes.toLowerCase().includes(searchLower))
    )
  }
  
  // Sort
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1
  switch (filters.sortBy) {
    case 'revenue':
      filtered.sort((a, b) => ((b.contract_value || 0) - (a.contract_value || 0)) * sortOrder)
      break
    case 'renewal':
      filtered.sort((a, b) => {
        const dateA = a.renewal_date ? new Date(a.renewal_date).getTime() : Infinity
        const dateB = b.renewal_date ? new Date(b.renewal_date).getTime() : Infinity
        return (dateA - dateB) * sortOrder
      })
      break
    case 'health':
      filtered.sort((a, b) => ((a.product_usage_score || 0) - (b.product_usage_score || 0)) * sortOrder)
      break
    default:
      filtered.sort((a, b) => (b.priorityScore.overall - a.priorityScore.overall) * sortOrder)
  }
  
  return filtered
}
