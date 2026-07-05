import { createTheme, alpha } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette { gold: Palette['primary'] }
  interface PaletteOptions { gold?: PaletteOptions['primary'] }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#22C55E',    // goal green
      light: '#4ADE80',
      dark: '#16A34A',
    },
    secondary: {
      main: '#F97316',    // orange fire
      light: '#FB923C',
      dark: '#EA580C',
    },
    gold: {
      main: '#FFD700',
      light: '#FFE44D',
      dark: '#CC9900',
    },
    background: {
      default: '#060C14',
      paper: '#0D1520',
    },
    success: { main: '#22C55E' },
    error:   { main: '#EF4444' },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
  },

  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h1: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em' },
    h2: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em' },
    h3: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.03em' },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },

  shape: { borderRadius: 16 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #060C14 0%, #0B1622 50%, #060C14 100%)',
          minHeight: '100vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#22C55E33 transparent',
        },
        '*::-webkit-scrollbar': { width: '6px' },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': { background: '#22C55E44', borderRadius: '3px' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 700,
          textTransform: 'none',
          fontSize: '0.95rem',
          padding: '10px 24px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
          boxShadow: '0 0 20px rgba(34,197,94,0.3)',
          '&:hover': { boxShadow: '0 0 30px rgba(34,197,94,0.5)' },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #F97316, #EA580C)',
          boxShadow: '0 0 20px rgba(249,115,22,0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(13,21,32,0.95), rgba(6,12,20,0.98))',
          border: '1px solid rgba(34,197,94,0.12)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': { borderColor: 'rgba(34,197,94,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(34,197,94,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#22C55E' },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 8, height: 8, backgroundColor: 'rgba(34,197,94,0.1)' },
        bar: { borderRadius: 8, background: 'linear-gradient(90deg, #22C55E, #F97316)' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(135deg, #0D1520, #060C14)',
          border: '1px solid rgba(34,197,94,0.15)',
          backdropFilter: 'blur(40px)',
        },
      },
    },
  },
})

export const glassMixin = {
  background: 'rgba(13,21,32,0.6)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(34,197,94,0.1)',
}

export const glowText = (color = '#22C55E') => ({
  textShadow: `0 0 20px ${alpha(color, 0.6)}, 0 0 40px ${alpha(color, 0.3)}`,
})

export const goldGlow = {
  textShadow: '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3)',
  color: '#FFD700',
}
