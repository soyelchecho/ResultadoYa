import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // With implicit flow (#access_token=...), Supabase processes the token
    // during initialization — before React mounts. So SIGNED_IN already fired.
    // onAuthStateChange replays INITIAL_SESSION synchronously when you subscribe,
    // so we handle both INITIAL_SESSION (session already set) and SIGNED_IN (race win).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        navigate('/crear', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/', { replace: true })
      }
    })

    const timer = setTimeout(() => navigate('/', { replace: true }), 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress sx={{ color: 'primary.main' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Iniciando sesión...
      </Typography>
    </Box>
  )
}
