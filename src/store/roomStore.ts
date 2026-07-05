import { create } from 'zustand'
import type { Room, RoomPlayer } from '@/types'

interface RoomState {
  room: Room | null
  players: RoomPlayer[]
  setRoom: (room: Room | null) => void
  setPlayers: (players: RoomPlayer[]) => void
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  players: [],
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
}))
