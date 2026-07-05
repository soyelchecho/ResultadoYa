import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Container, Typography,
  TextField, Stack, Chip, Slider, ToggleButton, ToggleButtonGroup,
  Alert, CircularProgress, InputAdornment, Divider,
} from '@mui/material'
import { ArrowBack, Google } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { generateRoomCode } from '@/lib/roomCode'
import { generateScores, maxParticipants } from '@/lib/scores'
import type { RoomMode } from '@/types'
import { glowText } from '@/theme'

const MotionBox = motion(Box)

export default function CreateRoom() {
  const navigate = useNavigate()
  const { user, signInWithGoogle } = useAuthStore()

  const [name, setName]             = useState('')
  const [teamHome, setTeamHome]     = useState('')
  const [teamAway, setTeamAway]     = useState('')
  const [maxGoals, setMaxGoals]     = useState(4)
  const [mode, setMode]             = useState<RoomMode>('sorteo')
  const [entryPrice, setEntryPrice] = useState<number>(10000)
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState('')
  const [signingIn, setSigningIn]   = useState(false)

  const possibleScores = generateScores(maxGoals).length
  const maxPlayers     = mode === 'sorteo' ? maxParticipants(maxGoals) : 999
  const potExample     = entryPrice * (mode === 'sorteo' ? possibleScores : 20)

  const fmt = (n: number) => n.toLocaleString('es-CO')

  const handleCreate = async () => {
    if (!user) return
    const trimName = name.trim()
    const trimHome = teamHome.trim()
    const trimAway = teamAway.trim()
    if (!trimName || !trimHome || !trimAway) {
      setError('Completa todos los campos.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const code = generateRoomCode()
      const { error: err } = await supabase.from('rooms').insert({
        code,
        name: trimName,
        team_home: trimHome,
        team_away: trimAway,
        max_goals: maxGoals,
        mode,
        status: 'waiting',
        entry_price: entryPrice,
        admin_id: user.id,
        admin_name: user.display_name,
      })
      if (err) throw err
      navigate(`/sala/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message || 'No se pudo crear la sala.')
      setCreating(false)
    }
  }

  if (!user) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Card sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Necesitás Google para crear una sala</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            El admin de la sala necesita cuenta Google para gestionar el sorteo y los resultados.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Google />}
            onClick={async () => { setSigningIn(true); await signInWithGoogle() }}
            disabled={signingIn}
            fullWidth
          >
            {signingIn ? 'Conectando...' : 'Entrar con Google'}
          </Button>
        </Card>
      </Box>
    )
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
          NUEVA SALA
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Configurá el partido y el tipo de sorteo
        </Typography>

        <Stack spacing={3}>

          {/* Match info */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Partido</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Nombre de la sala"
                  placeholder="ej: Final Copa América"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  fullWidth
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Equipo local"
                    placeholder="ej: Argentina"
                    value={teamHome}
                    onChange={e => setTeamHome(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Equipo visitante"
                    placeholder="ej: Brasil"
                    value={teamAway}
                    onChange={e => setTeamAway(e.target.value)}
                    fullWidth
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Mode */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Modo de juego</Typography>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, v) => { if (v) setMode(v) }}
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="sorteo" sx={{ py: 1.5, fontWeight: 700 }}>
                  🎲 Sorteo
                </ToggleButton>
                <ToggleButton value="pronostico" sx={{ py: 1.5, fontWeight: 700 }}>
                  🎯 Pronóstico
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {mode === 'sorteo'
                  ? 'A cada participante se le asigna un marcador al azar. 1 solo ganador.'
                  : 'Cada participante elige su propio marcador. El pozo se reparte entre los que aciertan.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Max goals */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Máximo de goles por equipo</Typography>
                <Chip
                  label={`hasta ${maxGoals}-${maxGoals}`}
                  sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: 'primary.main', fontWeight: 700 }}
                />
              </Box>
              <Slider
                value={maxGoals}
                onChange={(_, v) => setMaxGoals(v as number)}
                min={1}
                max={5}
                step={1}
                marks={[1,2,3,4,5].map(v => ({ value: v, label: `${v}` }))}
                sx={{ color: 'primary.main', mt: 1 }}
              />
              <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`${possibleScores} marcadores posibles`}
                  sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: 'primary.main' }}
                />
                {mode === 'sorteo' && (
                  <Chip
                    size="small"
                    label={`máx. ${maxPlayers} participantes`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary' }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Entry price */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Precio de entrada</Typography>
              <TextField
                type="number"
                label="Valor por participante"
                value={entryPrice}
                onChange={e => setEntryPrice(Math.max(0, Number(e.target.value)))}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {mode === 'sorteo'
                  ? `Si se llenan todos los ${possibleScores} cupos: pozo de $${fmt(entryPrice * possibleScores)}`
                  : `Con 20 participantes: pozo de $${fmt(potExample)}`
                }
              </Typography>
            </CardContent>
          </Card>

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            size="large"
            onClick={handleCreate}
            disabled={creating || !name.trim() || !teamHome.trim() || !teamAway.trim()}
            sx={{ py: 1.8, fontSize: '1.05rem' }}
          >
            {creating
              ? <><CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />Creando...</>
              : '🎲 Crear Sala'}
          </Button>

        </Stack>
      </MotionBox>
    </Container>
  )
}
