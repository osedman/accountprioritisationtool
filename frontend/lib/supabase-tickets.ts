import { supabase } from './supabase'

export type TicketPriority = 'High' | 'Medium' | 'Low'

export interface TicketWithAccount {
  id: string
  account_id: string
  title: string
  description: string | null
  priority: TicketPriority
  status: string
  created_at: string
  account_name: string | null
}

export async function fetchTicketsWithAccounts(): Promise<{
  data: TicketWithAccount[]
  error: Error | null
}> {
  const res = await supabase
    .from('tickets')
    .select(
      `
      id,
      account_id,
      title,
      description,
      priority,
      status,
      created_at,
      accounts ( account_name )
    `,
    )
    .order('created_at', { ascending: false })

  if (res.error) {
    const plain = await supabase
      .from('tickets')
      .select('id, account_id, title, description, priority, status, created_at')
      .order('created_at', { ascending: false })

    if (plain.error) {
      return { data: [], error: new Error(plain.error.message) }
    }

    const rows = (plain.data ?? []) as Omit<TicketWithAccount, 'account_name'>[]
    const accountIds = [...new Set(rows.map((r) => r.account_id))]
    const names = new Map<string, string>()

    if (accountIds.length) {
      const acc = await supabase.from('accounts').select('id, account_name').in('id', accountIds)
      if (!acc.error && acc.data) {
        for (const a of acc.data as { id: string; account_name: string | null }[]) {
          names.set(a.id, a.account_name ?? a.id)
        }
      }
    }

    return {
      data: rows.map((r) => ({
        ...r,
        account_name: names.get(r.account_id) ?? null,
      })),
      error: null,
    }
  }

  const raw = res.data as Array<{
    id: string
    account_id: string
    title: string
    description: string | null
    priority: TicketPriority
    status: string
    created_at: string
    accounts: { account_name: string | null } | null
  }>

  return {
    data: raw.map((r) => ({
      id: r.id,
      account_id: r.account_id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      status: r.status,
      created_at: r.created_at,
      account_name: r.accounts?.account_name ?? null,
    })),
    error: null,
  }
}
