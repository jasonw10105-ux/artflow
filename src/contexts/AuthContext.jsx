import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileChannel = useRef(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Handle magic link in URL
        const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl({ storeSession: true })
        if (sessionError) throw sessionError

        const currentSession = sessionData?.session
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id)
          subscribeToProfile(currentSession.user.id)
        } else {
          setProfile(null)
        }

      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        await signOut()
        return
      }
      setUser(session.user)
      await fetchProfile(session.user.id)
      subscribeToProfile(session.user.id)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      if (profileChannel.current) profileCha
