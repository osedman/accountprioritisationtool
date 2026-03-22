"use client"

import { use } from 'react'
import { useAuth } from '@/lib/auth-context'
import { LoginForm } from '@/components/login-form'
import { AccountDetail } from '@/components/account/account-detail'

interface AccountPageProps {
  params: Promise<{ id: string }>
}

export default function AccountPage({ params }: AccountPageProps) {
  const { isAuthenticated } = useAuth()
  const resolvedParams = use(params)

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <AccountDetail accountId={resolvedParams.id} />
}
