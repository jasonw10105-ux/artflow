import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user || null)
      if (data.session?.user) fetchProfile(data.session.user.id)
      setLoading(false)
    }
    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) fetchProfile(session.user.id)
    })
    return () => listener?.subscription?.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    if (!userId) return setProfile(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) console.error(error)
    else setProfile(data)
  }

  const registerWithEmail = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
    toast.success('Check your email for verification link!')
  }

  const completeSignUp = async (password, userType, bio, name) => {
    if (!user) throw new Error('No active session')
    await supabase.auth.updateUser({ password })
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name,
      bio,
      user_type: userType,
      password_set: true,
    })
    if (error) throw error
    await fetchProfile(user.id)
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.status === 400) {
        await supabase.auth.signInWithOtp({ email })
        throw new Error('No password set. Check your email to complete registration.')
      }
      throw error
    }
    await fetchProfile(data.user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, registerWithEmail, completeSignUp, signIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
