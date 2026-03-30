"use client"

import { useState } from 'react'
import { AccountWithPriority, Decision } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { ClipboardList, CheckCircle2 } from 'lucide-react'
import { createTaskFromDecision } from '@/lib/supabase-tasks'

interface DecisionRecorderProps {
  account: AccountWithPriority
  userName: string
  onDecisionSaved: (decision: Decision) => void
}

const ACTION_OPTIONS = [
  { value: 'schedule_call', label: 'Schedule Call' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'escalate_internally', label: 'Escalate Internally' },
  { value: 'create_support_ticket', label: 'Create Support Ticket' },
  { value: 'prepare_renewal_proposal', label: 'Prepare Renewal Proposal' },
  { value: 'arrange_training', label: 'Arrange Training Session' },
  { value: 'executive_engagement', label: 'Executive Engagement' },
  { value: 'upsell_discussion', label: 'Initiate Upsell Discussion' },
  { value: 'health_check', label: 'Conduct Health Check' },
  { value: 'other', label: 'Other' },
]

export function DecisionRecorder({ account, userName, onDecisionSaved }: DecisionRecorderProps) {
  const [action, setAction] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [taskSyncWarning, setTaskSyncWarning] = useState<string | null>(null)

  const handleSave = async () => {
    if (!action || !reasoning.trim()) return

    setIsSaving(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    const decision: Decision = {
      id: `dec-${Date.now()}`,
      accountId: account.id,
      action: ACTION_OPTIONS.find(a => a.value === action)?.label || action,
      reasoning: reasoning.trim(),
      createdAt: new Date().toISOString(),
      createdBy: userName
    }

    setTaskSyncWarning(null)
    const { error: taskErr } = await createTaskFromDecision(
      account.id,
      decision.action,
      decision.reasoning,
      account.account_name,
    )
    if (taskErr) {
      setTaskSyncWarning(taskErr.message)
    }

    onDecisionSaved(decision)
    setAction('')
    setReasoning('')
    setIsSaving(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-chart-2" />
          Record Decision
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showSuccess ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
            <p className="text-sm text-success">Decision recorded successfully!</p>
            {taskSyncWarning ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 px-2">
                Task not added: {taskSyncWarning}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Also added to Tasks.</p>
            )}
          </div>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel>Action</FieldLabel>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Reasoning</FieldLabel>
              <Textarea
                placeholder="Why are you taking this action? What do you hope to achieve?"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                className="bg-input border-border min-h-[100px]"
              />
            </Field>

            <Button 
              onClick={handleSave} 
              disabled={!action || !reasoning.trim() || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                'Record Decision'
              )}
            </Button>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  )
}
