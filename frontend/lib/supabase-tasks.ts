import { supabase } from './supabase'
import type { PriorityReasoning } from './types'

export type TaskPriority = 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Todo' | 'In Progress' | 'Done'

const MAX_TITLE_LEN = 200

export async function resolveSupabaseAccountIdForAppAccount(appAccountId: string): Promise<string | null> {
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

  const exact = await supabase.from('accounts').select('id').eq('id', appAccountId).maybeSingle()
  if (!exact.error && exact.data?.id) {
    return exact.data.id
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
  const accountIdUuid = await resolveSupabaseAccountIdForAppAccount(appAccountId)
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
): Promise<{ error: Error | null }> {
  const accountIdUuid = await resolveSupabaseAccountIdForAppAccount(appAccountId)
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
