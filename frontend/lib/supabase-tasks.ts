import { supabase } from './supabase'
import type { PriorityReasoning } from './types'

export type TaskPriority = 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Todo' | 'In Progress' | 'Done'

const MAX_TITLE_LEN = 200

/**
 * Resolve the Supabase `accounts.id` (UUID) for the account used by the app.
 *
 * Your app mock data uses stable IDs like `ACC001`, while Supabase may store UUIDs.
 * So we try (1) exact id match, then (2) match by `account_name`, then (3) fallback to the first accessible account.
 */
export async function resolveSupabaseAccountIdForAppAccount(
  appAccountId: string,
  appAccountName?: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const scoped = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', appAccountId)
      .maybeSingle()
    if (!scoped.error && scoped.data?.id) {
      return scoped.data.id
    }
  }

  const exact = await supabase
    .from('accounts')
    .select('id')
    .eq('id', appAccountId)
    .maybeSingle()
  if (!exact.error && exact.data?.id) {
    return exact.data.id
  }

  if (appAccountName) {
    // Try matching by account_name (more reliable than ids across systems).
    // If RLS prevents reading, these queries will error and we fall through.
    const term = String(appAccountName).trim()
    const partial = term.length >= 3 ? `%${term}%` : term
    if (user) {
      const scopedBySupabaseName = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        // Case-insensitive match to handle minor formatting differences.
        .ilike('name', term)
        .limit(1)
        .maybeSingle()
      if (!scopedBySupabaseName.error && scopedBySupabaseName.data?.id) {
        return scopedBySupabaseName.data.id
      }

      // Back-compat: some schemas might use `account_name` instead of `name`.
      const scopedByAccountName = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .ilike('account_name', term)
        .limit(1)
        .maybeSingle()
      if (!scopedByAccountName.error && scopedByAccountName.data?.id) {
        return scopedByAccountName.data.id
      }

      // Partial match as a last attempt within the user scope.
      const scopedBySupabaseNamePartial = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', partial)
        .limit(1)
        .maybeSingle()
      if (!scopedBySupabaseNamePartial.error && scopedBySupabaseNamePartial.data?.id) {
        return scopedBySupabaseNamePartial.data.id
      }
    }

    const bySupabaseName = await supabase
      .from('accounts')
      .select('id')
      .ilike('name', term)
      .limit(1)
      .maybeSingle()
    if (!bySupabaseName.error && bySupabaseName.data?.id) {
      return bySupabaseName.data.id
    }

    const byAccountName = await supabase
      .from('accounts')
      .select('id')
      .ilike('account_name', term)
      .limit(1)
      .maybeSingle()
    if (!byAccountName.error && byAccountName.data?.id) {
      return byAccountName.data.id
    }

    const bySupabaseNamePartial = await supabase
      .from('accounts')
      .select('id')
      .ilike('name', partial)
      .limit(1)
      .maybeSingle()
    if (!bySupabaseNamePartial.error && bySupabaseNamePartial.data?.id) {
      return bySupabaseNamePartial.data.id
    }
  }

  if (user) {
    const scoped = await supabase.from('accounts').select('id').eq('user_id', user.id).maybeSingle()
    if (!scoped.error && scoped.data?.id) {
      return scoped.data.id
    }
  }

  const fallback = await supabase.from('accounts').select('id').limit(1).maybeSingle()
  if (fallback.error || !fallback.data?.id) {
    return null
  }
  return fallback.data.id
}

export async function insertSupabaseTask(params: {
  accountIdUuid: string
  title: string
  description: string
  priority?: TaskPriority
  status?: TaskStatus
}): Promise<{ error: Error | null }> {
  const title = params.title.trim().slice(0, MAX_TITLE_LEN)
  if (!title) {
    return { error: new Error('Task title is empty') }
  }

  const { error } = await supabase.from('tasks').insert({
    account_id: params.accountIdUuid,
    title,
    description: params.description.trim() || null,
    priority: params.priority ?? 'Medium',
    status: params.status ?? 'Todo',
    assigned_to: null,
    due_date: null,
  })

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

export async function createTasksFromAiAnalysis(
  appAccountId: string,
  accountDisplayName: string,
  reasoning: PriorityReasoning,
): Promise<{ created: number; error: Error | null; skippedNoAccount?: boolean }> {
  const accountIdUuid = await resolveSupabaseAccountIdForAppAccount(appAccountId, accountDisplayName)
  if (!accountIdUuid) {
    return { created: 0, error: null, skippedNoAccount: true }
  }

  const actions = reasoning.recommendedActions.filter((a) => String(a).trim())
  const summary = reasoning.summary?.trim() ?? ''
  let created = 0
  let lastError: Error | null = null

  for (let i = 0; i < actions.length; i++) {
    const action = String(actions[i]).trim()
    const title = action.slice(0, MAX_TITLE_LEN)
    const description = [
      `From AI analysis — ${accountDisplayName}.`,
      summary ? `\nSummary: ${summary}` : '',
      `\nRecommended action ${i + 1} of ${actions.length}.`,
    ].join('')

    const { error } = await insertSupabaseTask({
      accountIdUuid,
      title,
      description: description.slice(0, 8000),
      priority: i === 0 ? 'High' : 'Medium',
    })

    if (error) {
      lastError = error
      break
    }
    created += 1
  }

  return { created, error: lastError }
}

export async function createTaskFromDecision(
  appAccountId: string,
  actionLabel: string,
  reasoning: string,
  accountDisplayName?: string,
): Promise<{ error: Error | null }> {
  const accountIdUuid = await resolveSupabaseAccountIdForAppAccount(appAccountId, accountDisplayName)
  if (!accountIdUuid) {
    return { error: new Error('No Supabase account linked for this record.') }
  }

  return insertSupabaseTask({
    accountIdUuid,
    title: actionLabel.slice(0, MAX_TITLE_LEN),
    description: `Recorded decision.\n\n${reasoning.trim()}`,
    priority: 'Medium',
    status: 'Todo',
  })
}
