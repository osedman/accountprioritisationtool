"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { User } from './types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users for demo
const MOCK_USERS: { email: string; password: string; user: User }[] = [
  {
    email: 'sarah@company.com',
    password: 'demo123',
    user: {
      id: 'user-1',
      name: 'Sarah Johnson',
      email: 'sarah@company.com',
      role: 'csm'
    }
  },
  {
    email: 'mike@company.com',
    password: 'demo123',
    user: {
      id: 'user-2',
      name: 'Mike Chen',
      email: 'mike@company.com',
      role: 'csm'
    }
  },
  {
    email: 'lisa@company.com',
    password: 'demo123',
    user: {
      id: 'user-3',
      name: 'Lisa Park',
      email: 'lisa@company.com',
      role: 'csm'
    }
  },
  {
    email: 'admin@company.com',
    password: 'admin123',
    user: {
      id: 'user-4',
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'admin'
    }
  }
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const found = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    
    if (found) {
      setUser(found.user)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
