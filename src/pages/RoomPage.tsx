import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, Container, Typography,
  Avatar, Stack, Chip, Divider,
  IconButton, Tooltip, Snackbar, Alert, CircularProgress,
  Button, LinearProgress,
} from '@mui/material'
import {
  ContentCopy, AdminPanelSettings, EmojiEvents,
  CheckCircle, HourglassEmpty, Groups, SportsScore,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useGuestStore } from '@/store/guestStore'
import { useRoomStore } from '@/store/roomStore'
import type { Room, RoomPlayer } from '@/types'
import { generateScores, scoresMatch } from '@/lib/scores'
import { glowText, goldGlow } from '@/theme'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

// ── Score grid card ──────────────────────────────────────────────────────────

interface ScoreCardProps {
  home: number
  away: number
  players: RoomPlayer[]
  isWinner: boolean
  isMyScore: boolean
  mode: string
  status: string
}

function ScoreCard({ home, away, players, isWinner, isMyScore, mode, status }: ScoreCardProps) {
  const showPlayers = status !== 'waiting' || mode === 'sorteo'

  const cardSx = {
    p: { xs: 0.8, sm: 1 },
    borderRadius: 2,
    textAlign: 'center',
    cursor: 'default',
    border: isWinner
      ? '2px solid #FFD700'
      : isMyScore
        ? '2px solid #22C55E'
        : '1px solid rgba(255,255,255,0.07)',
    background: isWinner
      ? 'rgba(255,215,0,0.12)'
      : isMyScore
        ? 'rgba(34,197,94,0.08)'
        : 'rgba(255,255,255,0.02)',
    ...(isWinner && { animation: 'pulse-gold 1.8s ease-in-out infinite' }),
    transition: 'all 0.3s ease',
    minHeight: { xs: 64, sm: 72 },
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.3,
  }

  return (
    <Box sx={cardSx}>
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontWeight: 900,
          fontSize: { xs: '0.9rem', sm: '1.05rem' },
          letterSpacing: 1,
          ...(isWinner ? goldGlow : isMyScore ? { color: '#22C55E' } : { color: 'text.primary' }),
        }}
      >
        {home}-{away}
      </Typography>

      {isWinner && (
        <Typography sx={{ fontSize: '0.8rem' }}>🏆</Typography>
      )}

      {showPlayers && players.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: isWinner ? '#FFD700' : isMyScore ? 'primary.main' : 'text.secondary',
            fontWeight: 600,
            fontSize: '0.6rem',
            lineHeight: 1.2,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            px: 0.5,
          }}
        >
          {players.length === 1 ? players[0].display_name : `${players.length} jugadores`}
        </Typography>
      )}

      {showPlayers && players.length === 0 && status === 'active' && mode === 'pronostico' && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>
          —
        </Typography>
      )}
    </Box>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { guestId } = useGuestStore()
  const { room, players, setRoom, setPlayers } = useRoomStore()
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const currentUserId = user?.id ?? guestId
  const isAdmin = room?.admin_id === user?.id
  const myPlayer = players.find(p => p.user_id === currentUserId)
  const hasMyScore = myPlayer && myPlayer.score_home !== null && myPlayer.score_away !== null

  const fetchRoom = useCallback(async () => {
    if (!code) return
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (!roomData) { navigate('/'); return }
    setRoom(roomData as Room)

    const { data: playersData } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('joined_at')

    setPlayers((playersData ?? []) as RoomPlayer[])
    setLoading(false)
  }, [code, navigate, setRoom, setPlayers])

  useEffect(() => {
    fetchRoom()

    const channel = supabase
      .channel(`room:${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, fetchRoom)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        setRoom(payload.new as Room)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, fetchRoom, setRoom])

  // Redirect non-joined users to join page (only if room is waiting)
  useEffect(() => {
    if (!loading && room && room.status === 'waiting' && !myPlayer && !isAdmin) {
      navigate(`/unirse?code=${code}`)
    }
  }, [loading, room, myPlayer, isAdmin, navigate, code])

  if (loading || !room) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  const allScores = generateScores(room.max_goals)
  const realScore = room.real_score_home !== null && room.real_score_away !== null
    ? { home: room.real_score_home, away: room.real_score_away }
    : null

  const winners = realScore
    ? players.filter(p => p.score_home === realScore.home && p.score_away === realScore.away)
    : []

  const potTotal = room.prize_type === 'fixed'
    ? room.entry_price
    : room.entry_price * players.length
  const prizePerWinner = winners.length > 0 ? Math.floor(potTotal / winners.length) : 0
  const fmt = (n: number) => n.toLocaleString('es-CO')
  const iAmWinner = winners.some(w => w.user_id === currentUserId)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              {room.mode === 'sorteo' ? '🎲 Modo Sorteo' : '🎯 Modo Pronóstico'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, ...glowText() }}>
              {room.name}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
              {room.team_home} vs {room.team_away}
            </Typography>
          </Box>
          {isAdmin && (
            <Tooltip title="Panel Admin">
              <IconButton
                onClick={() => navigate(`/sala/${code}/admin`)}
                sx={{ border: '1px solid rgba(249,115,22,0.3)', color: 'secondary.main', mt: 0.5 }}
              >
                <AdminPanelSettings />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Status + code */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))', border: '1px solid rgba(34,197,94,0.25)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                  Código de sala
                </Typography>
                <Typography
                  variant="h3"
                  sx={{ fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.4rem', ...glowText(), lineHeight: 1.1 }}
                >
                  {code}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Copiar código">
                  <IconButton
                    onClick={() => { navigator.clipboard.writeText(code ?? ''); setCopied(true) }}
                    size="small"
                    sx={{ border: '1px solid rgba(34,197,94,0.2)', color: 'primary.main' }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/unirse?code=${code}`)
                    setCopied(true)
                  }}
                  sx={{ borderColor: 'rgba(34,197,94,0.3)', color: 'primary.main', fontSize: '0.75rem' }}
                >
                  Compartir link
                </Button>
              </Stack>
            </Box>

            <Box display="flex" gap={1} mt={2} flexWrap="wrap">
              <Chip
                icon={
                  room.status === 'waiting' ? <HourglassEmpty sx={{ fontSize: '1rem !important' }} /> :
                  room.status === 'active'  ? <SportsScore   sx={{ fontSize: '1rem !important' }} /> :
                                              <CheckCircle   sx={{ fontSize: '1rem !important' }} />
                }
                label={
                  room.status === 'waiting'  ? (room.mode === 'sorteo' ? '⏳ Inscripción abierta' : '⏳ Esperando pronósticos') :
                  room.status === 'active'   ? '⚡ En juego' :
                                               '✅ Terminado'
                }
                color={room.status === 'finished' ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                icon={<Groups sx={{ fontSize: '1rem !important' }} />}
                label={`${players.length} participante${players.length !== 1 ? 's' : ''}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}
              />
              {potTotal > 0 && (
                <Chip
                  icon={<EmojiEvents sx={{ fontSize: '1rem !important', color: '#FFD700 !important' }} />}
                  label={room.prize_type === 'fixed' ? `Premio: $${fmt(potTotal)}` : `Pozo: $${fmt(potTotal)}`}
                  sx={{ bgcolor: 'rgba(255,215,0,0.1)', color: '#FFD700', fontWeight: 700 }}
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Winner reveal (finished state) */}
        {room.status === 'finished' && realScore && (
          <MotionCard
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            sx={{
              mb: 3,
              background: winners.length > 0
                ? 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.06))'
                : 'rgba(255,255,255,0.03)',
              border: winners.length > 0 ? '2px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
              p: 1,
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                Resultado final
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: { xs: '3rem', md: '4.5rem' },
                  my: 1,
                  ...(winners.length > 0 ? goldGlow : { color: 'text.primary' }),
                }}
              >
                {realScore.home} — {realScore.away}
              </Typography>
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
                {room.team_home} {realScore.home} — {realScore.away} {room.team_away}
              </Typography>

              {winners.length > 0 ? (
                <>
                  <Divider sx={{ borderColor: 'rgba(255,215,0,0.2)', mb: 2 }} />
                  <Typography variant="h5" sx={{ ...goldGlow, mb: 1 }}>
                    🏆 {winners.length === 1 ? 'Ganador' : `${winners.length} ganadores`}
                  </Typography>
                  <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={1}>
                    {winners.map(w => (
                      <Chip
                        key={w.id}
                        avatar={<Avatar src={w.avatar_url}>{w.display_name[0]}</Avatar>}
                        label={w.display_name}
                        sx={{
                          bgcolor: 'rgba(255,215,0,0.15)',
                          color: '#FFD700',
                          fontWeight: 700,
                          border: '1px solid rgba(255,215,0,0.3)',
                        }}
                      />
                    ))}
                  </Stack>
                  {potTotal > 0 && (
                    <Typography variant="body1" sx={{ ...goldGlow, mt: 2, fontWeight: 800 }}>
                      {winners.length > 1 ? `$${fmt(prizePerWinner)} cada uno` : `Premio: $${fmt(potTotal)}`}
                    </Typography>
                  )}
                  {iAmWinner && (
                    <MotionBox
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      sx={{
                        mt: 2, p: 2, borderRadius: 2,
                        background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                      }}
                    >
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800 }}>
                        🎉 ¡Vos ganaste!
                      </Typography>
                    </MotionBox>
                  )}
                </>
              ) : (
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  😔 Nadie acertó el resultado. El pozo queda pendiente.
                </Typography>
              )}
            </CardContent>
          </MotionCard>
        )}

        {/* My score card — shown as soon as the player has a score */}
        {hasMyScore && (
          <Card
            sx={{
              mb: 3,
              background: iAmWinner
                ? 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.06))'
                : 'rgba(34,197,94,0.06)',
              border: iAmWinner
                ? '2px solid rgba(255,215,0,0.4)'
                : '1px solid rgba(34,197,94,0.25)',
            }}
          >
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                {room.mode === 'sorteo' ? 'Tu marcador sorteado' : 'Tu pronóstico'}
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  my: 0.5,
                  ...(iAmWinner ? goldGlow : { color: '#22C55E' }),
                }}
              >
                {myPlayer.score_home} — {myPlayer.score_away}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {room.team_home} {myPlayer.score_home} — {myPlayer.score_away} {room.team_away}
              </Typography>
              {iAmWinner && <Typography sx={{ fontSize: '1.5rem', mt: 1 }}>🏆</Typography>}
            </CardContent>
          </Card>
        )}

        {/* Waiting state — sorteo, player not yet joined */}
        {room.status === 'waiting' && room.mode === 'sorteo' && !hasMyScore && !isAdmin && (
          <Card sx={{ mb: 3, p: 2.5, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' }}>
            <HourglassEmpty sx={{ color: 'text.secondary', fontSize: 32, mb: 1 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Aún no te uniste. Usá el código para ingresar y recibir tu marcador al azar.
            </Typography>
          </Card>
        )}

        {/* Waiting state — pronostico (show everyone joined) */}
        {room.status === 'waiting' && room.mode === 'pronostico' && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Pronósticos enviados</Typography>
              <LinearProgress
                variant="determinate"
                value={100}
                sx={{ mb: 2, background: 'rgba(249,115,22,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #F97316, #22C55E)' } }}
              />
              <AnimatePresence>
                <Stack spacing={1}>
                  {players.map((p, i) => (
                    <MotionBox
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                    >
                      <Avatar src={p.avatar_url} sx={{ width: 32, height: 32, fontSize: '0.85rem' }}>
                        {p.display_name[0]}
                      </Avatar>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                        {p.display_name}
                        {p.user_id === currentUserId && (
                          <Chip label="Vos" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: 'rgba(34,197,94,0.15)', color: 'primary.main' }} />
                        )}
                      </Typography>
                      <Chip
                        size="small"
                        label="🔒 Enviado"
                        sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.7rem' }}
                      />
                    </MotionBox>
                  ))}
                </Stack>
              </AnimatePresence>
              {isAdmin && (
                <Typography variant="body2" sx={{ color: 'secondary.main', mt: 2, fontWeight: 600, textAlign: 'center' }}>
                  Cerrá los pronósticos desde el Panel Admin cuando quieras →
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active state — pronostico waiting for result */}
        {room.status === 'active' && room.mode === 'pronostico' && (
          <Card sx={{ mb: 3, p: 2.5, textAlign: 'center', background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <SportsScore sx={{ color: 'secondary.main', fontSize: 40, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Pronósticos cerrados</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Esperando el resultado del partido...
            </Typography>
            {isAdmin && (
              <Typography variant="body2" sx={{ color: 'secondary.main', mt: 1, fontWeight: 600 }}>
                Ingresá el resultado real desde el Panel Admin
              </Typography>
            )}
          </Card>
        )}

        {/* Score grid (active + finished) */}
        {(room.status === 'active' || room.status === 'finished') && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  {room.mode === 'sorteo' ? 'Marcadores asignados' : 'Pronósticos'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {room.team_home} - {room.team_away}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${room.max_goals + 1}, 1fr)`,
                  gap: { xs: 0.6, sm: 0.8 },
                }}
              >
                {allScores.map(score => {
                  const scorePlayers = players.filter(
                    p => p.score_home === score.home && p.score_away === score.away
                  )
                  const isWinner = realScore ? scoresMatch(score, realScore) : false
                  const isMyScore = myPlayer?.score_home === score.home && myPlayer?.score_away === score.away
                  return (
                    <ScoreCard
                      key={`${score.home}-${score.away}`}
                      home={score.home}
                      away={score.away}
                      players={scorePlayers}
                      isWinner={isWinner}
                      isMyScore={!!isMyScore}
                      mode={room.mode}
                      status={room.status}
                    />
                  )
                })}
              </Box>

              {room.mode === 'pronostico' && room.status === 'active' && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5, textAlign: 'center' }}>
                  Los pronósticos se revelan cuando el admin ingrese el resultado
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Players list (waiting sorteo) */}
        {room.status === 'waiting' && room.mode === 'sorteo' && (
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Groups sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Participantes ({players.length})</Typography>
              </Box>
              <AnimatePresence>
                <Stack spacing={1}>
                  {players.map((p, i) => (
                    <MotionBox
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                    >
                      <Avatar src={p.avatar_url} sx={{ width: 36, height: 36, fontSize: '0.9rem' }}>
                        {p.display_name[0]}
                      </Avatar>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                        {p.display_name}
                        {p.user_id === currentUserId && (
                          <Chip label="Vos" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: 'rgba(34,197,94,0.15)', color: 'primary.main' }} />
                        )}
                      </Typography>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                    </MotionBox>
                  ))}
                  {players.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                      Nadie se unió todavía. Compartí el código!
                    </Typography>
                  )}
                </Stack>
              </AnimatePresence>
            </CardContent>
          </Card>
        )}

      </MotionBox>

      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)}>
        <Alert severity="success" sx={{ fontWeight: 600 }}>¡Copiado! 📋</Alert>
      </Snackbar>
    </Container>
  )
}
