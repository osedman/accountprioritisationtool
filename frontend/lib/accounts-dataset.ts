import type { Account } from './types'
import { accountsData as baseAccounts } from './data/accounts'

export const IMPORTED_ACCOUNTS_KEY = 'prioritisation-imported-accounts-v1'

export const ACCOUNTS_DATASET_CHANGED = 'accounts-dataset-changed'

export function readImportedAccounts(): Account[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(IMPORTED_ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Account[]) : []
  } catch {
    return []
  }
}

export function writeImportedAccounts(accounts: Account[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(IMPORTED_ACCOUNTS_KEY, JSON.stringify(accounts))
  window.dispatchEvent(new CustomEvent(ACCOUNTS_DATASET_CHANGED))
}

export function mergeAccountsBase(base: Account[], extra: Account[]): Account[] {
  const map = new Map<string, Account>()
  for (const a of base) {
    map.set(a.id, { ...a })
  }
  for (const a of extra) {
    map.set(a.id, { ...a })
  }
  return Array.from(map.values())
}

export function getMergedAccountsSnapshot(): Account[] {
  return mergeAccountsBase(baseAccounts, readImportedAccounts())
}
