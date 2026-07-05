import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (v: boolean) => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))
