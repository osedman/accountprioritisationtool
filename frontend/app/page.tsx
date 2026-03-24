'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {

  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState([])

  // 🔹 Check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // 🔹 LOGIN
  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('LOGIN ERROR:', error)
  }

  // 🔹 SIGN UP
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    console.log('SIGNUP ERROR:', error)
  }

  // 🔹 LOGOUT
  const logout = async () => {
    await supabase.auth.signOut()
  }

  // 🔹 FETCH DATA
  const fetchData = async () => {
    const { data } = await supabase.from('accounts').select('*')
    setAccounts(data || [])
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  // 🔴 IF NOT LOGGED IN → SHOW LOGIN
  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button onClick={login}>Login</button>
        <button onClick={signUp} style={{ marginLeft: '10px' }}>
          Sign Up
        </button>
      </div>
    )
  }

  // 🟢 LOGGED IN VIEW
  return (
    <div style={{ padding: '20px' }}>
      <h1>Accounts</h1>

      <button onClick={logout}>Logout</button>

      <div style={{ marginTop: '20px' }}>
        {accounts.map((acc) => (
          <div key={acc.id}>
            {acc.name} - {acc.industry} - {acc.score}
          </div>
        ))}
      </div>
    </div>
  )
}