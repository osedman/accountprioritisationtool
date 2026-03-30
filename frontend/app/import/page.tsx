'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Account } from '@/lib/types'
import {
  ACCOUNT_IMPORT_FIELDS,
  buildAccountFromRow,
  parseCSV,
  type AccountFieldKey,
} from '@/lib/csv-import'
import { readImportedAccounts, writeImportedAccounts } from '@/lib/accounts-dataset'

const SKIP = '__skip__'

function suggestMapping(headers: string[]): Partial<Record<AccountFieldKey, number>> {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g, ' ')
  const h = headers.map((x, i) => ({ i, n: norm(x) }))
  const find = (...aliases: string[]) => {
    for (const a of aliases) {
      const hit = h.find((x) => x.n === a || x.n.includes(a))
      if (hit) return hit.i
    }
    return undefined
  }
  const out: Partial<Record<AccountFieldKey, number>> = {}
  const id = find('id', 'account id')
  if (id !== undefined) out.id = id
  const name = find('account name', 'company', 'name', 'account')
  if (name !== undefined) out.account_name = name
  const ind = find('industry')
  if (ind !== undefined) out.industry = ind
  const emp = find('employee count', 'employees')
  if (emp !== undefined) out.employee_count = emp
  const rev = find('annual revenue', 'revenue')
  if (rev !== undefined) out.annual_revenue = rev
  const cv = find('contract value', 'contract')
  if (cv !== undefined) out.contract_value = cv
  const ren = find('renewal')
  if (ren !== undefined) out.renewal_date = ren
  const lc = find('last contact')
  if (lc !== undefined) out.last_contact_date = lc
  const nps = find('nps')
  if (nps !== undefined) out.nps_score = nps
  const open = find('open tickets', 'support tickets open')
  if (open !== undefined) out.support_tickets_open = open
  const closed = find('closed', '30d')
  if (closed !== undefined) out.support_tickets_closed_last_30d = closed
  const res = find('resolution', 'hours')
  if (res !== undefined) out.avg_ticket_resolution_hours = res
  const usage = find('usage', 'product usage')
  if (usage !== undefined) out.product_usage_score = usage
  const feat = find('adoption', 'feature')
  if (feat !== undefined) out.feature_adoption_pct = feat
  const log = find('login', 'weekly')
  if (log !== undefined) out.login_frequency_weekly = log
  const csm = find('csm')
  if (csm !== undefined) out.csm_name = csm
  const notes = find('notes')
  if (notes !== undefined) out.csm_notes = notes
  return out
}

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Partial<Record<AccountFieldKey, number>>>({})
  const [error, setError] = useState<string | null>(null)

  const columnOptions = useMemo(() => {
    return headers.map((h, i) => ({ i, label: h || `Column ${i + 1}` }))
  }, [headers])

  const onFile = useCallback((file: File | null) => {
    setError(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseCSV(text)
      if (parsed.length < 2) {
        setError('CSV needs a header row and at least one data row.')
        return
      }
      const hdrs = parsed[0].map((c) => c.trim())
      const dataRows = parsed.slice(1)
      setHeaders(hdrs)
      setRows(dataRows)
      setMapping(suggestMapping(hdrs))
      setStep('map')
    }
    reader.readAsText(file)
  }, [])

  const setFieldColumn = (field: AccountFieldKey, value: string) => {
    if (value === SKIP) {
      setMapping((m) => {
        const next = { ...m }
        delete next[field]
        return next
      })
      return
    }
    const idx = Number.parseInt(value, 10)
    setMapping((m) => ({ ...m, [field]: idx }))
  }

  const previewRows = rows.slice(0, 5)

  const runImport = () => {
    setError(null)
    if (mapping.account_name === undefined) {
      setError('Map at least the Account name column.')
      return
    }
    const built: Account[] = []
    rows.forEach((cells, i) => {
      const acc = buildAccountFromRow(cells, mapping, i + 1)
      if (acc) built.push(acc)
    })
    if (built.length === 0) {
      setError('No valid rows. Check column mapping (Account name is required).')
      return
    }
    const existing = readImportedAccounts()
    const byId = new Map<string, Account>()
    for (const a of existing) {
      byId.set(a.id, a)
    }
    for (const a of built) {
      byId.set(a.id, a)
    }
    writeImportedAccounts(Array.from(byId.values()))
    setStep('done')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Import accounts (CSV)</h1>
            <p className="text-sm text-muted-foreground">
              Map CSV columns to fields. Imports are stored in this browser and merged with the default
              dataset.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Choose file</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv,text/csv"
                className="text-sm"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </CardContent>
          </Card>
        )}

        {step === 'map' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Map columns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  We guessed some mappings from your header row — adjust as needed.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ACCOUNT_IMPORT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <Select
                        value={
                          mapping[key] !== undefined ? String(mapping[key]) : SKIP
                        }
                        onValueChange={(v) => setFieldColumn(key, v)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>— Skip —</SelectItem>
                          {columnOptions.map((col) => (
                            <SelectItem key={col.i} value={String(col.i)}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview (first rows)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="whitespace-nowrap">
                          {h || `Col ${i + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, ri) => (
                      <TableRow key={ri}>
                        {headers.map((_, ci) => (
                          <TableCell key={ci} className="text-xs max-w-[200px] truncate">
                            {r[ci] ?? ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={runImport}>Import accounts</Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Accounts were saved to browser storage and merged into the dashboard.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => router.push('/')}>View dashboard</Button>
                <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setHeaders([]); setMapping({}) }}>
                  Import another file
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
