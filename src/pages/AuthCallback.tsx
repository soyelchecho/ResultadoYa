import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // PKCE: getSession() triggers the code exchange when ?code= is in the URL.
    // We listen for the SIGNED_IN event which fires once the exchange completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/crear', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/', { replace: true })
      }
    })

    // Kick off the exchange (detects ?code= in the URL automatically)
    supabase.auth.getSession()

    // Fallback: if nothing fires in 8s, go home
    const timer = setTimeout(() => navigate('/', { replace: true }), 8000)

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
