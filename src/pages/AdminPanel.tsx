import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Container, Typography,
  Stack, Chip, Alert, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Avatar, TextField,
} from '@mui/material'
import {
  ArrowBack, PlayArrow, Lock, SportsScore, PersonRemove, EmojiEvents, PersonAddAlt1, MailOutline,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useRoomStore } from '@/store/roomStore'
import type { Room, RoomPlayer } from '@/types'
import { generateScores, assignScores } from '@/lib/scores'
import { glowText, goldGlow } from '@/theme'

const MotionBox = motion(Box)

export default function AdminPanel() {
  const { code } = useParams<{ code: string }>()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const { room, players, setRoom, setPlayers } = useRoomStore()

  const [loading, setLoading]     = useState(!room)
  const [drawing, setDrawing]     = useState(false)
  const [closing, setClosing]     = useState(false)
  const [error, setError]         = useState('')
  const [resultOpen, setResultOpen] = useState(false)
  const [addOpen, setAddOpen]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newEmail, setNewEmail]   = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [addError, setAddError]   = useState('')
  const [scoreHome, setScoreHome] = useState(0)
  const [scoreAway, setScoreAway] = useState(0)
  const [savingResult, setSavingResult] = useState(false)

  const isAdmin = room?.admin_id === user?.id

  const fetchRoom = useCallback(async () => {
    if (!code) return
    const { data: roomData } = await supabase
      .from('rooms').select('*').eq('code', code.toUpperCase()).single()
    if (!roomData) { navigate('/'); return }
    setRoom(roomData as Room)

    const { data: playersData } = await supabase
      .from('room_players').select('*').eq('room_id', roomData.id).order('joined_at')
    setPlayers((playersData ?? []) as RoomPlayer[])
    setLoading(false)
  }, [code, navigate, setRoom, setPlayers])

  useEffect(() => {
    if (!user) { navigate('/'); return }
    fetchRoom()

    const channel = supabase
      .channel(`admin:${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, fetchRoom)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        setRoom(payload.new as Room)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, user, fetchRoom, navigate, setRoom])

  useEffect(() => {
    if (!loading && room && !isAdmin) navigate('/')
  }, [loading, room, isAdmin, navigate])

  // ── Sorteo draw ────────────────────────────────────────────────────────────

  const handleDraw = async () => {
    if (!room || players.length === 0) return
    setDrawing(true)
    setError('')
    try {
      const assignments = assignScores(players.map(p => p.user_id), room.max_goals)

      const updates = players.map(p => {
        const score = assignments.get(p.user_id)
        return supabase
          .from('room_players')
          .update({ score_home: score?.home ?? null, score_away: score?.away ?? null })
          .eq('id', p.id)
      })
      await Promise.all(updates)

      await supabase.from('rooms').update({ status: 'active' }).eq('id', room.id)
      navigate(`/sala/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message)
      setDrawing(false)
    }
  }

  // ── Close pronostico ───────────────────────────────────────────────────────

  const handleClosePronostico = async () => {
    if (!room) return
    setClosing(true)
    setError('')
    try {
      await supabase.from('rooms').update({ status: 'active' }).eq('id', room.id)
      navigate(`/sala/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message)
      setClosing(false)
    }
  }

  // ── Enter real result ──────────────────────────────────────────────────────

  const handleSaveResult = async () => {
    if (!room) return
    setSavingResult(true)
    setError('')
    try {
      await supabase.from('rooms').update({
        real_score_home: scoreHome,
        real_score_away: scoreAway,
        status: 'finished',
      }).eq('id', room.id)
      setResultOpen(false)
      navigate(`/sala/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message)
      setSavingResult(false)
    }
  }

  // ── Add guest by email ────────────────────────────────────────────────────

  const handleAddGuest = async () => {
    if (!room) return
    const name  = newName.trim()
    const email = newEmail.trim().toLowerCase()
    if (!name || !email) return
    if (!/^\S+@\S+\.\S+$/.test(email)) { setAddError('Ingresá un correo válido.'); return }
    setAddingGuest(true)
    setAddError('')
    try {
      const { error: err } = await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: crypto.randomUUID(),
        display_name: name,
        email,
        is_guest: true,
      })
      if (err) throw err
      setNewName('')
      setNewEmail('')
      setAddOpen(false)
    } catch (e: unknown) {
      const msg = (e as { code?: string; message?: string }).code === '23505'
        ? 'Ese correo ya está en esta sala.'
        : (e as Error).message || 'No se pudo agregar el jugador.'
      setAddError(msg)
    } finally {
      setAddingGuest(false)
    }
  }

  // ── Kick player ────────────────────────────────────────────────────────────

  const handleKick = async (playerId: string) => {
    await supabase.from('room_players').delete().eq('id', playerId)
  }

  if (loading || !room) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  const fmt = (n: number) => n.toLocaleString('es-CO')
  const potTotal = room.entry_price * players.length
  const allScores = generateScores(room.max_goals)

  // Winners (if result entered)
  const realScore = room.real_score_home !== null && room.real_score_away !== null
    ? { home: room.real_score_home, away: room.real_score_away }
    : null
  const winners = realScore
    ? players.filter(p => p.score_home === realScore.home && p.score_away === realScore.away)
    : []

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/sala/${code}`)}
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Ver sala
        </Button>

        <Typography variant="h2" sx={{ fontSize: '2.5rem', mb: 0.5, color: 'secondary.main' }}>
          PANEL ADMIN
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          {room.name} · {room.team_home} vs {room.team_away}
        </Typography>

        <Stack spacing={3}>

          {/* Room summary */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Chip
                  label={room.mode === 'sorteo' ? '🎲 Sorteo' : '🎯 Pronóstico'}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(34,197,94,0.1)', color: 'primary.main' }}
                />
                <Chip
                  label={
                    room.status === 'waiting' ? '⏳ Esperando' :
                    room.status === 'active'  ? '⚡ En juego' :
                                                '✅ Terminado'
                  }
                  color={room.status === 'finished' ? 'success' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={`${players.length} participante${players.length !== 1 ? 's' : ''}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.06)' }}
                />
                {potTotal > 0 && (
                  <Chip
                    label={`Pozo: $${fmt(potTotal)}`}
                    sx={{ bgcolor: 'rgba(255,215,0,0.1)', color: '#FFD700', fontWeight: 700 }}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Action card */}
          {room.status === 'waiting' && (
            <Card sx={{ border: `1px solid ${room.mode === 'sorteo' ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}` }}>
              <CardContent sx={{ p: 3 }}>
                {room.mode === 'sorteo' ? (
                  <>
                    <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                      🎲 Iniciar Sorteo
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                      Se asignan {players.length} marcadores al azar entre los {players.length} participantes registrados.
                      Los restantes {Math.max(0, allScores.length - players.length)} marcadores quedan sin asignar.
                    </Typography>
                    {players.length === 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        No hay participantes todavía. Compartí el código de sala.
                      </Alert>
                    )}
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={drawing ? undefined : <PlayArrow />}
                      onClick={handleDraw}
                      disabled={players.length === 0 || drawing}
                      sx={{ py: 1.5, background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
                    >
                      {drawing
                        ? <><CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />Sorteando...</>
                        : `🎲 Sortear con ${players.length} jugador${players.length !== 1 ? 'es' : ''}`}
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="h6" sx={{ mb: 1, color: 'secondary.main' }}>
                      🔒 Cerrar Pronósticos
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                      {players.length} pronóstico{players.length !== 1 ? 's' : ''} recibido{players.length !== 1 ? 's' : ''}.
                      Al cerrar, ya nadie puede ingresar ni cambiar su pronóstico.
                    </Typography>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      fullWidth
                      startIcon={closing ? undefined : <Lock />}
                      onClick={handleClosePronostico}
                      disabled={players.length === 0 || closing}
                      sx={{ py: 1.5 }}
                    >
                      {closing
                        ? <><CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />Cerrando...</>
                        : 'Cerrar Pronósticos'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enter result (active state) */}
          {room.status === 'active' && (
            <Card sx={{ border: '1px solid rgba(255,215,0,0.3)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, ...goldGlow }}>
                  ⚽ Ingresar Resultado Real
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                  El partido terminó. Ingresá el marcador final para revelar los ganadores.
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<SportsScore />}
                  onClick={() => setResultOpen(true)}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #FFD700, #F97316)',
                    color: '#000',
                    fontWeight: 800,
                    boxShadow: '0 0 20px rgba(255,215,0,0.3)',
                    '&:hover': { boxShadow: '0 0 30px rgba(255,215,0,0.5)' },
                  }}
                >
                  Ingresar Resultado
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Result summary (finished) */}
          {room.status === 'finished' && realScore && (
            <Card
              sx={{
                p: 1,
                background: winners.length > 0
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.04))'
                  : 'rgba(255,255,255,0.02)',
                border: winners.length > 0 ? '2px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <EmojiEvents sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>Resultado final</Typography>
                <Typography variant="h2" sx={{ fontFamily: 'monospace', fontWeight: 900, ...goldGlow, my: 1 }}>
                  {realScore.home} — {realScore.away}
                </Typography>
                {winners.length > 0 ? (
                  <>
                    <Typography variant="h6" sx={{ ...goldGlow, mb: 1 }}>
                      🏆 {winners.map(w => w.display_name).join(', ')}
                    </Typography>
                    {potTotal > 0 && (
                      <Typography variant="body1" sx={{ color: '#FFD700', fontWeight: 700 }}>
                        Premio: ${fmt(potTotal)}{winners.length > 1 ? ` (${fmt(Math.floor(potTotal / winners.length))} c/u)` : ''}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Nadie acertó el resultado
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Players list */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Participantes ({players.length})</Typography>
                {room.status === 'waiting' && (
                  <Button
                    size="small"
                    startIcon={<PersonAddAlt1 />}
                    onClick={() => { setAddOpen(true); setAddError('') }}
                    sx={{ color: 'primary.main', fontSize: '0.75rem' }}
                  >
                    Agregar por correo
                  </Button>
                )}
              </Box>
              <Stack spacing={1}>
                {players.map(p => (
                  <Box key={p.id} display="flex" alignItems="center" gap={1.5}>
                    <Avatar src={p.avatar_url} sx={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                      {p.display_name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {p.display_name}
                        {(p as RoomPlayer & { email?: string }).email && (
                          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                            · {(p as RoomPlayer & { email?: string }).email}
                          </Typography>
                        )}
                      </Typography>
                      {p.score_home !== null && p.score_away !== null && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          {p.score_home}-{p.score_away}
                        </Typography>
                      )}
                    </Box>
                    {room.status === 'waiting' && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => handleKick(p.id)}
                          sx={{ color: 'error.main', opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          <PersonRemove sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
                {players.length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                    Nadie se unió todavía
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

        </Stack>
      </MotionBox>

      {/* Enter result dialog */}
      <Dialog open={resultOpen} onClose={() => setResultOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle display="flex" alignItems="center" gap={1}>
          <SportsScore sx={{ color: '#FFD700' }} />
          Resultado del partido
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {room.team_home} vs {room.team_away}
          </Typography>

          {/* Score picker grid */}
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Seleccioná el marcador final:
          </Typography>

          {/* Column headers */}
          <Box sx={{ display: 'grid', gridTemplateColumns: `auto repeat(${room.max_goals + 1}, 1fr)`, gap: 0.6, mb: 0.8 }}>
            <Box />
            {Array.from({ length: room.max_goals + 1 }, (_, j) => (
              <Typography key={j} variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', fontWeight: 700 }}>
                {room.team_away.slice(0, 3).toUpperCase()} {j}
              </Typography>
            ))}
          </Box>

          {Array.from({ length: room.max_goals + 1 }, (_, h) => (
            <Box key={h} sx={{ display: 'grid', gridTemplateColumns: `auto repeat(${room.max_goals + 1}, 1fr)`, gap: 0.6, mb: 0.6 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                {room.team_home.slice(0, 3).toUpperCase()} {h}
              </Typography>
              {Array.from({ length: room.max_goals + 1 }, (_, a) => {
                const isSel = scoreHome === h && scoreAway === a
                return (
                  <Button
                    key={a}
                    onClick={() => { setScoreHome(h); setScoreAway(a) }}
                    variant={isSel ? 'contained' : 'outlined'}
                    sx={{
                      minWidth: 0,
                      p: 0.7,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      borderColor: isSel ? 'gold' : 'rgba(255,255,255,0.1)',
                      ...(isSel && {
                        background: 'linear-gradient(135deg, #FFD700, #F97316)',
                        color: '#000',
                        boxShadow: '0 0 12px rgba(255,215,0,0.5)',
                      }),
                    }}
                  >
                    {h}-{a}
                  </Button>
                )
              })}
            </Box>
          ))}

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
          <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', textAlign: 'center' }}>
            <Typography variant="body1" sx={{ fontWeight: 800, ...glowText('#FFD700') }}>
              {room.team_home} {scoreHome} — {scoreAway} {room.team_away}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setResultOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveResult}
            disabled={savingResult}
            sx={{ background: 'linear-gradient(135deg, #FFD700, #F97316)', color: '#000', fontWeight: 800 }}
          >
            {savingResult ? 'Guardando...' : '✅ Confirmar Resultado'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add guest by email dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setNewName(''); setNewEmail('') }} fullWidth maxWidth="xs">
        <DialogTitle display="flex" alignItems="center" gap={1}>
          <MailOutline sx={{ color: 'primary.main' }} />
          Agregar participante por correo
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
            El jugador ingresa su correo en la pantalla principal para ver el resultado que le tocó.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Nombre"
              placeholder="Ej: Carlos"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Correo electrónico"
              type="email"
              placeholder="carlos@email.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              fullWidth
              onKeyDown={e => { if (e.key === 'Enter') handleAddGuest() }}
            />
          </Stack>
          {addError && <Alert severity="error" sx={{ mt: 2 }}>{addError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => { setAddOpen(false); setNewName(''); setNewEmail('') }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddGuest}
            disabled={addingGuest || !newName.trim() || !newEmail.trim()}
            startIcon={addingGuest ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <PersonAddAlt1 />}
          >
            {addingGuest ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
