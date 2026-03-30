import { supabase } from './supabase'
import type { PriorityReasoning } from './types'
import { resolveSupabaseAccountIdForAppAccount } from './supabase-tasks'

export async function saveAccountAnalysisToSupabase(
  appAccountId: string,
  accountDisplayName: string,
  reasoning: PriorityReasoning,
  preferredActionIndex: number | null,
): Promise<{ id: string | null; error: Error | null }> {
  const accountUuid = await resolveSupabaseAccountIdForAppAccount(appAccountId, accountDisplayName)
  if (!accountUuid) {
    return {
      id: null,
      error: new Error(
        'No matching Supabase account for this record. Add an `accounts` row whose `id` matches this account, or add a default account.',
      ),
    }
  }

  const { data, error } = await supabase
    .from('account_analyses')
    .insert({
      account_id: accountUuid,
      summary: reasoning.summary,
      key_factors: reasoning.keyFactors,
      risks: reasoning.risks,
      opportunities: reasoning.opportunities,
      recommended_actions: reasoning.recommendedActions,
      preferred_action_index: preferredActionIndex ?? null,
      raw_analysis: reasoning as unknown as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (error) {
    return { id: null, error: new Error(error.message) }
  }
  const id = data && typeof data === 'object' && 'id' in data ? String((data as { id: string }).id) : null
  if (!id) {
    return { id: null, error: new Error('Save succeeded but no id was returned.') }
  }
  return { id, error: null }
}
