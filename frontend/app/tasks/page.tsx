'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type TaskPriority = 'High' | 'Medium' | 'Low'
type TaskStatus = 'Todo' | 'In Progress' | 'Done'

interface Task {
  id: string
  account_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  due_date: string | null
  created_at: string
}

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low']
const STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Done']

function priorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'High':
      return '#c62828'
    case 'Medium':
      return '#ef6c00'
    case 'Low':
      return '#2e7d32'
    default:
      return '#666'
  }
}

async function fetchTasks(): Promise<{ data: Task[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  return { data: data as Task[], error: null }
}

async function addTask(payload: {
  account_id: string
  title: string
  priority: TaskPriority
  due_date: string | null
}): Promise<{ data: Task | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      account_id: payload.account_id,
      title: payload.title.trim(),
      description: '',
      priority: payload.priority,
      status: 'Todo' as TaskStatus,
      assigned_to: null,
      due_date: payload.due_date || null,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  return { data: data as Task, error: null }
}

async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'status' | 'priority' | 'title' | 'due_date'>>
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('tasks').update(updates).eq('id', id)

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

async function deleteTask(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [dueDate, setDueDate] = useState('')

  const refresh = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await fetchTasks()
    if (fetchError) {
      setError(fetchError.message)
      setTasks([])
    } else {
      setTasks(data ?? [])
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let resolvedId: string | null = null
      let accError: { message: string } | null = null

      if (user) {
        const scoped = await supabase.from('accounts').select('id').eq('user_id', user.id).maybeSingle()
        if (!scoped.error && scoped.data?.id) {
          resolvedId = scoped.data.id
        }
      }

      if (!resolvedId) {
        const { data, error } = await supabase.from('accounts').select('id').limit(1).maybeSingle()
        if (error) {
          accError = error
        } else {
          resolvedId = data?.id ?? null
        }
      }

      if (!cancelled) {
        if (accError) {
          setError((prev) => prev ?? accError!.message)
          setAccountId(null)
        } else {
          setAccountId(resolvedId)
        }
      }
    }

    async function init() {
      setLoading(true)
      await Promise.all([refresh(), loadAccount()])
      if (!cancelled) {
        setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [refresh])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!accountId) {
      setError('No account available. Ensure an account exists in Supabase.')
      return
    }

    setError(null)
    const { error: addError } = await addTask({
      account_id: accountId,
      title,
      priority,
      due_date: dueDate || null,
    })

    if (addError) {
      setError(addError.message)
      return
    }

    setTitle('')
    setDueDate('')
    setPriority('Medium')
    await refresh()
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setError(null)
    const { error: updError } = await updateTask(taskId, { status })
    if (updError) {
      setError(updError.message)
      return
    }
    await refresh()
  }

  async function handleDelete(taskId: string) {
    setError(null)
    const { error: delError } = await deleteTask(taskId)
    if (delError) {
      setError(delError.message)
      return
    }
    await refresh()
  }

  const pageStyle: React.CSSProperties = {
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: 'system-ui, sans-serif',
  }

  return (
    <div style={pageStyle}>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          fontSize: 14,
          color: '#1976d2',
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        ← Back to dashboard
      </Link>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Tasks</h1>
      <p style={{ color: '#555', marginBottom: 24, fontSize: 14 }}>
        Create and manage tasks linked to your accounts.
      </p>

      {error && (
        <div
          style={{
            background: '#ffebee',
            color: '#b71c1c',
            padding: '10px 12px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            style={{
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
              minWidth: 120,
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!accountId}
          style={{
            padding: '8px 16px',
            background: accountId ? '#1976d2' : '#bdbdbd',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 14,
            cursor: accountId ? 'pointer' : 'not-allowed',
          }}
        >
          Create
        </button>
      </form>

      {!accountId && !loading && (
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Add at least one row to the <code>accounts</code> table so new tasks can be created.
        </p>
      )}

      {loading ? (
        <p style={{ color: '#666' }}>Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#666' }}>No tasks yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: 14,
                marginBottom: 10,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{task.title}</div>
                <div style={{ fontSize: 13, color: '#555' }}>
                  <span style={{ color: priorityColor(task.priority), fontWeight: 600 }}>{task.priority}</span>
                  {task.due_date && (
                    <>
                      <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                      <span>Due {task.due_date}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Status</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#fff',
                    color: '#c62828',
                    border: '1px solid #c62828',
                    borderRadius: 4,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
