'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AccountWithPriority } from '@/lib/types'
import { insertSupabaseTask, resolveSupabaseAccountIdForAppAccount } from '@/lib/supabase-tasks'

interface GenerateAiTaskButtonProps {
  account: AccountWithPriority
  onCreated?: () => void
}

export function GenerateAiTaskButton({ account, onCreated }: GenerateAiTaskButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await fetch('/api/tasks/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to generate task')
      }
      const task = data.task as { title: string; description: string; priority: 'High' | 'Medium' | 'Low' }
      const accountUuid = await resolveSupabaseAccountIdForAppAccount(account.id, account.account_name)
      if (!accountUuid) {
        throw new Error('No matching Supabase account row for this record.')
      }
      const { error } = await insertSupabaseTask({
        accountIdUuid: accountUuid,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'Todo',
      })
      if (error) {
        throw error
      }
      toast.success('Task created', { description: task.title })
      onCreated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1 shrink-0"
      disabled={loading}
      onClick={handleClick}
      title="Generate Task with AI"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden xl:inline">AI Task</span>
    </Button>
  )
}
