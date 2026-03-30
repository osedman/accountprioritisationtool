'use client'

import { useSyncExternalStore } from 'react'
import { accountsData } from '@/lib/data/accounts'
import type { Account } from '@/lib/types'
import {
  readImportedAccounts,
  mergeAccountsBase,
  ACCOUNTS_DATASET_CHANGED,
  IMPORTED_ACCOUNTS_KEY,
} from '@/lib/accounts-dataset'

let lastImportedRaw = ''
let lastSnapshot: Account[] = accountsData

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const handler = () => onChange()
  window.addEventListener(ACCOUNTS_DATASET_CHANGED, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(ACCOUNTS_DATASET_CHANGED, handler)
    window.removeEventListener('storage', handler)
  }
}

function getSnapshot(): Account[] {
  if (typeof window === 'undefined') {
    return accountsData
  }
  const raw = localStorage.getItem(IMPORTED_ACCOUNTS_KEY) ?? ''
  if (raw === lastImportedRaw) {
    return lastSnapshot
  }

  lastImportedRaw = raw
  lastSnapshot = mergeAccountsBase(accountsData, readImportedAccounts())
  return lastSnapshot
}

function getServerSnapshot(): Account[] {
  return accountsData
}

export function useMergedAccounts(): Account[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
