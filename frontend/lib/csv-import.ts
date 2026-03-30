import type { Account } from './types'

/** Minimal CSV parser (quoted fields, commas). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false

  const flushField = () => {
    row.push(cur)
    cur = ''
  }

  const flushRow = () => {
    flushField()
    if (row.some((c) => c.trim().length > 0)) {
      rows.push(row)
    }
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          q = false
        }
      } else {
        cur += c
      }
      continue
    }
    if (c === '"') {
      q = true
      continue
    }
    if (c === ',') {
      flushField()
      continue
    }
    if (c === '\n') {
      flushRow()
      continue
    }
    if (c === '\r') {
      continue
    }
    cur += c
  }
  flushRow()
  return rows
}

export type AccountFieldKey = keyof Account

export const ACCOUNT_IMPORT_FIELDS: { key: AccountFieldKey | ''; label: string; hint?: string }[] = [
  { key: 'id', label: 'Account ID (id)' },
  { key: 'account_name', label: 'Account name' },
  { key: 'industry', label: 'Industry' },
  { key: 'employee_count', label: 'Employee count' },
  { key: 'annual_revenue', label: 'Annual revenue' },
  { key: 'contract_value', label: 'Contract value' },
  { key: 'renewal_date', label: 'Renewal date' },
  { key: 'last_contact_date', label: 'Last contact date' },
  { key: 'nps_score', label: 'NPS score' },
  { key: 'support_tickets_open', label: 'Open support tickets' },
  { key: 'support_tickets_closed_last_30d', label: 'Tickets closed (30d)' },
  { key: 'avg_ticket_resolution_hours', label: 'Avg resolution (hours)' },
  { key: 'product_usage_score', label: 'Product usage %' },
  { key: 'feature_adoption_pct', label: 'Feature adoption %' },
  { key: 'login_frequency_weekly', label: 'Weekly logins' },
  { key: 'csm_name', label: 'CSM name' },
  { key: 'csm_notes', label: 'CSM notes' },
]

function parseNumber(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseString(raw: string): string | null {
  const t = raw.trim()
  return t ? t : null
}

export function buildAccountFromRow(
  cells: string[],
  columnIndexByField: Partial<Record<AccountFieldKey, number>>,
  rowIndex: number,
): Account | null {
  const get = (key: AccountFieldKey) => {
    const idx = columnIndexByField[key]
    if (idx === undefined || idx < 0) return ''
    return cells[idx] ?? ''
  }

  const name = get('account_name').trim()
  if (!name) return null

  let id = get('id').trim()
  if (!id) {
    id = `csv-${Date.now()}-${rowIndex}`
  }

  const account: Account = {
    id,
    account_name: name,
    industry: parseString(get('industry')) ?? 'Unknown',
    employee_count: parseNumber(get('employee_count')),
    annual_revenue: parseNumber(get('annual_revenue')),
    contract_value: parseNumber(get('contract_value')),
    renewal_date: parseString(get('renewal_date')),
    last_contact_date: parseString(get('last_contact_date')),
    nps_score: parseNumber(get('nps_score')),
    support_tickets_open: parseNumber(get('support_tickets_open')),
    support_tickets_closed_last_30d: parseNumber(get('support_tickets_closed_last_30d')),
    avg_ticket_resolution_hours: parseNumber(get('avg_ticket_resolution_hours')),
    product_usage_score: parseNumber(get('product_usage_score')),
    feature_adoption_pct: parseNumber(get('feature_adoption_pct')),
    login_frequency_weekly: parseNumber(get('login_frequency_weekly')),
    csm_name: parseString(get('csm_name')),
    csm_notes: parseString(get('csm_notes')),
  }

  return account
}
