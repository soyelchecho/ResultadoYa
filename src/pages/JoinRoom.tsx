import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Container, Typography,
  TextField, Stack, Alert, CircularProgress, Chip, Divider,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useGuestStore } from '@/store/guestStore'
import type { Room } from '@/types'
import { scoreLabel } from '@/lib/scores'
import { glowText } from '@/theme'

const MotionBox = motion(Box)

export default function JoinRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { guestId, guestName, setGuestName } = useGuestStore()

  const [code, setCode]           = useState(searchParams.get('code') ?? '')
  const [name, setName]           = useState(guestName ?? (user?.display_name ?? ''))
  const [room, setRoom]           = useState<Room | null>(null)
  const [selectedScore, setSelectedScore] = useState<{ home: number; away: number } | null>(null)
  const [loading, setLoading]     = useState(false)
  const [joining, setJoining]     = useState(false)
  const [error, setError]         = useState('')

  const currentUserId = user?.id ?? guestId

  // Auto-fetch room when code has 6 chars
  useEffect(() => {
    if (code.length === 6) fetchRoom(code.toUpperCase())
    else setRoom(null)
  }, [code])

  const fetchRoom = async (c: string) => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', c)
        .single()
      if (err || !data) { setError('Sala no encontrada. Verificá el código.'); setRoom(null); return }
      if (data.status !== 'waiting') {
        setError('Esta sala ya no acepta nuevos participantes.')
        setRoom(data as Room)
        return
      }
      setRoom(data as Room)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!room || !name.trim()) return
    if (room.mode === 'pronostico' && !selectedScore) {
      setError('Elegí tu pronóstico antes de unirte.')
      return
    }
    setJoining(true)
    setError('')
    try {
      // Check already joined
      const { data: existing } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', currentUserId)
        .single()

      if (existing) {
        // Already joined — just navigate
        navigate(`/sala/${room.code}`)
        return
      }

      // Check room capacity for sorteo mode
      if (room.mode === 'sorteo') {
        const { count } = await supabase
          .from('room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
        const maxSlots = (room.max_goals + 1) * (room.max_goals + 1)
        if ((count ?? 0) >= maxSlots) {
          setError('La sala está llena. Todos los marcadores ya tienen dueño.')
          return
        }
      }

      if (!user) setGuestName(name.trim())

      const { error: err } = await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: currentUserId,
        display_name: name.trim(),
        avatar_url: user?.avatar_url ?? null,
        is_guest: !user,
        score_home: room.mode === 'pronostico' ? selectedScore?.home ?? null : null,
        score_away: room.mode === 'pronostico' ? selectedScore?.away ?? null : null,
      })
      if (err) {
        if (err.code === '23505') {
          navigate(`/sala/${room.code}`)
          return
        }
        throw err
      }
      navigate(`/sala/${room.code}`)
    } catch (e: unknown) {
      setError((e as Error).message || 'No se pudo unir a la sala.')
      setJoining(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Volver
        </Button>

        <Typography variant="h2" sx={{ fontSize: '2.5rem', mb: 0.5, ...glowText() }}>
          UNIRSE
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Ingresá el código de sala que te compartieron
        </Typography>

        <Stack spacing={3}>

          {/* Code + name */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <TextField
                  label="Código de sala"
                  placeholder="ABCD12"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  fullWidth
                  inputProps={{ style: { fontFamily: 'monospace', letterSpacing: '0.3rem', fontSize: '1.3rem', fontWeight: 800 } }}
                  InputProps={{
                    endAdornment: loading ? <CircularProgress size={20} sx={{ color: 'primary.main' }} /> : null,
                  }}
                />

                {room && room.status === 'waiting' && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: 'rgba(34,197,94,0.06)',
                      border: '1px solid rgba(34,197,94,0.2)',
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {room.name}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 1 }}>
                      {room.team_home} vs {room.team_away}
                    </Typography>
                    <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={room.mode === 'sorteo' ? '🎲 Sorteo' : '🎯 Pronóstico'}
                        sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: 'primary.main' }}
                      />
                      <Chip
                        size="small"
                        label={`hasta ${room.max_goals}-${room.max_goals}`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.secondary' }}
                      />
                      {room.entry_price > 0 && (
                        <Chip
                          size="small"
                          label={`$${room.entry_price.toLocaleString('es-CO')} entrada`}
                          sx={{ bgcolor: 'rgba(255,215,0,0.1)', color: '#FFD700' }}
                        />
                      )}
                    </Box>
                  </Box>
                )}

                <TextField
                  label="Tu nombre"
                  placeholder="¿Cómo te llamás?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  fullWidth
                  disabled={!room || room.status !== 'waiting'}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Score picker for pronostico mode */}
          {room && room.mode === 'pronostico' && room.status === 'waiting' && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>Tu pronóstico</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Elegí el marcador que creés que va a salir
                </Typography>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

                {/* Row headers: away goals */}
                <Box sx={{ display: 'grid', gridTemplateColumns: `auto repeat(${room.max_goals + 1}, 1fr)`, gap: 0.8, mb: 1 }}>
                  <Box />
                  {Array.from({ length: room.max_goals + 1 }, (_, j) => (
                    <Typography key={j} variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', fontWeight: 600 }}>
                      {room.team_away.slice(0, 3).toUpperCase()} {j}
                    </Typography>
                  ))}
                </Box>

                {Array.from({ length: room.max_goals + 1 }, (_, home) => (
                  <Box key={home} sx={{ display: 'grid', gridTemplateColumns: `auto repeat(${room.max_goals + 1}, 1fr)`, gap: 0.8, mb: 0.8 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      {room.team_home.slice(0, 3).toUpperCase()} {home}
                    </Typography>
                    {Array.from({ length: room.max_goals + 1 }, (_, away) => {
                      const isSelected = selectedScore?.home === home && selectedScore?.away === away
                      return (
                        <Button
                          key={away}
                          onClick={() => setSelectedScore({ home, away })}
                          variant={isSelected ? 'contained' : 'outlined'}
                          sx={{
                            minWidth: 0,
                            p: 0.8,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            borderColor: isSelected ? 'primary.main' : 'rgba(255,255,255,0.1)',
                            ...(isSelected && { boxShadow: '0 0 12px rgba(34,197,94,0.5)' }),
                          }}
                        >
                          {home}-{away}
                        </Button>
                      )
                    })}
                  </Box>
                ))}

                {selectedScore && (
                  <Box
                    sx={{
                      mt: 2, p: 1.5, borderRadius: 2,
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      Tu pronóstico: {room.team_home} {selectedScore.home} — {selectedScore.away} {room.team_away}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sorteo info */}
          {room && room.mode === 'sorteo' && room.status === 'waiting' && (
            <Card sx={{ p: 2.5, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                🎲 En modo Sorteo, el admin asigna los marcadores al azar cuando cierre el registro.
                Vas a ver cuál te tocó después del sorteo.
              </Typography>
            </Card>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            size="large"
            onClick={handleJoin}
            disabled={
              joining ||
              !room ||
              room.status !== 'waiting' ||
              !name.trim() ||
              (room.mode === 'pronostico' && !selectedScore)
            }
            sx={{ py: 1.8, fontSize: '1.05rem' }}
          >
            {joining
              ? <><CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />Uniéndome...</>
              : room?.mode === 'pronostico'
                ? `🎯 Confirmar pronóstico${selectedScore ? ` ${scoreLabel(selectedScore.home, selectedScore.away)}` : ''}`
                : '⚽ Unirme a la sala'}
          </Button>
        </Stack>
      </MotionBox>
    </Container>
  )
}
