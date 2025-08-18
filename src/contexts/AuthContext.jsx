import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch profile from your "profiles" table
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Profile fetch error:', error)
      return null
    }
    return data
  }

  // Sign up (magic link)
  const signUp = async (email) => {
    const { error } = await supabase.auth.signUp({ email })
    if (error) throw error
  }

  // Sign in
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    setUser(data.user)
    const userProfile = await fetchProfile(data.user.id)
    setProfile(userProfile)
  }

  // Check if user needs to set password
  const checkNeedsPasswordSetup = async (email) => {
    const { data: userData, error } = await supabase.auth.getUserByEmail(email)
    if (error) throw error

    const userExists = userData?.user
    if (!userExists) return false

    // Fetch profile
    const profileData = await fetchProfile(userData.user.id)
    setProfile(profileData)
    setUser(userData.user)

    // If password_set is false or null, user needs to set password
    return !(profileData?.password_set)
  }

  // Complete sign up: set password, bio, account type
  const completeSignUp = async (password, userType, bio) => {
    if (!user) throw new Error('No active session found')

    // Update password
    const { error: updatePassError } = await supabase.auth.updateUser({
      password,
    })
    if (updatePassError) throw updatePassError

    // Update profile table
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        user_type: userType,
        bio,
        password_set: true,
      })
    if (updateProfileError) throw updateProfileError

    // Refresh profile state
    const updatedProfile = await fetchProfile(user.id)
    setProfile(updatedProfile)
  }

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id).then(setProfile)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id).then(setProfile)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        checkNeedsPasswordSetup,
        completeSignUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
