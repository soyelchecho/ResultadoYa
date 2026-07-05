import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Container, Typography,
  TextField, Stack, Chip, Slider, ToggleButton, ToggleButtonGroup,
  Alert, CircularProgress, InputAdornment, Divider, Switch, FormControlLabel,
} from '@mui/material'
import { ArrowBack, Google } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { generateRoomCode } from '@/lib/roomCode'
import { generateScores, maxParticipants } from '@/lib/scores'
import type { RoomMode, PrizeType } from '@/types'
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
  const [prizeType, setPrizeType]   = useState<PrizeType>('entry')
  const [entryPrice, setEntryPrice] = useState<number>(10000)
  const [adminPlays, setAdminPlays] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState('')
  const [signingIn, setSigningIn]   = useState(false)

  // Email magic-link auth states
  const [authEmail, setAuthEmail]   = useState('')
  const [sendingLink, setSendingLink] = useState(false)
  const [linkSent, setLinkSent]     = useState(false)
  const [authError, setAuthError]   = useState('')

  const possibleScores = generateScores(maxGoals).length
  const maxPlayers     = mode === 'sorteo' ? maxParticipants(maxGoals) : 999
  const potExample     = prizeType === 'fixed'
    ? entryPrice
    : entryPrice * (mode === 'sorteo' ? possibleScores : 20)

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
      const { data: newRoom, error: err } = await supabase
        .from('rooms')
        .insert({
          code,
          name: trimName,
          team_home: trimHome,
          team_away: trimAway,
          max_goals: maxGoals,
          mode,
          prize_type: prizeType,
          admin_plays: adminPlays,
          status: 'waiting',
          entry_price: entryPrice,
          admin_id: user.id,
          admin_name: user.display_name,
        })
        .select('id')
        .single()
      if (err) throw err

      // If admin participates, add them as a player with a random score (sorteo)
      // or without score (pronostico — they pick later via join flow)
      if (adminPlays && newRoom) {
        let adminScoreHome: number | null = null
        let adminScoreAway: number | null = null

        if (mode === 'sorteo') {
          const scores = generateScores(maxGoals)
          const picked = scores[Math.floor(Math.random() * scores.length)]
          adminScoreHome = picked.home
          adminScoreAway = picked.away
        }

        await supabase.from('room_players').insert({
          room_id: newRoom.id,
          user_id: user.id,
          display_name: user.display_name,
          avatar_url: user.avatar_url ?? null,
          is_guest: false,
          score_home: adminScoreHome,
          score_away: adminScoreAway,
        })
      }

      navigate(`/sala/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message || 'No se pudo crear la sala.')
      setCreating(false)
    }
  }

  const handleSendMagicLink = async () => {
    setSendingLink(true)
    setAuthError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setSendingLink(false)
    if (err) setAuthError(err.message)
    else setLinkSent(true)
  }

  if (!user) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" px={2}>
        <Card sx={{ p: 4, maxWidth: 440, width: '100%' }}>
          <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 800 }}>Crear una sala</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Identificate para ser el admin y poder gestionar el partido.
          </Typography>

          {/* Google */}
          <Button
            variant="contained"
            startIcon={<Google />}
            onClick={async () => { setSigningIn(true); await signInWithGoogle() }}
            disabled={signingIn || sendingLink}
            fullWidth
            sx={{ mb: 2 }}
          >
            {signingIn ? 'Conectando...' : 'Entrar con Google'}
          </Button>

          <Divider sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
              o con tu correo (Gmail, Hotmail, etc.)
            </Typography>
          </Divider>

          {!linkSent ? (
            <Stack spacing={1.5}>
              <TextField
                label="Tu correo electrónico"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && authEmail.trim()) handleSendMagicLink() }}
                fullWidth
                disabled={sendingLink}
                autoComplete="email"
              />
              <Button
                variant="outlined"
                onClick={handleSendMagicLink}
                disabled={sendingLink || !authEmail.trim()}
                fullWidth
              >
                {sendingLink
                  ? <><CircularProgress size={18} sx={{ mr: 1 }} />Enviando...</>
                  : 'Enviar enlace de acceso'}
              </Button>
              {authError && <Alert severity="error">{authError}</Alert>}
            </Stack>
          ) : (
            <Box
              sx={{
                p: 2.5, textAlign: 'center',
                bgcolor: 'rgba(34,197,94,0.06)',
                borderRadius: 2,
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 0.5 }}>✉️ Enlace enviado</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Revisá tu correo <strong>{authEmail}</strong> y hacé click
                en el enlace para continuar.
              </Typography>
              <Button
                size="small"
                onClick={() => { setLinkSent(false); setAuthError('') }}
                sx={{ mt: 1.5, color: 'text.secondary' }}
              >
                Usar otro correo
              </Button>
            </Box>
          )}
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {mode === 'sorteo'
                  ? 'A cada participante se le asigna un marcador al azar. 1 solo ganador.'
                  : 'Cada participante elige su propio marcador. El pozo se reparte entre los que aciertan.'}
              </Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={adminPlays}
                    onChange={e => setAdminPlays(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      El admin también participa
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {adminPlays
                        ? mode === 'sorteo'
                          ? 'Se te asignará un marcador al azar al crear la sala.'
                          : 'Podrás ingresar tu pronóstico al unirte a la sala.'
                        : 'Solo gestionás el sorteo, no competís.'}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', m: 0 }}
              />
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

          {/* Prize config */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Premio</Typography>
              <ToggleButtonGroup
                value={prizeType}
                exclusive
                onChange={(_, v) => { if (v) setPrizeType(v) }}
                fullWidth
                sx={{ mb: 2.5 }}
              >
                <ToggleButton value="entry" sx={{ py: 1.2, fontWeight: 700, fontSize: '0.85rem' }}>
                  💰 Precio por entrada
                </ToggleButton>
                <ToggleButton value="fixed" sx={{ py: 1.2, fontWeight: 700, fontSize: '0.85rem' }}>
                  🏆 Premio fijo
                </ToggleButton>
              </ToggleButtonGroup>

              <TextField
                type="number"
                label={prizeType === 'entry' ? 'Valor por participante' : 'Premio total (lo pone el admin)'}
                value={entryPrice}
                onChange={e => setEntryPrice(Math.max(0, Number(e.target.value)))}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />

              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {prizeType === 'fixed'
                  ? `Premio fijo: $${fmt(entryPrice)} para quien acierte.`
                  : mode === 'sorteo'
                    ? `Con ${possibleScores} cupos llenos: pozo de $${fmt(entryPrice * possibleScores)}`
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
