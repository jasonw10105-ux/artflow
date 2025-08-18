import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
          subscribeToProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          return;
        }
        setUser(session.user);
        await fetchProfile(session.user.id);
        subscribeToProfile(session.user.id);
      }
    );

    return () => {
      subscription.unsubscribe();
      supabase.channel('profiles-changes').unsubscribe();
    };
  }, []);

  const subscribeToProfile = (userId) => {
    supabase.channel('profiles-changes').unsubscribe();
    supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setUser(null);
            setProfile(null);
          } else if (payload.eventType === 'UPDATE') setProfile(payload.new);
        }
      )
      .subscribe();
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) {
        setUser(null);
        setProfile(null);
        return;
      }
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUser(null);
      setProfile(null);
    }
  };

  // Sign-up: send magic link **without auto-login**
  const signUp = async (email) => {
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new Error('Email already exists. Please log in.');
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/set-password?type=signup`,
      },
    });

    if (error) throw error;
    return data;
  };

  // Complete signup by setting password
  const completeSignUp = async (email, password, userType, bio) => {
    // 1. Create user with password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    // 2. Upsert profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        user_type: userType,
        bio,
        password_set: true,
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return profileData;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    await fetchProfile(data.user.id);
    return data;
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    supabase.channel('profiles-changes').unsubscribe();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUp, completeSignUp, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
