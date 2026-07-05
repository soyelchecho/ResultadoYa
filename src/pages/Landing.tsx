import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Container, Typography, Stack, Chip,
  Grid, Card, CardContent, Divider, TextField, Alert,
} from '@mui/material'
import { Shuffle, EmojiEvents, Google, Groups, SportsScore, Email } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { glowText, goldGlow } from '@/theme'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

const features = [
  {
    icon: <Shuffle sx={{ fontSize: 32 }} />,
    title: 'Sorteo al azar',
    desc: 'Cada participante recibe un marcador aleatorio. Justo desde el primer silbatazo.',
    color: '#22C55E',
  },
  {
    icon: <SportsScore sx={{ fontSize: 32 }} />,
    title: 'Modo Pronóstico',
    desc: 'Elegí tu propio resultado. Si varios aciertan, se reparten el pozo.',
    color: '#F97316',
  },
  {
    icon: <Groups sx={{ fontSize: 32 }} />,
    title: 'Sin registro',
    desc: 'Los participantes entran solo con su nombre. Sin apps, sin email.',
    color: '#60A5FA',
  },
  {
    icon: <EmojiEvents sx={{ fontSize: 32 }} />,
    title: 'Revelación en vivo',
    desc: 'Cuando el admin ingresa el resultado, los ganadores se revelan con animación.',
    color: '#FFD700',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user, signInWithGoogle, signOut } = useAuthStore()
  const [signingIn, setSigningIn]   = useState(false)
  const [email, setEmail]           = useState('')
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailError, setEmailError] = useState('')

  const handleEmailLookup = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setEmailError('')
    setEmailChecking(true)
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select('room_id, rooms(code)')
        .eq('email', trimmed)
        .limit(1)
        .single()
      if (error || !data) {
        setEmailError('No encontramos ninguna sala con ese correo. Pedile al admin que te agregue.')
        return
      }
      const roomCode = (data.rooms as unknown as { code: string })?.code
      if (roomCode) navigate(`/sala/${roomCode}`)
    } catch {
      setEmailError('No encontramos ninguna sala con ese correo.')
    } finally {
      setEmailChecking(false)
    }
  }

  const handleCreateRoom = async () => {
    if (user) {
      navigate('/crear')
    } else {
      setSigningIn(true)
      await signInWithGoogle()
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', overflow: 'hidden' }}>

      {/* HERO */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          pt: { xs: 8, md: 0 },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,0.1) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 80% 80%, rgba(249,115,22,0.07) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
          },
        }}
      >
        {['⚽', '⚽', '⚽', '⚽'].map((e, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              fontSize: { xs: '2rem', md: '3rem' },
              opacity: 0.07,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
              top: `${[12, 20, 68, 55][i]}%`,
              left: `${[4, 90, 2, 92][i]}%`,
              display: { xs: 'none', md: 'block' },
            }}
          >
            {e}
          </Box>
        ))}

        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <MotionBox
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              >
                <Chip
                  label="⚽ Sorteo de resultados de partido"
                  sx={{
                    mb: 3,
                    bgcolor: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                />

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '3.5rem', sm: '5rem', md: '6.5rem' },
                    lineHeight: 0.9,
                    mb: 2,
                    color: 'white',
                    ...glowText('#22C55E'),
                  }}
                >
                  RESULTADO
                  <Box component="span" sx={{ ...goldGlow, display: 'block' }}>
                    YA ⚽
                  </Box>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{ color: 'text.secondary', mb: 4, maxWidth: 480, lineHeight: 1.6 }}
                >
                  Sortea los marcadores de un partido entre tus amigos.
                  <strong style={{ color: '#22C55E' }}> Quien acierte gana el pozo.</strong>
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={user ? undefined : <Google />}
                    onClick={handleCreateRoom}
                    disabled={signingIn}
                    sx={{ fontSize: '1.05rem', py: 1.5 }}
                  >
                    {signingIn ? 'Conectando...' : user ? '+ Crear Sala' : 'Crear Sala con Google'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/unirse')}
                    sx={{ borderColor: 'rgba(34,197,94,0.4)', color: 'primary.main', fontSize: '1.05rem', py: 1.5 }}
                  >
                    Unirme con Código
                  </Button>
                </Stack>

                {user && (
                  <Stack direction="row" alignItems="center" spacing={1.5} mt={2}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Logueado como <strong style={{ color: '#22C55E' }}>{user.display_name}</strong>
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => signOut()}
                      sx={{ color: 'text.secondary', fontSize: '0.75rem', minWidth: 0, p: '2px 8px' }}
                    >
                      Cerrar sesión
                    </Button>
                  </Stack>
                )}

                {/* Email lookup for invited players */}
                <Box sx={{ mt: 4, maxWidth: 460 }}>
                  <Divider sx={{ mb: 2.5, borderColor: 'rgba(255,255,255,0.07)', '&::before, &::after': { borderColor: 'rgba(255,255,255,0.07)' } }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                      ¿El admin te invitó por correo?
                    </Typography>
                  </Divider>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="email"
                      size="small"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEmailLookup() }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<Email />}
                      onClick={handleEmailLookup}
                      disabled={emailChecking || !email.trim()}
                      sx={{ whiteSpace: 'nowrap', borderColor: 'rgba(34,197,94,0.35)', color: 'primary.main' }}
                    >
                      {emailChecking ? 'Buscando...' : 'Ver mi resultado'}
                    </Button>
                  </Stack>
                  {emailError && <Alert severity="error" sx={{ mt: 1.5 }}>{emailError}</Alert>}
                </Box>
              </MotionBox>
            </Grid>

            {/* Example card */}
            <Grid item xs={12} md={5}>
              <MotionBox
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              >
                <Card
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(34,197,94,0.04))',
                    border: '1px solid rgba(255,215,0,0.2)',
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                    Ejemplo de sala
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, mb: 0.5 }}>
                    🇦🇷 Argentina vs Brasil 🇧🇷
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Modo: Sorteo · Hasta 4-4 · 25 posibles marcadores
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,215,0,0.15)', mb: 2 }} />

                  {/* Mini score grid preview */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 0.5,
                      mb: 2,
                    }}
                  >
                    {Array.from({ length: 25 }, (_, i) => {
                      const home = Math.floor(i / 5)
                      const away = i % 5
                      const isWinner = home === 2 && away === 1
                      return (
                        <Box
                          key={i}
                          sx={{
                            p: 0.5,
                            borderRadius: 1,
                            textAlign: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            border: isWinner ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.06)',
                            background: isWinner ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
                            color: isWinner ? '#FFD700' : 'text.secondary',
                          }}
                        >
                          {home}-{away}
                        </Box>
                      )
                    })}
                  </Box>

                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: 'rgba(255,215,0,0.1)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#FFD700', fontWeight: 700 }}>
                      🏆 Resultado real: 2-1 · Carlos ganó $200.000
                    </Typography>
                  </Box>
                </Card>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FEATURES */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          sx={{ textAlign: 'center', mb: 6 }}
        >
          <Typography variant="h2" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, ...glowText() }}>
            CÓMO FUNCIONA
          </Typography>
        </MotionBox>

        <Grid container spacing={3}>
          {features.map((f, i) => (
            <Grid key={f.title} item xs={12} sm={6} md={3}>
              <MotionCard
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ color: f.color, mb: 2 }}>{f.icon}</Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>{f.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {f.desc}
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* MODOS */}
      <Box sx={{ py: 8, background: 'rgba(34,197,94,0.03)', borderTop: '1px solid rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ textAlign: 'center', fontSize: { xs: '2rem', md: '3rem' }, mb: 5 }}>
            DOS MODOS DE JUEGO
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, border: '1px solid rgba(34,197,94,0.2)', height: '100%' }}>
                <Typography variant="h5" sx={{ color: 'primary.main', mb: 1 }}>🎲 Modo Sorteo</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                  El admin crea la sala y cada participante que se une recibe un marcador al azar.
                  Todos los marcadores son únicos. El que tenga el resultado real del partido gana el pozo completo.
                </Typography>
                <Chip label="1 solo ganador" size="small" sx={{ mt: 2, bgcolor: 'rgba(34,197,94,0.1)', color: 'primary.main' }} />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, border: '1px solid rgba(249,115,22,0.2)', height: '100%' }}>
                <Typography variant="h5" sx={{ color: 'secondary.main', mb: 1 }}>🎯 Modo Pronóstico</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                  Cada participante elige el marcador que cree que va a salir.
                  Varios pueden elegir el mismo. Si varios aciertan, el pozo se reparte en partes iguales.
                </Typography>
                <Chip label="Puede haber múltiples ganadores" size="small" sx={{ mt: 2, bgcolor: 'rgba(249,115,22,0.1)', color: 'secondary.main' }} />
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: 12, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, mb: 2, ...goldGlow }}
          >
            ¿LISTO PARA EL PARTIDO?
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
            Crea tu sala en 2 minutos. Sin instalaciones, sin registro para los participantes.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={user ? undefined : <Google />}
            onClick={handleCreateRoom}
            disabled={signingIn}
            sx={{ fontSize: '1.1rem', py: 1.5, px: 4 }}
          >
            {signingIn ? 'Conectando...' : user ? '+ Crear Sala' : 'Crear Sala — Es Gratis'}
          </Button>
        </Container>
      </Box>

      <Box sx={{ py: 3, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          ResultadoYa · Hecho con ⚽ y algo de adrenalina · 2026
        </Typography>
      </Box>
    </Box>
  )
}
