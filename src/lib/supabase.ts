import { createClient } from '@supabase/supabase-js'

// Strip BOM (U+FEFF) that Windows editors/tools sometimes prepend to env values
const stripBOM = (s: string) => (s?.charCodeAt(0) === 0xFEFF ? s.slice(1) : s)

const supabaseUrl    = stripBOM(import.meta.env.VITE_SUPABASE_URL as string)
const supabaseAnonKey = stripBOM(import.meta.env.VITE_SUPABASE_ANON_KEY as string)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Copy .env.example to .env.local and fill in your keys.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
