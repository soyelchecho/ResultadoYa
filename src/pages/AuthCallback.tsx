import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Implicit flow: tokens are in the URL hash (#access_token=...&refresh_token=...)
    // Parse them directly and call setSession() — most reliable approach.
    const hash = window.location.hash.slice(1)  // remove '#'
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (data.session) {
            navigate('/crear', { replace: true })
          } else {
            console.error('setSession error:', error)
            navigate('/', { replace: true })
          }
        })
      return
    }

    // Fallback: maybe already have a session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/crear' : '/', { replace: true })
    })
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
