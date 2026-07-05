export type RoomMode = 'sorteo' | 'pronostico'
export type RoomStatus = 'waiting' | 'active' | 'finished'
export type PrizeType = 'entry' | 'fixed'

export interface Room {
  id: string
  code: string
  name: string
  team_home: string
  team_away: string
  max_goals: number
  mode: RoomMode
  status: RoomStatus
  entry_price: number
  prize_type: PrizeType
  admin_id: string
  admin_name: string
  created_at: string
  real_score_home: number | null
  real_score_away: number | null
}

export interface RoomPlayer {
  id: string
  room_id: string
  user_id: string
  display_name: string
  avatar_url?: string
  is_guest: boolean
  joined_at: string
  score_home: number | null
  score_away: number | null
}

export interface AuthUser {
  id: string
  email: string
  display_name: string
  avatar_url?: string
}

export interface Score {
  home: number
  away: number
}
