import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(() => navigate('/'))
  }, [navigate])

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
      <CircularProgress sx={{ color: 'primary.main' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Iniciando sesión...</Typography>
    </Box>
  )
}
