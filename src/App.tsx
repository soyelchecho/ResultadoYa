import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import Landing from '@/pages/Landing'
import AuthCallback from '@/pages/AuthCallback'
import CreateRoom from '@/pages/CreateRoom'
import JoinRoom from '@/pages/JoinRoom'
import RoomPage from '@/pages/RoomPage'
import AdminPanel from '@/pages/AdminPanel'

function LoadingScreen() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={48} sx={{ color: 'primary.main' }} />
    </Box>
  )
}

export default function App() {
  const { setUser, setLoading, loading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          display_name:
            session.user.user_metadata?.full_name ??
            session.user.email?.split('@')[0] ??
            'Admin',
          avatar_url: session.user.user_metadata?.avatar_url,
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          display_name:
            session.user.user_metadata?.full_name ??
            session.user.email?.split('@')[0] ??
            'Admin',
          avatar_url: session.user.user_metadata?.avatar_url,
        })
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/crear" element={<CreateRoom />} />
      <Route path="/unirse" element={<JoinRoom />} />
      <Route path="/sala/:code" element={<RoomPage />} />
      <Route path="/sala/:code/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
